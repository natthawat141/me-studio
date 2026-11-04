import {randomUUID} from 'node:crypto';import {basename,join} from 'node:path';
/** Native-owned selections: renderer never supplies paths. Edits expire and are single-use. */
export class ProjectEdits{
 /** @param {import('./project-folders.mjs').ProjectFolders} store @param {(id:string,source:string,replacement:string)=>Promise<void>} beforeRelink */
 constructor(store,beforeRelink=async()=>{}){this.store=store;this.beforeRelink=beforeRelink;this.edits=new Map();}
 get(token){const e=this.edits.get(token);if(!e||Date.now()-e.created>15*60*1000){this.edits.delete(token);throw Error('INVALID_EDIT');}return e;}
 view(e){return {token:e.token,id:e.id,name:e.name,nameOrigin:e.nameOrigin,sourcePath:e.source||'',outputPath:e.output|| (e.source?join(e.source,'output'):''),folderName:e.source?basename(e.source):'',revision:e.revision};}
 async begin(id){if(this.edits.size>=10)this.edits.delete(this.edits.keys().next().value);const p=id?(await this.store.list()).find(p=>p.id===id):undefined;if(id&&!p)throw Error('INVALID_PROJECT');const e={token:randomUUID(),created:Date.now(),id:p?.id,name:p?.name||'',nameOrigin:p?.nameOrigin||'folder',source:p?.sourcePath,originalSource:p?.sourcePath,output:p&&p.outputPath!==join(p.sourcePath,'output')?p.outputPath:undefined,revision:p?.revision};this.edits.set(e.token,e);return this.view(e);}
 async select(token,kind,path){const e=this.get(token);if(!['source','output'].includes(kind))throw Error('INVALID_EDIT');const selected=await this.store.directory(path);this.get(token);e[kind]=selected;if(kind==='source'&&e.nameOrigin==='folder')e.name=basename(selected).slice(0,80);return this.view(e);}
 cancel(token){this.edits.delete(token);}
 async save(input){const e=this.get(input?.token);if(typeof input.name!=='string'||input.name.length>80||!['folder','custom'].includes(input.nameOrigin||'custom')||!e.source)throw Error('INVALID_PROJECT');if(e.id&&e.source!==e.originalSource)await this.beforeRelink(e.id,e.originalSource,e.source);this.get(input.token);const result=e.id?await this.store.update(e.id,{name:input.name,nameOrigin:input.nameOrigin||'custom',source:e.source,output:e.output,defaultOutput:!e.output,expectedRevision:e.revision}):await this.store.create(input.name,e.source,input.nameOrigin||'custom',e.output);this.cancel(input.token);return result;}
}
