import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';

async function check(env: Record<string,string>, inspect:(base:string)=>Promise<void>) {
  // Port 0 asks the OS to allocate an isolated test port; no user server is touched.
  const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','0'],{env:{...process.env,STUDIO_MODE:'demo',STUDIO_CHAT_MODELS:'[]',STUDIO_META_MODELS:'[]',META_API_KEY:'',STUDIO_SPEECH_MODELS:'[]',OPENROUTER_API_KEY:'',ELEVENLABS_API_KEY:'',...env},stdio:['ignore','pipe','pipe']});
  try {
    const base=await new Promise<string>((resolve,reject) => {
      let output='';
      const timer=setTimeout(()=>reject(new Error('Server startup timed out')),15000);
      server.stdout.on('data',(chunk)=>{output+=String(chunk);const match=output.match(/http:\/\/127\.0\.0\.1:\d+/);if(match && output.includes('Ready')){clearTimeout(timer);resolve(match[0]);}});
      server.once('exit',()=>{clearTimeout(timer);reject(new Error('Server exited before ready'));});
    });
    await inspect(base);
  } finally { server.kill('SIGTERM'); }
}
async function main() {
  await check({STUDIO_MODE:'self-hosted',OPENROUTER_API_KEY:'synthetic-secret',STUDIO_CHAT_MODELS:JSON.stringify([{id:'meta-llama/test-model',label:'Test Llama',family:'meta-llama'}])},async(base)=>{
    const health=await fetch(base+'/api/health');assert.equal(health.status,200);assert.equal((await health.json()).scope,'liveness');
    const catalog=await fetch(base+'/api/catalog');assert.equal(catalog.status,200);assert.equal(catalog.headers.get('cache-control'),'no-store');
    const body=await catalog.text();assert.doesNotMatch(body,/synthetic-secret|API_KEY/);const data=JSON.parse(body);assert.equal(data.mode,'self-hosted');assert.equal(data.models[0].modelId,'meta-llama/test-model');assert.equal(data.liveChatEnabled,false);
    console.log('PASS runtime catalog, liveness and secret omission');
  });
  await check({STUDIO_CHAT_MODELS:'not-json-with-synthetic-secret'},async(base)=>{
    const response=await fetch(base+'/api/catalog');assert.equal(response.status,503);assert.doesNotMatch(await response.text(),/synthetic-secret/);console.log('PASS invalid config fails closed without echoing input');
  });
}
main().catch(()=>{console.error('HTTP integration verification failed');process.exitCode=1;});
