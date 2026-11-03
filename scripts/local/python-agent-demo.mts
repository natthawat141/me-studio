import {randomUUID} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {findBrowser} from './tools.mjs';
import {createStudioHarness,developmentPythonWorker} from '../../src/server/agent/runtime.mjs';
import {StudioMemoryStore} from '../../src/server/memory/store';
import {createProductionTools,initializeSkills,productionInstructions} from '../../src/server/video/production.mjs';

const source=resolve('.studio/python-agent-demo',randomUUID());await mkdir(source,{recursive:true});
const skillRoot=await initializeSkills(source,resolve('skills'));
const production=await createProductionTools({source,outputRoot:join(source,'output'),skillRoot,toolPaths:{browser:findBrowser()!.path,ffmpeg:resolve('node_modules/@ffmpeg-installer/darwin-arm64/ffmpeg'),ffprobe:resolve('node_modules/@ffprobe-installer/darwin-arm64/ffprobe')}});
const store=new StudioMemoryStore(join(source,'memory.sqlite'));
try{
 const harness=createStudioHarness({apiKey:'synthetic-offline-key',store,python:{...developmentPythonWorker(),script:resolve('tests/fixtures/python-agent.py')},session:{ownerId:'demo',projectId:'python-video',sessionId:randomUUID()},instructions:productionInstructions,tools:production.tools,limits:{maxModelCalls:10,maxToolCalls:16,maxContextChars:128000,timeoutMs:120000}});
 const run=await harness.run({requestId:randomUUID(),text:'render_html',approvedTools:production.tools.map(t=>t.name),onEvent:e=>{if(e.type==='tool_start')console.log(`Python tool: ${e.name}`);}});
 const result={status:run.status,errorCode:run.errorCode,usage:run.usage,artifact:production.artifact()};await writeFile(join(source,'result.json'),JSON.stringify(result,null,2));
 console.log(JSON.stringify({offline:true,runtime:'python',...result}));if(run.status!=='completed'||!production.artifact())process.exitCode=1;
}finally{store.close();}
