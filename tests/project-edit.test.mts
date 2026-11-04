import {test} from 'node:test';import assert from 'node:assert/strict';import {mkdtemp,mkdir,rm,readFile} from 'node:fs/promises';import {join} from 'node:path';import {tmpdir} from 'node:os';import {ProjectFolders} from '../desktop/project-folders.mjs';
test('atomic Project updates preserve identity and custom output, reject stale and busy edits',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'studio-edit-'));try{for(const n of ['a','b','exports'])await mkdir(join(dir,n));let busy=false;const store=new ProjectFolders(join(dir,'projects.json'),()=>busy);
 const p=await store.create('',join(dir,'a'));assert.equal(p.name,'a');assert.equal(p.nameOrigin,'folder');
 const next=await store.update(p.id,{source:join(dir,'b'),expectedRevision:p.revision});assert.equal(next.name,'b');assert.equal(next.id,p.id);assert.equal(next.outputPath,join(next.sourcePath,'output'));
 const custom=await store.update(p.id,{name:'My show',nameOrigin:'custom',output:join(dir,'exports'),expectedRevision:next.revision});
 const moved=await store.update(p.id,{source:join(dir,'a'),expectedRevision:custom.revision});assert.equal(moved.name,'My show');assert.equal(moved.outputPath,custom.outputPath);
 const before=await readFile(store.path,'utf8');await assert.rejects(store.update(p.id,{name:'stale',expectedRevision:0}),/PROJECT_CONFLICT/);busy=true;await assert.rejects(store.update(p.id,{source:join(dir,'b'),expectedRevision:moved.revision}),/PROJECT_BUSY/);assert.equal(await readFile(store.path,'utf8'),before);
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('run binding waits for an in-flight registry commit and then blocks later edits',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'studio-binding-'));try{for(const n of ['a','b'])await mkdir(join(dir,n));let busy=false;const store=new ProjectFolders(join(dir,'projects.json'),()=>busy);const p=await store.create('Test',join(dir,'a'));
 let release!:()=>void,entered!:()=>void;const blocked=new Promise<void>(r=>{release=r;}),ready=new Promise<void>(r=>{entered=r;});const mutate=store.mutate.bind(store);store.mutate=fn=>mutate(async (projects:{id:string;name:string;path:string}[])=>{const result=await fn(projects);entered();await blocked;return result;});
 const save=store.update(p.id,{source:join(dir,'b')});await ready;let acquired=false;const acquire=store.acquireBinding(p.id,()=>{busy=true;acquired=true;});await new Promise(r=>setTimeout(r,20));assert.equal(acquired,false);release();await save;const binding=await acquire;assert.equal(binding!.sourcePath,join(await import('node:fs/promises').then(fs=>fs.realpath(dir)),'b'));await assert.rejects(store.update(p.id,{name:'Blocked'}),/PROJECT_BUSY/);
 }finally{await rm(dir,{recursive:true,force:true});}
});
