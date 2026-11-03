import { createNativeProduction } from '../src/server/video/native-production.mjs';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { mkdir, readFile, readdir } from 'node:fs/promises';
import { z } from 'zod';
import { Type } from 'typebox';
import { DesktopProjects } from './projects.mjs';
import { renderProject } from '../scripts/local/render.mjs';
import { loadProject, startAssetServer } from '../scripts/local/project.mjs';
import { StudioMemoryStore } from '../src/server/memory/store';
import { createStudioHarness } from '../src/server/agent/runtime.mjs';
import { createMetaProvider, META_MODELS } from '../src/server/agent/meta-provider.mjs';
import type { AgentTool } from '@earendil-works/pi-agent-core';

const [resources, data] = process.argv.slice(2);
const projects = new DesktopProjects(join(data, 'projects'), join(resources, 'examples/local-render'));
const store = new StudioMemoryStore(join(data, 'memory.sqlite'));
const id = z.string().uuid();
const projectInput = z.object({ projectId: id }).strict();
const revisionInput = projectInput.extend({ revision: z.number().int().nonnegative() });
const tools = { browser: join(resources, 'browser/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'), ffmpeg: join(resources, 'bin/ffmpeg'), ffprobe: join(resources, 'bin/ffprobe') };
const previews = new Map<string, { close(): Promise<void> }>();
let provider: ReturnType<typeof createMetaProvider> | undefined;
let activeRender: { id: string; abort: AbortController; projectId: string } | undefined;
let activeChat: AbortController | undefined;
const sessions = new Map<string, string>();
const event = (value: unknown) => process.send?.({ event: value });
const result = (value: unknown) => ({ content: [{ type: 'text' as const, text: JSON.stringify(value) }], details: {} });

const production=createNativeProduction(resources,data,store,tools,event);

async function artifacts(projectId: string) {
  const root = join(await projects.checkedDirectory(projectId), 'renders');
  await mkdir(root, { recursive: true });
  const entries = [];
  for (const directory of await readdir(root, { withFileTypes: true })) {
    if (!directory.isDirectory() || !id.safeParse(directory.name).success) continue;
    const job = JSON.parse(await readFile(join(root, directory.name, 'job.json'), 'utf8'));
    if (job.status === 'succeeded') entries.push({ id: directory.name, outputPath: join(root, directory.name, 'video.mp4'), createdAt: job.createdAt });
    else if (job.status === 'running' || job.status === 'queued') { /* Interrupted work is not replayed or returned as an artifact. */ }
  }
  return entries.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

async function startRender(projectId: string, revision: number) {
  if (activeRender) throw new Error('RENDER_BUSY');
  const task = { id: randomUUID(), abort: new AbortController(), projectId };
  activeRender = task;
  void (async () => {
    const snapshot = await projects.snapshot(projectId, revision);
    const rendered = await renderProject(snapshot.path, { outputRoot: join(await projects.checkedDirectory(projectId), 'renders'), toolPaths: tools, signal: task.abort.signal,
      onProgress: (progress: Record<string, unknown>) => event({ type: 'render', projectId, taskId: task.id, status: progress.status, stage: progress.stage, completed: progress.framesCompleted, total: progress.totalFrames }),
    });
    event({ type: 'render', projectId, taskId: task.id, status: 'succeeded', completed: rendered.totalFrames, total: rendered.totalFrames, artifact: { id: rendered.id, outputPath: rendered.outputPath } });
  })().catch(() => event({ type: 'render', projectId, taskId: task.id, status: task.abort.signal.aborted ? 'cancelled' : 'failed', message: 'เรนเดอร์ไม่สำเร็จ โปรดลองอีกครั้ง' }))
    .finally(() => { if (activeRender === task) activeRender = undefined; });
  return { taskId: task.id };
}

async function dispatch(method: string, raw: unknown): Promise<unknown> {
  if(method==='videoConfigure')return production.configure(raw);
  if(method==='videoStatus')return production.status();
  if(method==='videoProduce')return production.produce(raw);
  if(method==='videoCancel')return production.cancel();
  if(method==='videoArtifact')return production.artifact(raw);
  if (method === 'list') return projects.list();
  if (method === 'create') return projects.create(z.object({ title: z.string().trim().min(1).max(120) }).strict().parse(raw).title);
  if (method === 'update') {
    const value = revisionInput.extend({ changes: z.object({ title: z.string().max(48).optional(), greeting: z.string().max(80).optional(), reply: z.string().max(80).optional(), background: z.string().optional(), sampleAudio: z.boolean().optional() }).strict() }).strict().parse(raw);
    return projects.update(value.projectId, value.revision, value.changes);
  }
  if (method === 'preview') {
    const value = revisionInput.parse(raw);
    const snapshot = await projects.snapshot(value.projectId, value.revision);
    const loaded = await loadProject(snapshot.path);
    const server = await startAssetServer(snapshot.directory, loaded.manifest);
    await previews.get(value.projectId)?.close();
    previews.set(value.projectId, server);
    return { url: `${server.origin}/scene.html?preview=1` };
  }
  if (method === 'render') { const value = revisionInput.parse(raw); return startRender(value.projectId, value.revision); }
  if (method === 'cancel') { if (activeRender) activeRender.abort.abort(); return {}; }
  if (method === 'artifacts') return artifacts(projectInput.parse(raw).projectId);
  if (method === 'configureMeta') {
    const value = z.object({ apiKey: z.string().trim().min(1).max(4096), modelId: z.enum(META_MODELS) }).strict().parse(raw);
    provider = createMetaProvider(value); return { configured: true, verified: false, modelId: value.modelId };
  }
  if (method === 'cancelChat') { activeChat?.abort(); return {}; }
  if (method === 'newSession') { const value = projectInput.parse(raw); sessions.set(value.projectId, randomUUID()); return {}; }
  if (method === 'chat') {
    const value = projectInput.extend({ text: z.string().trim().min(1).max(8000), requestId: id }).strict().parse(raw);
    if (!provider) throw new Error('META_KEY_REQUIRED');
    if (activeChat) throw new Error('CHAT_BUSY');
    await projects.get(value.projectId);
    const abort = new AbortController(); activeChat = abort;
    const mediaTools: AgentTool[] = [
      { name: 'read_scene', label: 'อ่านฉาก', description: 'Read the current cartoon scene and its revision. Read before update_scene.', parameters: Type.Object({}, { additionalProperties: false }), execute: async () => result(await projects.get(value.projectId)) },
      { name: 'update_scene', label: 'แก้ฉาก', description: 'Update this cartoon scene. Dialogue/title are text only. Background is a six-digit hex color. Return updated scene revision.', parameters: Type.Object({ expectedRevision: Type.Integer({ minimum: 0 }), greeting: Type.Optional(Type.String({ maxLength: 80 })), reply: Type.Optional(Type.String({ maxLength: 80 })), title: Type.Optional(Type.String({ maxLength: 48 })), background: Type.Optional(Type.String({ pattern: '^#[0-9a-fA-F]{6}$' })) }, { additionalProperties: false }), execute: async (_callId, args) => {
        const { expectedRevision, ...changes } = z.object({ expectedRevision: z.number().int(), greeting: z.string().optional(), reply: z.string().optional(), title: z.string().optional(), background: z.string().optional() }).strict().parse(args);
        const updated = await projects.update(value.projectId, expectedRevision, changes); event({ type: 'project', project: updated }); return result(updated);
      } },
    ];
    try {
      const sessionId = sessions.get(value.projectId) ?? randomUUID(); sessions.set(value.projectId, sessionId);
      const harness = createStudioHarness({ ...provider, store, session: { ownerId: 'desktop-local-owner', projectId: value.projectId, sessionId }, tools: mediaTools });
      const completed = await harness.run({ text: value.text, requestId: value.requestId, signal: abort.signal, approvedTools: ['read_scene', 'update_scene', 'remember_project_memory', 'forget_project_memory'], onEvent: entry => { event({ ...entry, kind: 'agent', projectId: value.projectId }); } });
      if (completed.status !== 'completed') throw new Error('META_RUN_FAILED');
      return { text: completed.result ?? '', usage: completed.usage };
    } finally { activeChat = undefined; }
  }
  if (method === 'busy') return { busy: Boolean(activeChat || activeRender || production.status().busy) };
  throw new Error('UNKNOWN_METHOD');
}

process.on('message', async (message: { requestId: string; method: string; input: unknown }) => {
  try { process.send?.({ requestId: message.requestId, result: await dispatch(message.method, message.input) }); }
  catch (error) {
    const safe = ['REVISION_CONFLICT', 'RENDER_BUSY', 'CHAT_BUSY', 'META_KEY_REQUIRED', 'META_RUN_FAILED', 'MODEL_NOT_ALLOWED','VIDEO_KEYS_REQUIRED','VIDEO_BUSY','VIDEO_RUN_FAILED','ARTIFACT_NOT_FOUND'];
    process.send?.({ requestId: message.requestId, error: error instanceof Error && safe.includes(error.message) ? error.message : 'DESKTOP_OPERATION_FAILED' });
  }
});
process.on('disconnect', () => process.exit(0));
