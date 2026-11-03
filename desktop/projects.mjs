import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile, rename, readdir, cp, realpath } from 'node:fs/promises';
import { join, resolve, relative, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

const idSchema = z.string().uuid();
const sceneSchema = z.object({
  title: z.string().trim().min(1).max(48), greeting: z.string().trim().min(1).max(80),
  reply: z.string().trim().min(1).max(80), background: z.string().regex(/^#[0-9a-fA-F]{6}$/), sampleAudio: z.boolean(),
}).strict();
const projectSchema = z.object({ id: idSchema, title: z.string().trim().min(1).max(120), revision: z.number().int().nonnegative(), scene: sceneSchema, updatedAt: z.number() }).strict();
const patchSchema = sceneSchema.partial().refine(value => Object.keys(value).length > 0);
const json = value => JSON.stringify(value).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');

/** Application-owned directories only. One trusted worker serializes project mutations. */
export class DesktopProjects {
  #locks = new Map();
  constructor(root, template = fileURLToPath(new URL('../examples/local-render/', import.meta.url))) {
    this.root = resolve(root); this.template = template;
  }
  directory(id) { if (!idSchema.safeParse(id).success) throw new Error('INVALID_PROJECT'); return join(this.root, id); }
  async checkedDirectory(id) {
    const directory = await realpath(this.directory(id));
    const root = await realpath(this.root);
    const child = relative(root, directory);
    if (child.startsWith('..') || isAbsolute(child)) throw new Error('INVALID_PROJECT');
    return directory;
  }
  async list() {
    await mkdir(this.root, { recursive: true, mode: 0o700 });
    const projects = [];
    for (const entry of await readdir(this.root, { withFileTypes: true })) {
      if (!entry.isDirectory() || !idSchema.safeParse(entry.name).success) continue;
      projects.push(await this.get(entry.name));
    }
    return projects.sort((a, b) => b.updatedAt - a.updatedAt);
  }
  async create(title) {
    const project = projectSchema.parse({ id: randomUUID(), title, revision: 0, updatedAt: Date.now(), scene: { title: 'GOOD DAY', greeting: 'หวัดดีบิว', reply: 'ใช่แล้ว', background: '#87ceeb', sampleAudio: false } });
    await mkdir(this.directory(project.id), { recursive: true, mode: 0o700 });
    await writeFile(join(this.directory(project.id), 'workspace.json'), JSON.stringify(project), { flag: 'wx', mode: 0o600 });
    return project;
  }
  async get(id) {
    const directory = await this.checkedDirectory(id);
    const project = projectSchema.parse(JSON.parse(await readFile(join(directory, 'workspace.json'), 'utf8')));
    if (project.id !== id) throw new Error('INVALID_PROJECT');
    return project;
  }
  async update(id, revision, changes) {
    this.directory(id);
    const previous = this.#locks.get(id) ?? Promise.resolve();
    const operation = previous.catch(() => {}).then(async () => {
      const current = await this.get(id);
      if (revision !== current.revision) throw new Error('REVISION_CONFLICT');
      const next = projectSchema.parse({ ...current, scene: { ...current.scene, ...patchSchema.parse(changes) }, revision: current.revision + 1, updatedAt: Date.now() });
      const directory = await this.checkedDirectory(id);
      const pending = join(directory, `workspace-${randomUUID()}.tmp`);
      await writeFile(pending, JSON.stringify(next), { mode: 0o600 });
      await rename(pending, join(directory, 'workspace.json'));
      return next;
    });
    this.#locks.set(id, operation);
    try { return await operation; } finally { if (this.#locks.get(id) === operation) this.#locks.delete(id); }
  }
  async snapshot(id, revision) {
    const project = await this.get(id);
    if (project.revision !== revision) throw new Error('REVISION_CONFLICT');
    const directory = join(await this.checkedDirectory(id), 'snapshots', randomUUID());
    await mkdir(directory, { recursive: true, mode: 0o700 });
    const original = await readFile(join(this.template, 'scene.html'), 'utf8');
    const html = original.replace('(function () {', `(function () {\nvar scene = ${json(project.scene)};`)
      .replaceAll("'GOOD DAY'", 'scene.title').replaceAll("'หวัดดีบิว'", 'scene.greeting').replaceAll("'ใช้แล้ว'", 'scene.reply')
      .replaceAll('#87ceeb', project.scene.background).replaceAll('subsEl.innerHTML', 'subsEl.textContent').replace('aicatoon • bew x mac', 'me studio');
    await writeFile(join(directory, 'scene.html'), html, { mode: 0o600 });
    const manifest = JSON.parse(await readFile(join(this.template, 'project.json'), 'utf8'));
    manifest.title = project.title;
    if (project.scene.sampleAudio) {
      for (const file of ['hello.mp3', 'reply.mp3']) await cp(join(this.template, file), join(directory, file));
    } else manifest.audio = [];
    const path = join(directory, 'project.json');
    await writeFile(path, JSON.stringify(manifest), { mode: 0o600 });
    return { path, directory, project };
  }
}
