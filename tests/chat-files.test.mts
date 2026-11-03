import { test } from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,symlink,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import { ChatFiles } from '../desktop/chat-files.mjs';
const projectId='11111111-1111-4111-8111-111111111111';
test('chat files persist scoped references, renew streaming grants, bound text and reject traversal',async()=>{
 const root=await mkdtemp(join(tmpdir(),'studio-chat-files-'));
 try{
  const data=join(root,'data'),output=join(root,'output');await mkdir(output);await writeFile(join(output,'clip.mp4'),'0123456789');await writeFile(join(output,'scene.html'),'<script>window.bad=true</script>');
  const service=new ChatFiles(data),ref=await service.register(join(output,'clip.mp4'),output,projectId);
  assert.equal(ref.kind,'video');assert.ok(!JSON.stringify(ref).includes(root));
  assert.deepEqual(await service.register(join(output,'clip.mp4'),output,projectId),ref);
  await assert.rejects(service.preview({id:ref.id}),/INVALID_FILE/);
  await assert.rejects(service.preview({id:ref.id,projectId:'22222222-2222-4222-8222-222222222222'}),/INVALID_FILE/);
  const preview=await new ChatFiles(data).preview({id:ref.id,projectId});assert.match(preview.src!,/^studio-file:/);
  const renewed=new ChatFiles(data),live=await renewed.preview({id:ref.id,projectId});
  const response=await renewed.serve(new Request(live.src!,{headers:{Range:'bytes=3-6'}}));assert.equal(response.status,206);assert.equal(await response.text(),'3456');
  const source=await renewed.register(join(output,'scene.html'),output,projectId);assert.equal((await renewed.preview({id:source.id,projectId})).text,'<script>window.bad=true</script>');
  await assert.rejects(renewed.store({name:'../../secret.md',data:new ArrayBuffer(1)}),/INVALID_FILE/);
  await assert.rejects(renewed.store({name:'.env',data:new ArrayBuffer(1)}),/INVALID_FILE/);
  await assert.rejects(renewed.store({name:'large.mp4',data:new ArrayBuffer(25*1024*1024+1)}),/INVALID_FILE/);
  const upload=await renewed.store({name:'notes.md',data:new TextEncoder().encode('local file').buffer,projectId});assert.equal((await renewed.preview({id:upload.id,projectId})).text,'local file');
  await rm(join(output,'clip.mp4'));await symlink(join(output,'scene.html'),join(output,'clip.mp4'));
  await assert.rejects(renewed.preview({id:ref.id,projectId}),/FILE_OUTSIDE_FOLDER/);assert.equal((await renewed.serve(new Request(live.src!))).status,404);
 }finally{await rm(root,{recursive:true,force:true});}
});
