import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,symlink,rm} from 'node:fs/promises';
import {join} from 'node:path';import {tmpdir} from 'node:os';
import {createProductionWorkspace} from '../src/server/video/project-workspace.mjs';
const pixel='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aD1sAAAAASUVORK5CYII=';
test('project tools preserve previous text and reject hidden, instruction, symlink and outside paths',async()=>{
 const root=await mkdtemp(join(tmpdir(),'studio-workspace-'));try{
  const source=join(root,'source'),storage=join(root,'state');await mkdir(source);await mkdir(storage);
  await writeFile(join(source,'story.md'),'original');await writeFile(join(source,'config.env'),'secret');await writeFile(join(source,'AGENTS.md'),'instructions');
  const w=await createProductionWorkspace({source,storage});
  assert.equal(await w.readText('story.md'),'original');await w.writeText('story.md','revised');assert.equal(await w.readText('story.md'),'revised');
  assert.equal((await w.list('')).entries.some(e=>e.name==='config.env'),false);
  assert.equal((await w.history())[0].text,'original');
  for(const path of ['../outside.md','/tmp/outside.md','.env','config.env','AGENTS.md','node_modules/a.md']){
   await assert.rejects(w.readText(path));
   await assert.rejects(w.writeText(path,'unauthorized repair'));
  }
  for(const path of ['package.json','desktop/main.mjs','python/runtime.py','nested/config.env'])await assert.rejects(w.writeText(path,'unauthorized repair'));
  assert.equal(await readFile(join(source,'config.env'),'utf8'),'secret');
  await symlink(join(root,'state'),join(source,'escaped'));await assert.rejects(w.writeText('escaped/file.md','bad'));
  assert.equal(await readFile(join(source,'AGENTS.md'),'utf8'),'instructions');
 }finally{await rm(root,{recursive:true,force:true});}
});
test('uploaded references get stable assets and cannot redirect through a replaced stored file',async()=>{
 const root=await mkdtemp(join(tmpdir(),'studio-assets-'));try{
  const w=await createProductionWorkspace({source:root,storage:join(root,'state')});
  await w.addReferences([{name:'reference.png',dataUrl:'data:image/png;base64,'+pixel}]);
  const assets=w.assets();assert.equal(assets.length,1);assert.match(assets[0].src,/^assets\/asset-[a-f0-9]{64}\.png$/);
  const again=await createProductionWorkspace({source:root,storage:join(root,'state')});assert.deepEqual(again.assets(),assets);
  assert.equal(Object.keys(await again.imageInputs())[0],assets[0].src);
  await rm(join(root,'state',assets[0].id));await symlink(join(root,'state','assets.json'),join(root,'state',assets[0].id));
  await assert.rejects(again.imageInputs());
 }finally{await rm(root,{recursive:true,force:true});}
});
test('writing HTML with registered assets materializes portable scoped dependencies without overwriting existing assets',async()=>{
 const root=await mkdtemp(join(tmpdir(),'studio-portable-'));try{
  const w=await createProductionWorkspace({source:root,storage:join(root,'.state')});
  await w.addReferences([{name:'reference.png',dataUrl:'data:image/png;base64,'+pixel}]);const asset=w.assets()[0];
  await w.writeText('previews/preview.html',`<img src="${asset.src}">`);
  assert.equal((await readFile(join(root,'previews',asset.src))).toString('base64'),pixel);
  await rm(join(root,'previews',asset.src));await symlink(join(root,'.state',asset.id),join(root,'previews',asset.src));
  await assert.rejects(w.writeText('previews/preview.html',`<img src="${asset.src}">`),/PROJECT_PATH_DENIED/);
 }finally{await rm(root,{recursive:true,force:true});}
});
