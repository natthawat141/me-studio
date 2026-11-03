import { resolve,join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { mkdir,writeFile } from 'node:fs/promises';
import { StudioMemoryStore } from '../../src/server/memory/store';
import { createStudioHarness } from '../../src/server/agent/runtime.mjs';
import { createOpenAIProvider } from '../../src/server/agent/openai-provider.mjs';
import { createProductionTools,initializeSkills,productionInstructions } from '../../src/server/video/production.mjs';
const source=resolve(process.argv[2]||'.studio/animation-demo');await mkdir(source,{recursive:true});
try{process.loadEnvFile('.env.local');}catch{/* Explicit local setup only; never ship env. */}
const skillRoot=await initializeSkills(source,resolve('skills'));
const production=await createProductionTools({source,outputRoot:join(source,'output'),skillRoot,elevenKey:process.env.ELEVENLABS_API_KEY,voiceId:process.env.STUDIO_SPEECH_VOICE_ID,onProgress:e=>console.log(JSON.stringify({stage:e.stage,frames:e.framesCompleted,total:e.totalFrames}))});
const store=new StudioMemoryStore(join(source,'.me-studio','memory.sqlite'));
const harness=createStudioHarness({...createOpenAIProvider(process.env.OPENAI_API_KEY||''),store,session:{ownerId:'local',projectId:'animation-demo',sessionId:randomUUID()},instructions:productionInstructions,tools:production.tools,limits:{maxModelCalls:6,maxToolCalls:8,maxContextChars:64000,maxOutputTokens:3000,timeoutMs:600000}});
const result=await harness.run({requestId:randomUUID(),text:process.argv[3]||'สร้างวิดีโอการ์ตูนแนวตั้ง 8 วินาที เมืองกลางคืน บิวกับแมคทักทายกัน มีเสียงไทย บทสั้นคนละประโยค บิวพูด สวัสดีแมค แมคตอบ สวัสดีบิว จบด้วย ยินดีที่ได้รู้จัก ถ้าเสียงใช้ไม่ได้ให้รายงานตรงๆ และสร้างเวอร์ชันไม่มีเสียงไว้ก่อน',approvedTools:production.tools.map(t=>t.name),onEvent:e=>{if(e.type==='tool_start')console.log(JSON.stringify({tool:e.name}));}});
await writeFile(join(production.directory,'result.json'),JSON.stringify({status:result.status,usage:result.usage,artifact:production.artifact(),text:result.result,errorCode:result.errorCode},null,2));console.log(JSON.stringify({status:result.status,usage:result.usage,artifact:production.artifact(),text:result.result,errorCode:result.errorCode}));if(result.status!=='completed'||!production.artifact())process.exitCode=1;
