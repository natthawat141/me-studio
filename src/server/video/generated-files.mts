import {randomUUID} from 'node:crypto';
import {readFile,writeFile,rename,lstat,realpath} from 'node:fs/promises';
import {join,relative,isAbsolute,extname,basename} from 'node:path';
import {z} from 'zod';

const kind=z.enum(['image','video','audio','html','text']);
const entry=z.object({id:z.string().uuid(),root:z.string().max(2000),path:z.string().min(1).max(600),title:z.string().min(1).max(160),kind,createdAt:z.string().datetime()}).strict();
const entries=z.array(entry).max(100);
type Entry=z.infer<typeof entry>;
const fileKind=(path:string):z.infer<typeof kind>=>{
 const ext=extname(path).toLowerCase();
 if(['.png','.jpg','.jpeg','.webp','.gif','.avif'].includes(ext))return 'image';
 if(['.mp4','.webm'].includes(ext))return 'video';
 if(['.mp3','.wav','.m4a'].includes(ext))return 'audio';
 if(['.html','.htm'].includes(ext))return 'html';
 if(['.md','.txt','.json','.css','.csv','.yaml','.yml'].includes(ext))return 'text';
 throw Error('PROJECT_PATH_DENIED');
};

/** Host-published files only. IDs never grant access beyond the current Project roots. */
export async function createGeneratedFiles(options:{stateRoot:string;sessionId:string;roots:string[]}){
 const state=await realpath(options.stateRoot);
 const index=join(state,`generated-${z.string().uuid().parse(options.sessionId)}.json`);
 const roots=new Set(await Promise.all(options.roots.map(p=>realpath(p))));
 let saved:Entry[]=[];
 try{const info=await lstat(index);if(!info.isFile()||info.isSymbolicLink()||info.size>256000)throw Error('INVALID_PROJECT_STATE');saved=entries.parse(JSON.parse(await readFile(index,'utf8')));}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw Error('INVALID_PROJECT_STATE');}
 async function checked(record:Entry){
  if(!roots.has(record.root)||isAbsolute(record.path)||/[\\:%?#\x00-\x1f]/.test(record.path)||record.path.split('/').some(p=>!p||p==='..'||p.startsWith('.')))throw Error('PROJECT_PATH_DENIED');
  const path=join(record.root,record.path),rel=relative(record.root,path);
  if(!rel||rel.startsWith('..')||isAbsolute(rel)||await realpath(path)!==path)throw Error('PROJECT_PATH_DENIED');
  if(!(await lstat(path)).isFile()||fileKind(path)!==record.kind)throw Error('PROJECT_PATH_DENIED');
  return path;
 }
 const publicEntry=({id,path,title,kind,createdAt}:Entry)=>({id,path,title,kind,createdAt});
 return {
  async remember(path:string,root:string,title=basename(path)){
   const canonical=await realpath(root);if(!roots.has(canonical))throw Error('PROJECT_PATH_DENIED');
   const localPath=relative(root,path);
   const existing=saved.find(f=>f.root===canonical&&f.path===localPath);
   const record=entry.parse({id:existing?.id??randomUUID(),root:canonical,path:localPath,kind:fileKind(path),title:title.slice(0,160),createdAt:new Date().toISOString()});
   await checked(record);const next=[...saved.filter(f=>f.id!==record.id),record].slice(-100);
   const temporary=index+'.'+randomUUID()+'.tmp';await writeFile(temporary,JSON.stringify(next),{flag:'wx',mode:0o600});await rename(temporary,index);saved=next;
   return publicEntry(record);
  },
  async list(filter?:z.infer<typeof kind>){
   const result=[];
   for(const record of [...saved].reverse()){
    if(!roots.has(record.root)||(filter&&record.kind!==filter))continue;
    try{await checked(record);result.push(publicEntry(record));}catch{/* Missing, moved or changed-to-symlink files never become usable capabilities. */}
   }
   return result;
  },
  async resolve(id:string){const record=saved.find(f=>f.id===id);if(!record)throw Error('ARTIFACT_NOT_FOUND');return {...publicEntry(record),absolutePath:await checked(record),root:record.root};},
 };
}
