import { mkdir,readFile,writeFile,realpath,rename } from 'node:fs/promises';
import { join,relative,isAbsolute } from 'node:path';
import { z } from 'zod';
import { createOpenAIProvider } from '../agent/openai-provider.mjs';
import { createStudioHarness } from '../agent/runtime.mjs';
import { createProductionTools,initializeSkills,productionInstructions } from './production.mjs';
import type { StudioMemoryStore } from '../memory/store';
export function createNativeProduction(resources:string,data:string,store:StudioMemoryStore,toolPaths:{browser:string;ffmpeg:string;ffprobe:string},event:(e:unknown)=>void){
 let keys:{openai:string;eleven?:string} |undefined;let active:AbortController|undefined;
 const indexPath=join(data,'video-artifacts.json');
 const artifactSchema=z.object({id:z.string().uuid(),projectId:z.string().uuid(),outputPath:z.string(),title:z.string(),hasVoice:z.boolean(),outputRoot:z.string()});
 async function index(){try{return z.array(artifactSchema).parse(JSON.parse(await readFile(indexPath,'utf8')));}catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')return [];throw Error('ARTIFACT_INDEX_UNREADABLE');}}
 return {
 configure(input:unknown){const value=z.object({openai:z.string().min(1).max(4096),eleven:z.string().max(4096).optional()}).strict().parse(input);keys=value;return {configured:true};},
 status(){return {configured:!!keys,busy:!!active};},cancel(){active?.abort();return {};},
 async artifact(input:unknown){const v=z.object({id:z.string().uuid(),projectId:z.string().uuid()}).strict().parse(input);const item=(await index()).find(x=>x.id===v.id&&x.projectId===v.projectId);if(!item)throw Error('ARTIFACT_NOT_FOUND');const path=await realpath(item.outputPath),root=await realpath(item.outputRoot),rel=relative(root,path);if(rel.startsWith('..')||isAbsolute(rel))throw Error('ARTIFACT_NOT_FOUND');return {id:item.id,outputPath:path,title:item.title};},
 async produce(input:unknown){if(!keys)throw Error('VIDEO_KEYS_REQUIRED');if(active)throw Error('VIDEO_BUSY');const v=z.object({projectId:z.string().uuid(),sessionId:z.string().uuid(),requestId:z.string().uuid(),text:z.string().min(1).max(8000),source:z.string(),outputRoot:z.string()}).strict().parse(input);
 const abort=new AbortController();active=abort;
 try{const skillRoot=await initializeSkills(v.source,join(resources,'skills'));const p=await createProductionTools({source:v.source,outputRoot:v.outputRoot,skillRoot,elevenKey:keys.eleven,signal:abort.signal,toolPaths,onProgress:progress=>event({kind:'production',type:'render',sessionId:v.sessionId,stage:progress.stage,completed:progress.framesCompleted,total:progress.totalFrames})});
 const h=createStudioHarness({...createOpenAIProvider(keys.openai),store,session:{ownerId:'desktop-local-owner',projectId:v.projectId,sessionId:v.sessionId},tools:p.tools,instructions:productionInstructions,limits:{maxModelCalls:6,maxToolCalls:8,maxContextChars:64000,maxOutputTokens:3000,timeoutMs:600000}});
 const run=await h.run({requestId:v.requestId,text:v.text,signal:abort.signal,approvedTools:p.tools.map(t=>t.name),onEvent:e=>event({...e,kind:'production',sessionId:v.sessionId})});
 if(run.status!=='completed')throw Error('VIDEO_RUN_FAILED');const a=p.artifact();if(!a)return {text:run.result||'',usage:run.usage};
 const item=artifactSchema.parse({id:a.id,projectId:v.projectId,outputPath:a.path,title:a.title,hasVoice:a.hasVoice,outputRoot:await realpath(v.outputRoot)});const items=await index();items.push(item);await mkdir(data,{recursive:true});await writeFile(indexPath+'.tmp',JSON.stringify(items),{mode:0o600});await rename(indexPath+'.tmp',indexPath);return {text:run.result||'',usage:run.usage,artifact:{id:item.id,title:item.title,outputPath:item.outputPath,hasVoice:item.hasVoice}};
 }finally{active=undefined;}
 }
 };
}
