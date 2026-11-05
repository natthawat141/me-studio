import {audioReferenceSchema} from './audio-assets.mjs';
import {prepareProjectState} from './project-state.mjs';
import { mkdir,readFile,writeFile,realpath,rename } from 'node:fs/promises';
import { join,relative,isAbsolute } from 'node:path';
import {agentMediaSchema} from '../../lib/agent-media';
import { z } from 'zod';
import { createStudioHarness } from '../agent/runtime.mjs';
import { createProductionTools,initializeSkills,productionInstructions,productionCompletionInstructions } from './production.mjs';
import type { StudioMemoryStore } from '../memory/store';
export function createNativeProduction(resources:string,data:string,store:StudioMemoryStore,toolPaths:{browser:string;ffmpeg:string;ffprobe:string},event:(e:unknown)=>void,exportDirectory?:string){
 let keys:{openai:string;meta?:string;openrouter?:string;eleven?:string;voiceId?:string;speechModel?:string;language?:string;models?:{provider:string;model:string}[]} |undefined;let active:AbortController|undefined;let activeRequest:string|undefined;
 const indexPath=join(data,'video-artifacts.json');
 const artifactSchema=z.object({id:z.string().uuid(),projectId:z.string().uuid(),outputPath:z.string(),title:z.string(),hasVoice:z.boolean(),outputRoot:z.string()});
 async function index(){try{return z.array(artifactSchema).parse(JSON.parse(await readFile(indexPath,'utf8')));}catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')return [];throw Error('ARTIFACT_INDEX_UNREADABLE');}}
 return {
 configure(input:unknown){const value=z.object({openai:z.string().max(4096),meta:z.string().max(4096).optional(),openrouter:z.string().max(4096).optional(),eleven:z.string().max(4096).optional(),voiceId:z.string().regex(/^[a-zA-Z0-9_-]{1,200}$/).optional(),speechModel:z.enum(['eleven_v3','eleven_multilingual_v2','eleven_flash_v2_5']).optional(),language:z.string().regex(/^[a-z]{2}$/).optional(),models:z.array(z.object({provider:z.enum(['openai','openrouter','meta']),model:z.string().regex(/^[a-zA-Z0-9._:/-]{1,160}$/)})).max(200).optional()}).strict().parse(input);keys=value;return {configured:true};},
 shutdown(){active?.abort();return {};},
 status(){return {configured:!!(keys?.openai||keys?.openrouter||keys?.meta),busy:!!active,runtime:'python'};},cancel(input?:unknown){const v=z.object({requestId:z.string().uuid().optional()}).strict().parse(input??{});if(v.requestId&&v.requestId===activeRequest)active?.abort();return {};},
 async artifact(input:unknown){const v=z.object({id:z.string().uuid(),projectId:z.string().uuid()}).strict().parse(input);const item=(await index()).find(x=>x.id===v.id&&x.projectId===v.projectId);if(!item)throw Error('ARTIFACT_NOT_FOUND');const path=await realpath(item.outputPath),root=await realpath(item.outputRoot),rel=relative(root,path);if(rel.startsWith('..')||isAbsolute(rel))throw Error('ARTIFACT_NOT_FOUND');return {id:item.id,outputPath:path,outputRoot:root,title:item.title};},
 async produce(input:unknown){if(!keys)throw Error('VIDEO_KEYS_REQUIRED');if(active)throw Error('VIDEO_BUSY');const v=z.object({projectId:z.string().uuid(),sessionId:z.string().uuid(),requestId:z.string().uuid(),text:z.string().min(1).max(8000),provider:z.enum(['openai','openrouter','meta']).default('openai'),model:z.string().regex(/^[a-zA-Z0-9._:/-]{1,160}$/).default('gpt-6-luna'),reasoning:z.enum(['auto','low','medium','high']).default('auto'),media:agentMediaSchema.default([]),audioReferences:z.array(audioReferenceSchema).max(10).default([]),source:z.string(),outputRoot:z.string()}).strict().parse(input);
 if(keys.models&&!keys.models.some(m=>m.provider===v.provider&&m.model===v.model))throw Error('MODEL_NOT_AVAILABLE');
 const apiKey=v.provider==='openai'?keys.openai:v.provider==='meta'?keys.meta:keys.openrouter;if(!apiKey)throw Error('VIDEO_KEYS_REQUIRED');
 const abort=new AbortController();active=abort;activeRequest=v.requestId;
 try{const skillRoot=await initializeSkills(v.source,join(resources,'skills'));const p=await createProductionTools({exportDirectory,source:v.source,outputRoot:v.outputRoot,skillRoot,preferencesRoot:join(data,'project-state',v.projectId),stateRoot:await prepareProjectState({data,projectId:v.projectId,sessionId:v.sessionId,source:v.source}),sessionId:v.sessionId,audioReferences:v.audioReferences,references:v.media.filter((m):m is Extract<typeof m,{kind:'image'}>=>m.kind==='image'),elevenKey:keys.eleven,voiceId:keys.voiceId,speechModel:keys.speechModel,language:keys.language,signal:AbortSignal.any([abort.signal,AbortSignal.timeout(600000)]),toolPaths,onActivity:activity=>event({kind:'production',type:'activity',sessionId:v.sessionId,requestId:v.requestId,...activity}),onProgress:progress=>event({kind:'production',type:'render',sessionId:v.sessionId,requestId:v.requestId,stage:progress.stage,completed:progress.framesCompleted,total:progress.totalFrames})});
 const h=createStudioHarness({apiKey,toolProfile:'creative',model:v.model,provider:v.provider,reasoning:v.reasoning,python:{executable:join(resources,'python-agent/me-studio-agent')},store,session:{ownerId:'desktop-local-owner',projectId:v.projectId,sessionId:v.sessionId},tools:p.tools.filter(t=>t.name!=='save_animation'),instructions:productionInstructions+productionCompletionInstructions+`\nAvailable reference assets: ${JSON.stringify(p.assets())}.\nHost voice settings: available=${!!keys.eleven}, voiceId=${keys.voiceId||'JBFqnCBsd6RMkjVDRZzb'}, speechModel=${keys.speechModel||'eleven_v3'}, language=${keys.language||'th'}. Do not change these unless the user asks.`,limits:{maxModelCalls:10,maxToolCalls:16,maxContextChars:128000,maxOutputTokens:8192,timeoutMs:600000}});
 const modelMedia=v.media.filter(m=>m.kind!=='unsupported'||m.mediaType!=='audio');
 if(v.audioReferences.length)modelMedia.push({kind:'text',name:'Attached audio handles',text:JSON.stringify(v.audioReferences.map(({id,name})=>({id,name})))+' Available through local audio tools; not transcribed.'});
 const run=await h.run({requestId:v.requestId,text:v.text,media:modelMedia,signal:abort.signal,approvedTools:p.tools.map(t=>t.name),onEvent:e=>event({...e,kind:'production',sessionId:v.sessionId,requestId:v.requestId})});
 const outcome={status:run.status,errorCode:run.errorCode??undefined};
 const a=p.artifact();if(!a)return {...outcome,text:run.result||'',usage:run.usage,previews:p.previews(),resultFiles:p.resultFiles(),choices:p.choices()};
 const item=artifactSchema.parse({id:a.id,projectId:v.projectId,outputPath:a.path,title:a.title,hasVoice:a.hasVoice,outputRoot:await realpath(v.outputRoot)});const items=await index();items.push(item);await mkdir(data,{recursive:true});await writeFile(indexPath+'.tmp',JSON.stringify(items),{mode:0o600});await rename(indexPath+'.tmp',indexPath);return {...outcome,text:run.result||'',usage:run.usage,previews:p.previews(),resultFiles:p.resultFiles(),choices:p.choices(),artifact:{id:item.id,title:item.title,outputPath:item.outputPath,hasVoice:item.hasVoice}};
 }finally{active=undefined;activeRequest=undefined;}
 }
 };
}
