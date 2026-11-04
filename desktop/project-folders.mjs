import { randomUUID } from 'node:crypto';
import { readFile, writeFile, rename, mkdir, realpath, stat } from 'node:fs/promises';
import { dirname, basename, join } from 'node:path';

// Registry is owned by the main process. Paths never come from the renderer.
export class ProjectFolders {
  constructor(path,busy=()=>false) { this.path = path; this.busy=busy; this.queue = Promise.resolve(); }
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
  view(p) { return {id:p.id,name:p.name,folderName:basename(p.path),sourcePath:p.path,outputPath:p.outputPath || join(p.path,'output'),nameOrigin:p.nameOrigin||'custom',revision:p.revision||0}; }
  async list() { return (await this.read()).map(p => this.view(p)); }
  async acquireBinding(id,onAcquire){const operation=this.queue.catch(()=>{}).then(async()=>{const project=id?(await this.read()).find(p=>p.id===id):undefined;if(id&&!project)throw Error('INVALID_PROJECT');onAcquire();return project?this.view(project):undefined;});this.queue=operation;return operation;}
  async directory(path){const actual=await realpath(path);if(!(await stat(actual)).isDirectory())throw Error('INVALID_FOLDER');return actual;}
  async create(name,path,nameOrigin,output){
    const actual=await this.directory(path),out=output?await this.directory(output):undefined;if(typeof name!=='string'||name.trim().length>80)throw Error('INVALID_PROJECT');
    return this.mutate(projects=>{if(projects.some(p=>p.path===actual))throw Error('DUPLICATE_FOLDER');const p={id:randomUUID(),name:name.trim()||basename(actual).slice(0,80),nameOrigin:nameOrigin||(!name.trim()?'folder':'custom'),path:actual,revision:0,...(out?{outputPath:out}:{})};projects.push(p);return this.view(p);});
  }
  async update(id,changes){
    const source=changes.source?await this.directory(changes.source):undefined,output=changes.output?await this.directory(changes.output):undefined;
    return this.mutate(projects=>{const p=projects.find(p=>p.id===id);if(!p)throw Error('INVALID_PROJECT');if(this.busy(id))throw Error('PROJECT_BUSY');if(changes.expectedRevision!==undefined&&changes.expectedRevision!==(p.revision||0))throw Error('PROJECT_CONFLICT');if(source&&projects.some(x=>x.id!==id&&x.path===source))throw Error('DUPLICATE_FOLDER');
      if(changes.name!==undefined&&(typeof changes.name!=='string'||changes.name.trim().length>80))throw Error('INVALID_PROJECT');
      const next={...p,path:source||p.path,nameOrigin:changes.nameOrigin||p.nameOrigin||'custom',revision:(p.revision||0)+1};
      if(changes.name!==undefined)next.name=changes.name.trim();
      if(!next.name||next.nameOrigin==='folder')next.name=basename(next.path).slice(0,80);
      if(changes.defaultOutput)delete next.outputPath;else if(output)next.outputPath=output;
      Object.assign(p,next);if(changes.defaultOutput)delete p.outputPath;return this.view(p);
    });
  }
  async setOutput(id,path){return this.update(id,{output:path});}
  async relink(id,path){return this.update(id,{source:path});}
  async pathFor(id) { const p = (await this.read()).find(x => x.id === id); if (!p) throw new Error('INVALID_PROJECT'); return p.path; }
}
