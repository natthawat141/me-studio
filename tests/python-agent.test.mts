import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {createStudioHarness} from '../src/server/agent/runtime.mjs';
import {productionInstructions} from '../src/server/video/production.mjs';
import {createStudioHarness as createPiHarness} from '../src/server/agent/pi-runtime.mjs';
import {call,offlineModel,reply,scriptedStream} from '../scripts/local/offline-provider.mjs';
import {StudioMemoryStore} from '../src/server/memory/store';

const session={ownerId:'python-owner',projectId:'series',sessionId:'chat'};
const python={executable:resolve('.studio/python-env/bin/python'),script:resolve('tests/fixtures/python-agent.py')};
async function fixture(run:(store:StudioMemoryStore,path:string)=>Promise<void>){const root=await mkdtemp(join(tmpdir(),'studio-python-'));const path=join(root,'memory.sqlite');const store=new StudioMemoryStore(path);try{await run(store,path);}finally{store.close();await rm(root,{recursive:true,force:true});}}
const harness=(store:StudioMemoryStore,extra:Partial<Parameters<typeof createStudioHarness>[0]>={})=>createStudioHarness({store,session,python,apiKey:'synthetic-key-not-a-credential',...extra});

test('actual Python loop calls scoped Node memory tools, reopens SQLite and replays completed requests',async()=>fixture(async(store,path)=>{
 const events:string[]=[];const first=await harness(store).run({requestId:'one',text:'remember Milo',approvedTools:['remember_project_memory'],onEvent:e=>{events.push(e.type);}});
 assert.equal(first.status,'completed');assert.equal(first.usage.modelCalls,2);assert.equal(first.usage.toolCalls,1);assert.ok(events.includes('text_delta'));
 assert.equal(store.list({ownerId:session.ownerId,projectId:session.projectId})[0].value,'Milo');
 const assistant=store.readTranscript(session).find(m=>m.role==='assistant'&&Array.isArray(m.content)&&m.content.some(p=>typeof p==='object'&&p!==null&&'type' in p&&p.type==='toolCall'));assert.ok(JSON.stringify(assistant).includes('Milo')); assert.deepEqual(store.list({ownerId:'someone-else',projectId:session.projectId}),[]);
 assert.equal((await harness(store,{python:{executable:'/missing/python'}}).run({requestId:'one',text:'remember Milo'})).replayed,true);
 await assert.rejects(harness(store).run({requestId:'one',text:'different'}),/REQUEST_CONFLICT/);
 const reopened=new StudioMemoryStore(path);try{const second=await harness(reopened,{session:{...session,sessionId:'new-chat'}}).run({requestId:'two',text:'recall'});assert.equal(second.result,'Milo recalled');}finally{reopened.close();}
}));
test('Python tool requests cannot authorize mutations or invent memory and malformed arguments are contained',async()=>fixture(async store=>{
 for(const [requestId,text,approvedTools] of [['denied','remember Milo',[]],['ungrounded','remember unknown',['remember_project_memory']],['malformed','malformed',['remember_project_memory']]] as const){
  const result=await harness(store).run({requestId,text,approvedTools:[...approvedTools]});assert.equal(result.status,text==='malformed'?'failed':'completed');if(text==='malformed')assert.equal(result.errorCode,'MODEL_ERROR');
 }
 assert.deepEqual(store.list({ownerId:session.ownerId,projectId:session.projectId}),[]);
 assert.ok(store.readTranscript(session).filter(m=>m.role==='toolResult').every(m=>m.isError===true));
}));
test('Python loop bounds model calls and rejects a whole over-budget tool batch before mutations',async()=>fixture(async store=>{
 const loop=await harness(store,{limits:{maxModelCalls:2}}).run({requestId:'loop',text:'loop'});assert.equal(loop.errorCode,'MODEL_CALL_LIMIT');assert.equal(loop.usage.modelCalls,2);
 const batch=await harness(store,{limits:{maxToolCalls:1}}).run({requestId:'batch',text:'too_many',approvedTools:['remember_project_memory']});assert.equal(batch.errorCode,'TOOL_CALL_LIMIT');assert.deepEqual(store.list({ownerId:session.ownerId,projectId:session.projectId}),[]);
 const context=await harness(store,{instructions:'x'.repeat(5000),limits:{maxContextChars:4096}}).run({requestId:'context',text:'hello'});assert.equal(context.errorCode,'CONTEXT_LIMIT');assert.equal(context.usage.modelCalls,0);
}));
test('Python cancellation/timeout settle runs, release sessions and provider errors never enter transcripts',async()=>fixture(async store=>{
 const abort=new AbortController();const pending=harness(store).run({requestId:'cancel',text:'wait',signal:abort.signal,onEvent:e=>{if(e.type==='status')return;}});setTimeout(()=>abort.abort(),100);
 const cancelled=await pending;assert.equal(cancelled.status,'cancelled');
 const timeout=await harness(store,{limits:{timeoutMs:150}}).run({requestId:'timeout',text:'wait'});assert.equal(timeout.errorCode,'TIMEOUT');
 const failed=await harness(store).run({requestId:'error',text:'provider_error'});assert.equal(failed.errorCode,'MODEL_ERROR');assert.ok(!JSON.stringify(store.readTranscript(session)).includes('SECRET_PROVIDER_BODY'));
 const missing=await harness(store,{python:{executable:'/missing/python'}}).run({requestId:'missing',text:'hello'});assert.equal(missing.errorCode,'PYTHON_RUNTIME_UNAVAILABLE');
}));
test('Python subprocess does not inherit provider credentials or module injection from the parent environment',async()=>fixture(async store=>{
 const key=process.env.OPENAI_API_KEY,path=process.env.PYTHONPATH;
 try{process.env.OPENAI_API_KEY='synthetic-parent-secret';process.env.PYTHONPATH='/untrusted';const result=await harness(store).run({requestId:'env',text:'environment'});assert.equal(result.result,'clean');assert.ok(!JSON.stringify(store.readTranscript(session)).includes('synthetic'));}
 finally{if(key===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=key;if(path===undefined)delete process.env.PYTHONPATH;else process.env.PYTHONPATH=path;}
}));

test('Python resumes a database written by Pi without migrating or replaying legacy side effects',async()=>fixture(async(store,path)=>{
 const model={...offlineModel,id:'gpt-6-luna',provider:'openai'};
 const legacy=createPiHarness({store,session,model,stream:scriptedStream([
  reply(call('remember_project_memory',{key:'character.name',value:'Milo',expectedRevision:0}),{stopReason:'toolUse'}),reply('legacy answer'),
 ])});
 const original=await legacy.run({requestId:'legacy-run',text:'remember Milo',approvedTools:['remember_project_memory']});assert.equal(original.status,'completed');
 store.close();const reopened=new StudioMemoryStore(path);
 try{
  const replay=await harness(reopened,{python:{executable:'/missing/python'}}).run({requestId:'legacy-run',text:'remember Milo'});assert.equal(replay.replayed,true);assert.equal(replay.id,original.id);assert.equal(replay.result,'legacy answer');
  const next=await harness(reopened).run({requestId:'python-next',text:'prior'});assert.equal(next.result,'legacy restored');
  assert.equal(reopened.list({ownerId:session.ownerId,projectId:session.projectId})[0].revision,1);
 }finally{reopened.close();}
}));


test('bounded multimodal payload crosses actual JSONL without storing image bytes and contributes to request identity',async()=>fixture(async store=>{
 const media=Array.from({length:6},(_,i)=>({kind:'image' as const,name:`image-${i}.png`,dataUrl:'data:image/png;base64,'+'A'.repeat(300000)}));
 const run={requestId:'vision',text:'describe the references',media};
 const first=await harness(store).run(run);
 assert.equal(first.status,'completed');assert.equal(first.result,'received 6 images and 1 text parts');
 assert.ok(!JSON.stringify(store.readTranscript(session)).includes('data:image/'));
 assert.equal((await harness(store).run(run)).replayed,true);
 await assert.rejects(harness(store).run({...run,media:[media[0]]}),/REQUEST_CONFLICT/);
}));

test('creative model receives language-following policy and flexible illustration directions',async()=>fixture(async store=>{
 const result=await harness(store,{instructions:productionInstructions}).run({requestId:'policy-test',text:'policy_probe'});
 assert.equal(result.result,'policy-ok');
}));

test('audio duration errors cross Python bridge as actionable codes rather than generic failures',async()=>fixture(async store=>{
 const tool={name:'set_audio_track',label:'Soundtrack',description:'Use attached audio',parameters:{type:'object',properties:{id:{type:'string'}},required:['id']},execute:async()=>{throw Error('AUDIO_EXCEEDS_TIMELINE');}};
 const result=await harness(store,{tools:[tool]}).run({requestId:'audio-error',text:'audio_error',approvedTools:['set_audio_track']});
 assert.equal(result.status,'completed');
 assert.match(JSON.stringify(store.readTranscript(session).filter(m=>m.role==='toolResult')),/AUDIO_EXCEEDS_TIMELINE/);
}));
