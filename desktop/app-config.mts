import {randomUUID} from 'node:crypto';
import {parseEnv} from 'node:util';
import {readFile,writeFile,mkdir,rename,lstat,chmod,rm} from 'node:fs/promises';
import {dirname} from 'node:path';
import {z} from 'zod';
import {openaiChatModels,metaChatModels,type NativeCatalog} from '../src/lib/native-models';

const modelList=z.array(z.object({id:z.string().regex(/^[a-zA-Z0-9._:/-]{1,160}$/),label:z.string().min(1).max(80),enabled:z.boolean().default(true)}).strict()).max(100).refine(items=>new Set(items.map(i=>i.id)).size===items.length);
const keys=['STUDIO_REASONING_EFFORT','META_API_KEY','STUDIO_META_MODELS','OPENAI_API_KEY','OPENROUTER_API_KEY','ELEVENLABS_API_KEY','STUDIO_DEFAULT_CHAT_PROVIDER','STUDIO_DEFAULT_CHAT_MODEL','STUDIO_OPENAI_MODELS','STUDIO_CHAT_MODELS','STUDIO_SPEECH_VOICE_ID','STUDIO_SPEECH_MODEL','STUDIO_SPEECH_LANGUAGE'] as const;
function encode(value:string){const quote=["'",'"','`'].find(q=>!value.includes(q));if(!quote)throw Error('INVALID_CONFIG');return quote+value+quote;}
export function parseAppConfig(text:string){
 if(Buffer.byteLength(text)>65536)throw Error('INVALID_CONFIG');
 const raw=parseEnv(text);
 const env:Record<string,string>={};
 for(const k of keys){const value=raw[k]?.trim();if(value!==undefined){if(/[\r\n\x00]/.test(value)||value.length>20000)throw Error('INVALID_CONFIG');env[k]=value;}}
 env.OPENAI_API_KEY ||= raw.Openai_api?.trim()||'';
 env.META_API_KEY ||= raw.meta_ai_api?.trim()||raw.MODEL_API_KEY?.trim()||'';
 env.ELEVENLABS_API_KEY ||= raw.elevenlabs?.trim()||'';
 for(const key of ['OPENAI_API_KEY','OPENROUTER_API_KEY','META_API_KEY','ELEVENLABS_API_KEY'])if(env[key]&&(/[\r\n\x00]/.test(env[key])||env[key].length>4096))throw Error('INVALID_CONFIG');
 const configuredModels=modelList.parse(JSON.parse(env.STUDIO_OPENAI_MODELS||'[]'));
 const openai=configuredModels.length?configuredModels:openaiChatModels.map(m=>({...m,enabled:true}));
 const openrouter=modelList.parse(JSON.parse(env.STUDIO_CHAT_MODELS||'[]'));
 const configuredMeta=modelList.parse(JSON.parse(env.STUDIO_META_MODELS||'[]'));
 const meta=configuredMeta.length?configuredMeta:metaChatModels.map(m=>({...m,enabled:true}));
 const providers=[{id:'meta',name:'Meta',configured:!!env.META_API_KEY,models:meta},{id:'openai',name:'OpenAI',configured:!!env.OPENAI_API_KEY,models:openai},{id:'openrouter',name:'OpenRouter',configured:!!env.OPENROUTER_API_KEY,models:openrouter}];
 const defaultProvider=env.STUDIO_DEFAULT_CHAT_PROVIDER||'openai';
 const defaultModel=env.STUDIO_DEFAULT_CHAT_MODEL||'gpt-6-luna';
 if(!providers.some(p=>p.id===defaultProvider&&p.models.some(m=>m.id===defaultModel)))throw Error('INVALID_DEFAULT_MODEL');
 const reasoning=z.enum(['auto','low','medium','high']).parse(env.STUDIO_REASONING_EFFORT||'auto');
 const catalog:NativeCatalog={reasoning,providers,defaultProvider,defaultModel,voiceConfigured:!!env.ELEVENLABS_API_KEY};
 return {env,catalog};
}
const template=`# me studio — local credentials. Never share or commit this file.
META_API_KEY=
OPENAI_API_KEY=
OPENROUTER_API_KEY=
ELEVENLABS_API_KEY=

STUDIO_REASONING_EFFORT=auto
STUDIO_DEFAULT_CHAT_PROVIDER=openai
STUDIO_DEFAULT_CHAT_MODEL=gpt-6-luna
# Model IDs and names can be edited. Settings toggles update enabled.
STUDIO_OPENAI_MODELS='${JSON.stringify(openaiChatModels.map(m=>({...m,enabled:true})))}'
STUDIO_CHAT_MODELS='[]'

STUDIO_SPEECH_VOICE_ID=JBFqnCBsd6RMkjVDRZzb
STUDIO_SPEECH_MODEL=eleven_v3
STUDIO_SPEECH_LANGUAGE=th
`;
export class AppConfig {
 constructor(readonly path:string){}
 async ensure(){await mkdir(dirname(this.path),{recursive:true});try{await writeFile(this.path,template,{flag:'wx',mode:0o600});}catch(e){if((e as NodeJS.ErrnoException).code!=='EEXIST')throw e;}}
 async read(){await this.ensure();const s=await lstat(this.path);if(!s.isFile()||s.isSymbolicLink()||s.size>65536)throw Error('INVALID_CONFIG');await chmod(this.path,0o600);return parseAppConfig(await readFile(this.path,'utf8'));}
 async replace(text:string){parseAppConfig(text);const tmp=this.path+'.'+randomUUID()+'.tmp';await writeFile(tmp,text,{mode:0o600,flag:'wx'});try{await rename(tmp,this.path);}catch{throw Error('CONFIG_SAVE_FAILED');}finally{await rm(tmp,{force:true});}}
 async import(text:string){const {env}=parseAppConfig(text);await this.ensure();const lines=keys.filter(k=>env[k]!==undefined).map(k=>`${k}=${encode(env[k])}`).join('\n');await this.replace('# me studio — local credentials. Never share or commit.\n'+lines+'\n');}
 async saveProvider(input:unknown){
  const v=z.object({provider:z.enum(['openai','openrouter','meta','elevenlabs']),apiKey:z.string().trim().min(1).max(4096).refine(s=>!/[\r\n\x00]/.test(s)),modelId:z.string().regex(/^[a-zA-Z0-9._:/-]{1,160}$/).optional(),modelLabel:z.string().trim().min(1).max(80).optional()}).strict().parse(input);
  const {env,catalog}=await this.read();const field={openai:'OPENAI_API_KEY',openrouter:'OPENROUTER_API_KEY',meta:'META_API_KEY',elevenlabs:'ELEVENLABS_API_KEY'}[v.provider];env[field]=v.apiKey;
  if(v.modelId&&v.provider!=='elevenlabs'){const p=catalog.providers.find(p=>p.id===v.provider)!;if(!p.models.some(m=>m.id===v.modelId))p.models.push({id:v.modelId,label:v.modelLabel||v.modelId,enabled:true});const list={openai:'STUDIO_OPENAI_MODELS',openrouter:'STUDIO_CHAT_MODELS',meta:'STUDIO_META_MODELS'}[v.provider];env[list]=JSON.stringify(p.models);}
  await this.replace('# me studio — local credentials. Never share or commit.\n'+keys.filter(k=>env[k]!==undefined).map(k=>`${k}=${encode(env[k])}`).join('\n')+'\n');return (await this.read()).catalog;
 }
 async reasoning(input:unknown){const value=z.enum(['auto','low','medium','high']).parse(input);const {env}=await this.read();env.STUDIO_REASONING_EFFORT=value;await this.replace(keys.filter(k=>env[k]!==undefined).map(k=>`${k}=${encode(env[k])}`).join('\n')+'\n');return (await this.read()).catalog;}
 async toggle(provider:string,model:string,enabled:boolean){const {env,catalog}=await this.read();const p=catalog.providers.find(p=>p.id===provider),m=p?.models.find(m=>m.id===model);if(!p||!m||typeof enabled!=='boolean')throw Error('INVALID_MODEL');m.enabled=enabled;const key=provider==='openai'?'STUDIO_OPENAI_MODELS':provider==='meta'?'STUDIO_META_MODELS':'STUDIO_CHAT_MODELS';env[key]=JSON.stringify(p.models);await this.replace(keys.filter(k=>env[k]!==undefined).map(k=>`${k}=${encode(env[k])}`).join('\n')+'\n');return (await this.read()).catalog;}
}
