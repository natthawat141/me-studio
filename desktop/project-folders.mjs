import { randomUUID } from 'node:crypto';
import { readFile, writeFile, rename, mkdir, realpath, stat } from 'node:fs/promises';
import { dirname, basename, join } from 'node:path';

// Registry is owned by the main process. Paths never come from the renderer.
export class ProjectFolders {
  constructor(path) { this.path = path; this.queue = Promise.resolve(); }
  async read() {
    let raw;
    try { raw = await readFile(this.path, 'utf8'); } catch (e) { if (e.code === 'ENOENT') return []; throw e; }
    const value = JSON.parse(raw);
    if (!Array.isArray(value) || value.some(p => !p || typeof p.id !== 'string' || typeof p.name !== 'string' || typeof p.path !== 'string')) throw new Error('INVALID_REGISTRY');
    return value;
  }
  async mutate(fn) {
    const operation = this.queue.catch(() => {}).then(async () => {
      const projects = await this.read(); const result = await fn(projects);
      await mkdir(dirname(this.path), { recursive: true, mode: 0o700 });
      const tmp = `${this.path}.${randomUUID()}.tmp`;
      await writeFile(tmp, JSON.stringify(projects), { flag: 'wx', mode: 0o600 });
      await rename(tmp, this.path); return result;
    });
    this.queue = operation; return operation;
  }
  view(p) { return {id:p.id,name:p.name,folderName:basename(p.path),sourcePath:p.path,outputPath:p.outputPath || join(p.path,'output')}; }
  async list() { return (await this.read()).map(p => this.view(p)); }
  async setOutput(id, path) {
    const actual=await realpath(path); if(!(await stat(actual)).isDirectory())throw new Error('INVALID_FOLDER');
    return this.mutate(projects=>{const p=projects.find(x=>x.id===id);if(!p)throw new Error('INVALID_PROJECT');p.outputPath=actual;return this.view(p);});
  }
  async create(name, path) {
    const actual = await realpath(path); if (!(await stat(actual)).isDirectory()) throw new Error('INVALID_FOLDER');
    return this.mutate(projects => { if (projects.some(p => p.path === actual)) throw new Error('DUPLICATE_FOLDER'); const p = { id: randomUUID(), name: name.trim(), path: actual }; projects.push(p); return this.view(p); });
  }
  async relink(id, path) {
    const actual = await realpath(path); if (!(await stat(actual)).isDirectory()) throw new Error('INVALID_FOLDER');
    return this.mutate(projects => { const p = projects.find(x => x.id === id); if (!p) throw new Error('INVALID_PROJECT'); if (projects.some(x => x.id !== id && x.path === actual)) throw new Error('DUPLICATE_FOLDER'); p.path = actual; return this.view(p); });
  }
  async pathFor(id) { const p = (await this.read()).find(x => x.id === id); if (!p) throw new Error('INVALID_PROJECT'); return p.path; }
}
