import { mkdir,readFile,writeFile,realpath,rename } from 'node:fs/promises';
import { join,relative,isAbsolute } from 'node:path';
import { z } from 'zod';
import { createStudioHarness } from '../agent/runtime.mjs';
import { createProductionTools,initializeSkills,productionInstructions } from './production.mjs';
import type { StudioMemoryStore } from '../memory/store';
export function createNativeProduction(resources:string,data:string,store:StudioMemoryStore,toolPaths:{browser:string;ffmpeg:string;ffprobe:string},event:(e:unknown)=>void){
 let keys:{openai:string;meta?:string;openrouter?:string;eleven?:string;voiceId?:string;speechModel?:string;language?:string;models?:{provider:string;model:string}[]} |undefined;let active:AbortController|undefined;
 const indexPath=join(data,'video-artifacts.json');
 const artifactSchema=z.object({id:z.string().uuid(),projectId:z.string().uuid(),outputPath:z.string(),title:z.string(),hasVoice:z.boolean(),outputRoot:z.string()});
 async function index(){try{return z.array(artifactSchema).parse(JSON.parse(await readFile(indexPath,'utf8')));}catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')return [];throw Error('ARTIFACT_INDEX_UNREADABLE');}}
 return {
 configure(input:unknown){const value=z.object({openai:z.string().max(4096),meta:z.string().max(4096).optional(),openrouter:z.string().max(4096).optional(),eleven:z.string().max(4096).optional(),voiceId:z.string().regex(/^[a-zA-Z0-9_-]{1,200}$/).optional(),speechModel:z.enum(['eleven_v3','eleven_multilingual_v2','eleven_flash_v2_5']).optional(),language:z.string().regex(/^[a-z]{2}$/).optional(),models:z.array(z.object({provider:z.enum(['openai','openrouter','meta']),model:z.string().regex(/^[a-zA-Z0-9._:/-]{1,160}$/)})).max(200).optional()}).strict().parse(input);keys=value;return {configured:true};},
 status(){return {configured:!!(keys?.openai||keys?.openrouter||keys?.meta),busy:!!active,runtime:'python'};},cancel(){active?.abort();return {};},
 async artifact(input:unknown){const v=z.object({id:z.string().uuid(),projectId:z.string().uuid()}).strict().parse(input);const item=(await index()).find(x=>x.id===v.id&&x.projectId===v.projectId);if(!item)throw Error('ARTIFACT_NOT_FOUND');const path=await realpath(item.outputPath),root=await realpath(item.outputRoot),rel=relative(root,path);if(rel.startsWith('..')||isAbsolute(rel))throw Error('ARTIFACT_NOT_FOUND');return {id:item.id,outputPath:path,outputRoot:root,title:item.title};},
 async produce(input:unknown){if(!keys)throw Error('VIDEO_KEYS_REQUIRED');if(active)throw Error('VIDEO_BUSY');const v=z.object({projectId:z.string().uuid(),sessionId:z.string().uuid(),requestId:z.string().uuid(),text:z.string().min(1).max(8000),provider:z.enum(['openai','openrouter','meta']).default('openai'),model:z.string().regex(/^[a-zA-Z0-9._:/-]{1,160}$/).default('gpt-6-luna'),source:z.string(),outputRoot:z.string()}).strict().parse(input);
 if(keys.models&&!keys.models.some(m=>m.provider===v.provider&&m.model===v.model))throw Error('MODEL_NOT_AVAILABLE');
 const apiKey=v.provider==='openai'?keys.openai:v.provider==='meta'?keys.meta:keys.openrouter;if(!apiKey)throw Error('VIDEO_KEYS_REQUIRED');
 const abort=new AbortController();active=abort;
 try{const skillRoot=await initializeSkills(v.source,join(resources,'skills'));const p=await createProductionTools({source:v.source,outputRoot:v.outputRoot,skillRoot,sessionId:v.sessionId,elevenKey:keys.eleven,voiceId:keys.voiceId,speechModel:keys.speechModel,language:keys.language,signal:AbortSignal.any([abort.signal,AbortSignal.timeout(600000)]),toolPaths,onProgress:progress=>event({kind:'production',type:'render',sessionId:v.sessionId,stage:progress.stage,completed:progress.framesCompleted,total:progress.totalFrames})});
 const h=createStudioHarness({apiKey,model:v.model,provider:v.provider,python:{executable:join(resources,'python-agent/me-studio-agent')},store,session:{ownerId:'desktop-local-owner',projectId:v.projectId,sessionId:v.sessionId},tools:p.tools.filter(t=>t.name!=='save_animation'),instructions:productionInstructions+`\nHost voice settings: available=${!!keys.eleven}, voiceId=${keys.voiceId||'JBFqnCBsd6RMkjVDRZzb'}, speechModel=${keys.speechModel||'eleven_v3'}, language=${keys.language||'th'}. Do not change these unless the user asks.`,limits:{maxModelCalls:10,maxToolCalls:16,maxContextChars:128000,maxOutputTokens:8192,timeoutMs:600000}});
 const run=await h.run({requestId:v.requestId,text:v.text,signal:abort.signal,approvedTools:p.tools.map(t=>t.name),onEvent:e=>event({...e,kind:'production',sessionId:v.sessionId})});
 if(run.status!=='completed')throw Error('VIDEO_RUN_FAILED');const a=p.artifact();if(!a)return {text:run.result||'',usage:run.usage,previews:p.previews(),choices:p.choices()};
 const item=artifactSchema.parse({id:a.id,projectId:v.projectId,outputPath:a.path,title:a.title,hasVoice:a.hasVoice,outputRoot:await realpath(v.outputRoot)});const items=await index();items.push(item);await mkdir(data,{recursive:true});await writeFile(indexPath+'.tmp',JSON.stringify(items),{mode:0o600});await rename(indexPath+'.tmp',indexPath);return {text:run.result||'',usage:run.usage,previews:p.previews(),choices:p.choices(),artifact:{id:item.id,title:item.title,outputPath:item.outputPath,hasVoice:item.hasVoice}};
 }finally{active=undefined;}
 }
 };
}
