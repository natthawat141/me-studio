import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,symlink,rm,readFile,realpath} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import {createNativeProduction} from '../src/server/video/native-production.mjs';
import {StudioMemoryStore} from '../src/server/memory/store';
test('native failure retains classified cause and successful intermediate files, releases busy state and allows a new request',async()=>{
 const root=await mkdtemp(join(tmpdir(),'studio-failure-'));const resources=join(root,'resources'),data=join(root,'data'),source=join(root,'source');
 await Promise.all([mkdir(join(resources,'python-agent'),{recursive:true}),mkdir(data),mkdir(source)]);
 await symlink(resolve('skills'),join(resources,'skills'));
 await writeFile(join(resources,'python-agent/me-studio-agent'),`#!${resolve('.studio/python-env/bin/python')}\nimport runpy\nrunpy.run_path(${JSON.stringify(resolve('tests/fixtures/python-agent.py'))},run_name='__main__')\n`,{mode:0o700});
 const store=new StudioMemoryStore(join(data,'memory.sqlite'));const p=createNativeProduction(resources,data,store,{browser:'unused',ffmpeg:'unused',ffprobe:'unused'},()=>{});
 const input={projectId:randomUUID(),sessionId:randomUUID(),requestId:randomUUID(),text:'partial_failure',source,outputRoot:join(source,'output')};
 try{p.configure({openai:'synthetic-key'});const result=await p.produce(input);
  assert.equal(result.status,'failed');assert.equal(result.errorCode,'MODEL_ERROR');assert.equal(result.resultFiles[0].path,await realpath(join(source,'preview.html')));
  assert.match(await readFile(join(source,'preview.html'),'utf8'),/Saved before failure/);assert.equal(p.status().busy,false);
  const next=await p.produce({...input,text:'hello',requestId:randomUUID()});assert.equal(next.status,'completed');
 }finally{store.close();await rm(root,{recursive:true,force:true});}
});
