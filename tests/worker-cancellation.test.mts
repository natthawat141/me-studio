import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fork} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {mkdtemp,mkdir,writeFile,symlink,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
test('actual worker dispatch scopes Stop to request and supports host shutdown',async()=>{
 const root=await mkdtemp(join(tmpdir(),'studio-worker-stop-'));const resources=join(root,'resources'),data=join(root,'data'),source=join(root,'source');
 await Promise.all([mkdir(join(resources,'python-agent'),{recursive:true}),mkdir(data),mkdir(source)]);
 await symlink(resolve('skills'),join(resources,'skills'));
 const python=resolve('.studio/python-env/bin/python');await writeFile(join(resources,'python-agent/me-studio-agent'),`#!${python}\nimport runpy\nrunpy.run_path(${JSON.stringify(resolve('tests/fixtures/python-agent.py'))},run_name='__main__')\n`,{mode:0o700});
 const child=fork(process.env.STUDIO_TEST_WORKER_PATH||resolve('desktop/worker.mts'),[resources,data],{execArgv:['--import','tsx'],stdio:['ignore','ignore','ignore','ipc']});
 const pending=new Map<string,(v:{result?:unknown;error?:string})=>void>();let started:(()=>void)|undefined;
 child.on('message',(message:{requestId?:string;event?:{type:string;kind:string};result?:unknown;error?:string})=>{if(message.event?.kind==='production'&&message.event.type==='status')started?.();if(message.requestId){pending.get(message.requestId)?.(message);pending.delete(message.requestId);}});
 const request=(method:string,input:unknown={})=>new Promise<{result?:unknown;error?:string}>(resolve=>{const id=randomUUID();pending.set(id,resolve);child.send({requestId:id,method,input});});
 try{
  assert.ok(!(await request('videoConfigure',{openai:'synthetic-key'})).error);
  for(const action of ['videoCancel','videoShutdown']){
   const requestId=randomUUID();const ready=new Promise<void>(resolve=>{started=resolve;});
   const run=request('videoProduce',{projectId:randomUUID(),sessionId:randomUUID(),requestId,text:'wait',source,outputRoot:join(source,'output')});await ready;started=undefined;
   if(action==='videoCancel'){assert.ok(!(await request(action,{requestId:randomUUID()})).error);assert.deepEqual((await request('videoStatus')).result,{configured:true,busy:true,runtime:'python'});}
   assert.ok(!(await request(action,action==='videoCancel'?{requestId}:{})).error);assert.equal(((await run).result as {status:string}).status,'cancelled');assert.equal(((await request('videoStatus')).result as {busy:boolean}).busy,false);
  }
 }finally{child.disconnect();await new Promise<void>(resolve=>child.once('exit',()=>resolve()));await rm(root,{recursive:true,force:true});}
});
