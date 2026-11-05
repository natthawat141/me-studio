import {createHash,randomUUID} from 'node:crypto';
import {mkdir,readFile,writeFile,rename,realpath,lstat,rm} from 'node:fs/promises';
import {join,relative,isAbsolute,extname} from 'node:path';
import {z} from 'zod';
import {runTool} from '../../../scripts/local/tools.mjs';
export const audioReferenceSchema=z.object({id:z.string().uuid(),name:z.string().min(1).max(250),path:z.string().max(4000),root:z.string().max(4000)}).strict();
export type AudioReference=z.infer<typeof audioReferenceSchema>;
const recordSchema=z.object({id:z.string().uuid(),name:z.string().min(1).max(250),durationSeconds:z.number().positive().max(300),sourceHash:z.string().regex(/^[a-f0-9]{64}$/),hash:z.string().regex(/^[a-f0-9]{64}$/)}).strict();
const hash=(bytes:Buffer)=>createHash('sha256').update(bytes).digest('hex');
/** Main-process grants enter here privately; model-visible handles contain no filesystem paths. */
export async function createAudioAssets(options:{stateRoot:string;ffmpeg:string;ffprobe:string;references?:AudioReference[];signal?:AbortSignal}){
 const state=await realpath(options.stateRoot),directory=join(state,'audio-assets');await mkdir(directory,{recursive:true,mode:0o700});if(await realpath(directory)!==directory)throw Error('AUDIO_PATH_DENIED');
 const index=join(directory,'index.json');let records:z.infer<typeof recordSchema>[]=[];
 try{const info=await lstat(index);if(!info.isFile()||info.isSymbolicLink()||info.size>64000)throw Error('INVALID_AUDIO_STATE');records=z.array(recordSchema).max(10).parse(JSON.parse(await readFile(index,'utf8')));}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw Error('INVALID_AUDIO_STATE');}
 for(const ref of z.array(audioReferenceSchema).max(10).parse(options.references??[])){
  options.signal?.throwIfAborted();const base=await realpath(ref.root),rel=relative(base,ref.path);
  if(!rel||isAbsolute(rel)||rel==='..'||rel.startsWith('../'))throw Error('AUDIO_PATH_DENIED');
  let cursor=base;for(const part of rel.split('/')){cursor=join(cursor,part);if((await lstat(cursor)).isSymbolicLink())throw Error('AUDIO_PATH_DENIED');}
  if(await realpath(ref.path)!==ref.path)throw Error('AUDIO_PATH_DENIED');
  const info=await lstat(ref.path);if(!info.isFile()||info.size>25*1024*1024)throw Error('AUDIO_TOO_LARGE');
  const format=({'.mp3':'mp3','.wav':'wav','.m4a':'mov','.ogg':'ogg'} as Record<string,string>)[extname(ref.path).toLowerCase()];if(!format)throw Error('INVALID_AUDIO');
  const sourceHash=hash(await readFile(ref.path)),existing=records.find(a=>a.id===ref.id);if(existing){if(existing.sourceHash!==sourceHash)throw Error('AUDIO_CHANGED');continue;}
  if(records.length>=10)throw Error('AUDIO_ASSET_LIMIT');
  const probe=await runTool(options.ffprobe,['-v','error','-protocol_whitelist','file,pipe','-f',format,'-i',ref.path,'-show_entries','format=duration:stream=codec_type','-of','json'],{signal:options.signal});
  const metadata=JSON.parse(probe.stdout),duration=Number(metadata.format?.duration);
  if(!metadata.streams?.some((s:{codec_type:string})=>s.codec_type==='audio')||!Number.isFinite(duration)||duration<=0||duration>300)throw Error('INVALID_AUDIO_DURATION');
  // Decode a forced audio format into bounded PCM. Playlists and arbitrary container references never reach the renderer.
  const temporary=join(directory,randomUUID()+'.wav'),file=join(directory,ref.id+'.wav');
  try{
   await runTool(options.ffmpeg,['-hide_banner','-loglevel','error','-nostdin','-protocol_whitelist','file,pipe','-f',format,'-i',ref.path,'-map','0:a:0','-t','300','-ar','32000','-ac','2','-c:a','pcm_s16le',temporary],{signal:options.signal,timeout:30000});
   const bytes=await readFile(temporary);if(bytes.length>40*1024*1024)throw Error('AUDIO_TOO_LARGE');
   const normalized=await runTool(options.ffprobe,['-v','error','-show_entries','format=duration','-of','json',temporary],{signal:options.signal});
   const record=recordSchema.parse({id:ref.id,name:ref.name,durationSeconds:Number(JSON.parse(normalized.stdout).format.duration),sourceHash,hash:hash(bytes)});
   await writeFile(file,bytes,{flag:'wx',mode:0o600});records.push(record);
   const pending=index+'.'+randomUUID()+'.tmp';await writeFile(pending,JSON.stringify(records),{flag:'wx',mode:0o600});await rename(pending,index);
  }finally{await rm(temporary,{force:true});}
 }
 const publicRecord=({id,name,durationSeconds}:z.infer<typeof recordSchema>)=>({id,name,durationSeconds});
 return {
  list:()=>records.map(publicRecord),
  async resolve(id:string){const record=records.find(a=>a.id===id);if(!record)throw Error('AUDIO_NOT_FOUND');const path=join(directory,record.id+'.wav');if(await realpath(path)!==path)throw Error('AUDIO_PATH_DENIED');const info=await lstat(path);if(!info.isFile()||info.size>40*1024*1024||hash(await readFile(path))!==record.hash)throw Error('AUDIO_CHANGED');return {...publicRecord(record),path};},
 };
}
