import {readFile,realpath,lstat,mkdtemp,rm} from 'node:fs/promises';
import {join,dirname,relative,isAbsolute,resolve,extname} from 'node:path';
import {tmpdir} from 'node:os';
import {prepareHtmlPreview} from './html-authoring.mjs';
import type {PreviewAsset} from './project-workspace.mjs';
/** Host-only file resolver. Never accepts a renderer supplied root or absolute filename. */
export async function compileFilePreview(options:{path:string;root:string;browser:string;width?:number;height?:number;timeMs?:number;screenshot?:string}){
 const root=await realpath(options.root);
 async function checked(path:string,max:number){const rel=relative(root,path);if(rel==='..'||rel.startsWith('../')||isAbsolute(rel))throw Error('PROJECT_PATH_DENIED');let cursor=root;for(const part of rel.split('/')){cursor=join(cursor,part);if((await lstat(cursor)).isSymbolicLink())throw Error('PROJECT_PATH_DENIED');}if(await realpath(path)!==path||(await lstat(path)).size>max)throw Error('PROJECT_PATH_DENIED');return path;}
 const path=await checked(resolve(root,relative(resolve(options.root),resolve(options.path))),48000);if(!/\.html?$/i.test(path))throw Error('HTML_REQUIRED');
 const raw=await readFile(path,'utf8'),assets:Record<string,PreviewAsset>={};
 // Only explicit local raster src values are resolved; the compiler remains the DOM authority.
 for(const match of raw.matchAll(/\bsrc\s*=\s*["']([^"']+)["']/gi)){
  const name=match[1];if(name.startsWith('data:'))continue;
  if(!/^[a-zA-Z0-9_./ -]+$/.test(name)||name.split('/').some(p=>p==='..'||p.startsWith('.')))throw Error('HTML_EXTERNAL_RESOURCE');
  if(Object.keys(assets).length>=20)throw Error('ASSET_LIMIT');
  const mime=({'.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.gif':'image/gif','.avif':'image/avif'} as Record<string,string>)[extname(name).toLowerCase()];if(!mime)throw Error('HTML_EXTERNAL_RESOURCE');
  assets[name]={mime,bytes:await readFile(await checked(resolve(dirname(path),name),250000))};
 }
 let width=options.width??720,height=options.height??1280;
 if(!options.width&&!options.height&&/^design-\d+\.html$/.test(path.split('/').pop()||'')){try{const manifest=JSON.parse((await regularManifest()).toString());if(Number.isInteger(manifest.width)&&manifest.width>=320&&manifest.width<=1280&&Number.isInteger(manifest.height)&&manifest.height>=320&&manifest.height<=1280){width=manifest.width;height=manifest.height;}}catch{/* Unknown HTML keeps the bounded portrait viewport. */}}
 async function regularManifest(){return readFile(await checked(join(dirname(path),'project.json'),64000));}
 const temp=await mkdtemp(join(tmpdir(),'studio-html-preview-'));
 try{const html=await prepareHtmlPreview(raw,{browser:options.browser,width,height,timeMs:options.timeMs??0,path:options.screenshot??join(temp,'preview.png'),assets,inlineAssets:true});return {html,width,height};}
 finally{await rm(temp,{recursive:true,force:true});}
}
