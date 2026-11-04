import {mkdir,readFile,writeFile,realpath,lstat,readdir,rename,rm} from 'node:fs/promises';
import {join,dirname} from 'node:path';import {randomUUID,createHash} from 'node:crypto';import {z} from 'zod';
const id=z.string().uuid();
const draft=z.array(z.object({title:z.string().max(100),html:z.string().max(48000),width:z.number().int().min(320).max(1280),height:z.number().int().min(320).max(1280),durationSeconds:z.number().min(1).max(60),narration:z.string().max(3000)}).strict()).max(20);
const assets=z.array(z.object({id:z.string().regex(/^asset-[a-f0-9]{64}\.(png|jpg|webp)$/),name:z.string().max(250),src:z.string()}).strict().refine(a=>a.src==='assets/'+a.id)).max(20);
async function regular(path:string,max:number){const info=await lstat(path);if(!info.isFile()||info.isSymbolicLink()||await realpath(path)!==path||info.size>max)throw Error('INVALID_PROJECT_STATE');return readFile(path);}
async function copyAbsent(from:string,to:string,validate:(b:Buffer)=>void,max:number){try{await lstat(to);return;}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}let bytes:Buffer;try{bytes=await regular(from,max);}catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')return;throw e;}validate(bytes);await writeFile(to,bytes,{flag:'wx',mode:0o600}).catch(e=>{if(e.code!=='EEXIST')throw e;});}
export async function prepareProjectState(o:{data:string;projectId:string;sessionId:string;source:string}){
 const base=join(o.data,'project-state',id.parse(o.projectId),id.parse(o.sessionId));await mkdir(base,{recursive:true,mode:0o700});const destination=await realpath(base);if((await lstat(base)).isSymbolicLink())throw Error('INVALID_PROJECT_STATE');
 const source=await realpath(o.source),old=join(source,'.me-studio/skills');
 try{if(await realpath(old)!==old)throw Error('INVALID_PROJECT_STATE');}catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')return destination;throw e;}
 await copyAbsent(join(old,`draft-${o.sessionId}.json`),join(destination,`draft-${o.sessionId}.json`),b=>draft.parse(JSON.parse(b.toString())),1000000);
 await copyAbsent(join(old,'enabled.json'),join(dirname(destination),'enabled.json'),b=>z.record(z.string(),z.boolean()).parse(JSON.parse(b.toString())),4000);
 const previous=join(old,`workspace-${o.sessionId}`),next=join(destination,`workspace-${o.sessionId}`);
 try{await lstat(next);return destination;}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}
 let list:z.infer<typeof assets>;try{if(await realpath(previous)!==previous)throw Error('INVALID_PROJECT_STATE');list=assets.parse(JSON.parse((await regular(join(previous,'assets.json'),12000)).toString()));}catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')return destination;throw e;}
 const temp=join(destination,'migrate-'+randomUUID());await mkdir(temp,{mode:0o700});try{for(const a of list){const b=await regular(join(previous,a.id),250000);if(!a.id.includes(createHash('sha256').update(b).digest('hex')))throw Error('INVALID_PROJECT_STATE');await writeFile(join(temp,a.id),b,{flag:'wx',mode:0o600});}await writeFile(join(temp,'assets.json'),JSON.stringify(list),{mode:0o600});await rename(temp,next);}finally{await rm(temp,{recursive:true,force:true});}return destination;
}
/** Called before changing a source binding, so old sessions migrate before that grant is replaced. */
export async function prepareProjectRelink(o:{data:string;projectId:string;source:string}){try{const source=await realpath(o.source),old=join(source,'.me-studio/skills');if(await realpath(old)!==old)throw Error('INVALID_PROJECT_STATE');const names=await readdir(old);if(names.length>500)throw Error('INVALID_PROJECT_STATE');const ids=new Set(names.flatMap(n=>{const match=/^(?:draft-|workspace-)([a-f0-9-]{36})(?:\.json)?$/.exec(n);return match&&id.safeParse(match[1]).success?[match[1]]:[];}));for(const sessionId of ids)await prepareProjectState({...o,sessionId});}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}}
