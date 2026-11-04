import {createHash,randomUUID} from 'node:crypto';
import {mkdir,readFile,writeFile,readdir,realpath,lstat,rename,rm} from 'node:fs/promises';
import {join,relative,isAbsolute,resolve,dirname,basename} from 'node:path';
import {z} from 'zod';
import {runTool} from '../../../scripts/local/tools.mjs';
export type VisualAsset={id:string;name:string;src:string};
export type PreviewAsset={bytes:Buffer;mime:string};
const assetSchema=z.object({id:z.string().regex(/^asset-[a-f0-9]{64}\.(png|jpg|webp)$/),name:z.string().max(250),src:z.string().max(100)}).strict().refine(a=>a.src==='assets/'+a.id);
const allowedText=/\.(md|txt|html|css|json|csv|yaml|yml)$/i;
const imageExt=/\.(png|jpg|jpeg|webp|gif|avif)$/i;
const blocked=/^(?:\.|node_modules$|release$|dist$|build$|config\.env$|AGENTS\.md$|CLAUDE\.md$|GEMINI\.md$|package(?:-lock)?\.json$)/i;
export async function createProductionWorkspace(options:{source:string;storage:string;ffmpeg?:string;signal?:AbortSignal}){
 const source=await realpath(options.source);let storage=resolve(options.storage);await mkdir(storage,{recursive:true,mode:0o700});
 if((await lstat(storage)).isSymbolicLink())throw Error('PROJECT_PATH_DENIED');storage=await realpath(storage);
 const index=join(storage,'assets.json');let assets:VisualAsset[]=[];
 try{if(await realpath(index)!==index)throw Error('PROJECT_PATH_DENIED');if((await lstat(index)).size>12000)throw Error('ASSET_LIMIT');assets=z.array(assetSchema).max(20).parse(JSON.parse(await readFile(index,'utf8')));}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}
 async function checked(path:string,creating=false){
  if(typeof path!=='string'||path.length>400||isAbsolute(path)||/[\\:%?#\x00-\x1f]/.test(path))throw Error('PROJECT_PATH_DENIED');
  const parts=path?path.split('/'):[];if(parts.some(p=>!p||blocked.test(p)||p==='..'))throw Error('PROJECT_PATH_DENIED');
  let cursor=source;
  for(const [i,p] of parts.entries()){
   cursor=join(cursor,p);try{const info=await lstat(cursor);if(info.isSymbolicLink()||await realpath(cursor)!==cursor)throw Error('PROJECT_PATH_DENIED');}
   catch(e){if(!creating||(e as NodeJS.ErrnoException).code!=='ENOENT')throw e;if(i<parts.length-1)await mkdir(cursor,{mode:0o700});}
  }
  const rel=relative(source,cursor);if(rel==='..'||rel.startsWith('../')||isAbsolute(rel)||cursor===storage||cursor.startsWith(storage+'/'))throw Error('PROJECT_PATH_DENIED');
  options.signal?.throwIfAborted();return cursor;
 }
 async function assetBytes(asset:VisualAsset){
  const path=join(storage,asset.id);if(await realpath(path)!==path||(await lstat(path)).size>250000)throw Error('PROJECT_PATH_DENIED');
  const bytes=await readFile(path);if(!asset.id.includes(createHash('sha256').update(bytes).digest('hex')))throw Error('ASSET_CHANGED');return bytes;
 }
 async function register(name:string,bytes:Buffer,mime:string){
  if(bytes.length>250000||!['image/png','image/jpeg','image/webp'].includes(mime))throw Error('ASSET_LIMIT');
  const id='asset-'+createHash('sha256').update(bytes).digest('hex')+(mime==='image/png'?'.png':mime==='image/webp'?'.webp':'.jpg');
  const existing=assets.find(a=>a.id===id);if(existing){await assetBytes(existing);return existing;}
  if(assets.length>=20)throw Error('ASSET_LIMIT');
  const asset=assetSchema.parse({id,name,src:'assets/'+id});await writeFile(join(storage,id),bytes,{flag:'wx',mode:0o600});
  assets.push(asset);await writeFile(index+'.tmp',JSON.stringify(assets),{mode:0o600});await rename(index+'.tmp',index);return asset;
 }
 return {
  assets:()=>assets.map(a=>({...a})),
  async addReferences(refs:{name:string;dataUrl:string}[]){
   if(refs.length>6)throw Error('ASSET_LIMIT');
   for(const ref of refs){const match=/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/.exec(ref.dataUrl);if(!match)throw Error('INVALID_IMAGE');await register(ref.name,Buffer.from(match[2],'base64'),match[1]);}
  },
  async imageInputs(){const result:Record<string,PreviewAsset>={};for(const asset of assets)result[asset.src]={bytes:await assetBytes(asset),mime:asset.id.endsWith('.png')?'image/png':asset.id.endsWith('.webp')?'image/webp':'image/jpeg'};return result;},
  async list(path=''){
   const base=await checked(path);const entries=[];let truncated=false;
   for(const entry of await readdir(base,{withFileTypes:true})){
    if(blocked.test(entry.name)||entry.isSymbolicLink()||(!entry.isDirectory()&&!allowedText.test(entry.name)&&!imageExt.test(entry.name)))continue;
    const full=join(base,entry.name);if(full===storage||full.startsWith(storage+'/'))continue;
    if(entries.length>=100){truncated=true;break;}entries.push({name:entry.name,path:[path,entry.name].filter(Boolean).join('/'),kind:entry.isDirectory()?'directory':'file'});
   }return {entries,truncated};
  },
  async resolveFile(path:string){if(!/\.(md|txt|html|css|json|csv|yaml|yml|png|jpg|jpeg|webp|gif|avif|mp4|webm|mp3|wav|m4a)$/i.test(path))throw Error('PROJECT_PATH_DENIED');const file=await checked(path);if(!(await lstat(file)).isFile())throw Error('PROJECT_PATH_DENIED');return file;},
  async readText(path:string){if(!allowedText.test(path))throw Error('PROJECT_PATH_DENIED');const file=await checked(path);if(!(await lstat(file)).isFile()||(await lstat(file)).size>64000)throw Error('FILE_TOO_LARGE');return readFile(file,'utf8');},
  async writeText(path:string,text:string){
   if(!allowedText.test(path)||typeof text!=='string'||Buffer.byteLength(text)>64000)throw Error('PROJECT_PATH_DENIED');const file=await checked(path,true);
   // Registered image src values must remain usable when a draft is written as a Project HTML file.
   if(/\.html?$/i.test(path))for(const match of text.matchAll(/\bsrc\s*=\s*['"](assets\/asset-[a-f0-9]{64}\.(?:png|jpg|webp))['"]/g)){
    const asset=assets.find(a=>a.src===match[1]);if(!asset)throw Error('INVALID_IMAGE');
    const bytes=await assetBytes(asset),target=await checked([dirname(path)==='.'?'':dirname(path),asset.src].filter(Boolean).join('/'),true);
    try{const existing=await readFile(target);if(!existing.equals(bytes))throw Error('ASSET_CHANGED');}
    catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;await writeFile(target,bytes,{flag:'wx',mode:0o600});}
   }
   let prior:string|undefined;try{if((await lstat(file)).size>64000)throw Error('FILE_TOO_LARGE');prior=await readFile(file,'utf8');}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}
   if(prior!==undefined){const history=join(storage,'history');await mkdir(history,{recursive:true});if(await realpath(history)!==history)throw Error('PROJECT_PATH_DENIED');await writeFile(join(history,randomUUID()+'.json'),JSON.stringify({path,text:prior}),{flag:'wx',mode:0o600});}
   const temporary=join(dirname(file),'.me-studio-write-'+randomUUID());try{await writeFile(temporary,text,{flag:'wx',mode:0o600});await checked(path,true);await rename(temporary,file);}finally{await rm(temporary,{force:true});}return {written:true,path,previousVersionSaved:prior!==undefined};
  },
  async history(){try{return await Promise.all((await readdir(join(storage,'history'))).map(async name=>JSON.parse(await readFile(join(storage,'history',name),'utf8'))));}catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')return [];throw e;}},
  async importImage(path:string){
   if(!imageExt.test(path)||!options.ffmpeg)throw Error('INVALID_IMAGE');const file=await checked(path);if((await lstat(file)).size>25*1024*1024)throw Error('FILE_TOO_LARGE');
   const temp=join(storage,'normalize-'+randomUUID()+'.png');
   try{
    await runTool(options.ffmpeg,['-hide_banner','-loglevel','error','-protocol_whitelist','file,pipe','-i',file,'-frames:v','1','-vf','scale=1280:1280:force_original_aspect_ratio=decrease','-y',temp],{signal:options.signal});
    let bytes=await readFile(temp),mime='image/png';
    if(bytes.length>250000){const jpeg=temp+'.jpg';try{await runTool(options.ffmpeg,['-hide_banner','-loglevel','error','-i',temp,'-frames:v','1','-vf','scale=768:768:force_original_aspect_ratio=decrease','-q:v','5','-y',jpeg],{signal:options.signal});bytes=await readFile(jpeg);mime='image/jpeg';}finally{await rm(jpeg,{force:true});}}
    return await register(basename(path),bytes,mime);
   }finally{await rm(temp,{force:true});}
  },
 };
}
