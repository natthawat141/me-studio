import { spawn, execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { runtimeEnvironment } from '../../desktop/policy.mjs';

const resources = resolve(process.argv[2] ?? '.studio/desktop-build/runtime');
const data = resolve('.studio/desktop-smoke', randomUUID());
await mkdir(data, { recursive: true });
const worker = spawn(join(resources, 'bin/node'), [join(resources, 'desktop/worker.mjs'), resources, data], { env: { ...runtimeEnvironment(), PATH: '/usr/bin:/bin' }, stdio: ['ignore', 'ignore', 'pipe', 'ipc'] });
let diagnostics = '';
worker.stderr.on('data', chunk => { diagnostics = (diagnostics + chunk.toString()).slice(-3000); });
const pending = new Map();
let completed;
const completion = new Promise((resolve, reject) => { completed = { resolve, reject }; });
worker.on('message', message => {
  if (message.event?.type === 'render') {
    if (message.event.status === 'succeeded' && message.event.artifact) completed.resolve(message.event.artifact);
    if (message.event.status === 'failed') completed.reject(new Error('PACKAGED_RENDER_FAILED'));
  }
  const entry = pending.get(message.requestId);
  if (entry) { pending.delete(message.requestId); if (message.error) entry.reject(new Error(message.error)); else entry.resolve(message.result); }
});
worker.on('exit', code => { for (const entry of pending.values()) entry.reject(new Error(`Worker exited ${code}: ${diagnostics}`)); });
const request = (method, input) => new Promise((resolve, reject) => { const requestId = randomUUID(); pending.set(requestId, { resolve, reject }); worker.send({ requestId, method, input }); });
const timer = setTimeout(() => { completed.reject(new Error('PACKAGED_RENDER_TIMEOUT')); worker.kill('SIGKILL'); }, 180_000);
try {
  const agent = await request('videoStatus', {});
  if (agent.runtime !== 'python' || agent.configured) throw new Error('PYTHON_AGENT_STATUS_MISMATCH');
  if (execFileSync(join(resources, 'python-agent/me-studio-agent'), ['--check'], {encoding:'utf8',env:runtimeEnvironment()}).trim() !== 'me-studio-agent python sdk-ready protocol=1') throw new Error('FROZEN_PYTHON_SDK_FAILED');
  const project = await request('create', { title: 'Desktop runtime smoke' });
  const updated = await request('update', { projectId: project.id, revision: 0, changes: { greeting: 'สวัสดีจาก me studio', reply: 'สร้างในแอปได้แล้ว' } });
  const preview = await request('preview', { projectId: project.id, revision: updated.revision });
  const html = await (await fetch(preview.url)).text();
  if (!html.includes('สวัสดีจาก me studio')) throw new Error('PREVIEW_REVISION_MISMATCH');
  await request('render', { projectId: project.id, revision: updated.revision });
  const artifact = await completion;
  const probe = JSON.parse(execFileSync(join(resources, 'bin/ffprobe'), ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', artifact.outputPath], { encoding: 'utf8', env: runtimeEnvironment() }));
  const video = probe.streams.find(stream => stream.codec_type === 'video');
  if (video.width !== 1080 || video.height !== 1920 || Number(probe.format.duration) !== 8) throw new Error('INVALID_DESKTOP_OUTPUT');
  await writeFile(join(data, 'verification.json'), JSON.stringify({ resources, artifact, dimensions: [video.width, video.height], duration: probe.format.duration, hostPathToolsDisabled: true }, null, 2));
  console.log(`Desktop runtime/render smoke passed: ${artifact.outputPath}`);
} finally { clearTimeout(timer); if (worker.connected) worker.disconnect(); worker.kill('SIGTERM'); }
