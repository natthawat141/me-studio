import {randomUUID} from 'node:crypto';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,symlink,rm,realpath} from 'node:fs/promises';
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
  assert.equal(await renewed.pathForReveal(live.entry.id),await realpath(join(output,'clip.mp4')));
  await assert.rejects(renewed.pathForReveal(ref.id),/INVALID_FILE/);
  await assert.rejects(new ChatFiles(data).pathForReveal(live.entry.id),/INVALID_FILE/);
  const response=await renewed.serve(new Request(live.src!,{headers:{Range:'bytes=3-6'}}));assert.equal(response.status,206);assert.equal(await response.text(),'3456');
  const source=await renewed.register(join(output,'scene.html'),output,projectId),html=await renewed.preview({id:source.id,projectId});assert.equal(html.text,'<script>window.bad=true</script>');
  assert.equal(await renewed.pathForReveal(html.entry.id),await realpath(join(output,'scene.html')));
  await assert.rejects(renewed.store({name:'../../secret.md',data:new ArrayBuffer(1)}),/INVALID_FILE/);
  await assert.rejects(renewed.store({name:'.env',data:new ArrayBuffer(1)}),/INVALID_FILE/);
  await assert.rejects(renewed.store({name:'large.mp4',data:new ArrayBuffer(25*1024*1024+1)}),/INVALID_FILE/);
  const upload=await renewed.store({name:'notes.md',data:new TextEncoder().encode('local file').buffer,projectId});assert.equal((await renewed.preview({id:upload.id,projectId})).text,'local file');
  await rm(join(output,'clip.mp4'));await symlink(join(output,'scene.html'),join(output,'clip.mp4'));
  await assert.rejects(renewed.preview({id:ref.id,projectId}),/FILE_OUTSIDE_FOLDER/);assert.equal((await renewed.serve(new Request(live.src!))).status,404);
  await assert.rejects(renewed.pathForReveal(live.entry.id),/FILE_OUTSIDE_FOLDER/);
 }finally{await rm(root,{recursive:true,force:true});}
});

test('agent attachment inputs are scoped, bounded and read bytes rather than trusting display filenames',async()=>{
 const root=await mkdtemp(join(tmpdir(),'studio-agent-files-'));try{
  const service=new ChatFiles(root),ref=await service.store({name:'photo.png',data:new TextEncoder().encode('image-bytes').buffer,projectId});
  const transform=async(bytes:Buffer)=>'data:image/png;base64,'+bytes.toString('base64');
  const media=await service.agentInputs([{id:ref.id}],projectId,transform);
  assert.equal(media[0].kind,'image');assert.match(media[0].dataUrl!,/^data:image\/png;base64,/);
  await assert.rejects(service.agentInputs([{id:ref.id}],undefined,transform),/INVALID_FILE/);
  await assert.rejects(service.agentInputs(Array.from({length:11},()=>({id:ref.id})),projectId,transform));
  await assert.rejects(service.agentInputs(Array.from({length:7},()=>({id:ref.id})),projectId,transform),/ATTACHMENT_LIMIT/);
  await assert.rejects(service.agentInputs([{id:ref.id}],projectId,async()=> 'https://external.invalid/image.png'),/INVALID_IMAGE/);
  const note=await service.store({name:'brief.md',data:new TextEncoder().encode('user supplied brief').buffer,projectId});
  const clip=await service.store({name:'clip.mp4',data:new Uint8Array([1]).buffer,projectId});
  assert.deepEqual(await service.agentInputs([{id:note.id},{id:clip.id}],projectId,transform),[{kind:'text',name:'brief.md',text:'user supplied brief'},{kind:'unsupported',name:'clip.mp4',mediaType:'video'}]);
  const elsewhere=join(root,'elsewhere.png');await writeFile(elsewhere,'other');
  const index=JSON.parse(await (await import('node:fs/promises')).readFile(join(root,'chat-files.json'),'utf8'));
  const path=index.find((r:{id:string})=>r.id===ref.id).path;
  await rm(path);await symlink(elsewhere,path);
  await assert.rejects(service.agentInputs([{id:ref.id}],projectId,transform),/FILE_OUTSIDE_FOLDER/);
 }finally{await rm(root,{recursive:true,force:true});}
});

test('audio handles remain scoped, reject replaced paths and expose no bytes to the renderer',async()=>{
 const root=await mkdtemp(join(tmpdir(),'studio-audio-grant-'));try{
 const data=join(root,'data'),source=join(root,'source');await mkdir(source);const path=join(source,'narration.mp3');await writeFile(path,'synthetic audio bytes');
 const service=new ChatFiles(data),projectId=randomUUID(),ref=await service.register(path,source,projectId);
 const result=await service.audioInputs([{id:ref.id}],projectId);assert.equal(result.length,1);assert.equal(result[0].id,ref.id);assert.equal(result[0].path,await realpath(path));
 await assert.rejects(service.audioInputs([{id:ref.id}],randomUUID()),/INVALID_FILE/);
 await assert.rejects(service.audioInputs([{id:ref.id}],undefined),/INVALID_FILE/);
 await rm(path);await symlink(join(root,'outside.mp3'),path);await writeFile(join(root,'outside.mp3'),'outside');
 await assert.rejects(service.audioInputs([{id:ref.id}],projectId),/FILE_OUTSIDE_FOLDER/);
 }finally{await rm(root,{recursive:true,force:true});}
});
