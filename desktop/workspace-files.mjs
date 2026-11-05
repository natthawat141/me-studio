import { randomUUID } from 'node:crypto';
import { opendir,realpath,stat,open } from 'node:fs/promises';
import { basename,extname,join,relative,isAbsolute } from 'node:path';
import { Readable } from 'node:stream';
const media={'.mp4':['video','video/mp4'],'.m4v':['video','video/mp4'],'.webm':['video','video/webm'],'.mp3':['audio','audio/mpeg'],'.m4a':['audio','audio/mp4'],'.wav':['audio','audio/wav'],'.ogg':['audio','audio/ogg'],'.png':['image','image/png'],'.jpg':['image','image/jpeg'],'.jpeg':['image','image/jpeg'],'.webp':['image','image/webp'],'.gif':['image','image/gif'],'.avif':['image','image/avif']};
const text=new Set(['.txt','.md','.json','.html','.css','.js','.ts','.tsx','.py','.yaml','.yml','.csv','.svg']);
function kind(path){const ext=extname(path).toLowerCase();return media[ext]?.[0]??(text.has(ext)?'text':'unsupported');}
export class WorkspaceFiles {
  constructor(compileHtml){this.compileHtml=compileHtml;}
  #root; #entries=new Map(); #paths=new Map();
  // Host-only capability for an explicitly selected or generated single file.
  async grantFile(path,root){
    this.#root=await realpath(root);
    const resolved=await realpath(path),rel=relative(this.#root,resolved);
    if(rel==='..'||rel.startsWith('../')||isAbsolute(rel))throw Error('FILE_OUTSIDE_FOLDER');
    return this.preview(this.#add(resolved,false).id);
  }
  #add(path,directory){
    const existing=this.#paths.get(path); if(existing)return this.#entries.get(existing).entry;
    if(this.#entries.size>=10_000)throw new Error('FOLDER_LIMIT');
    const entry={id:randomUUID(),name:basename(path),relativePath:relative(this.#root,path),kind:directory?'directory':'file',previewKind:directory?'unsupported':kind(path)};
    this.#paths.set(path,entry.id); this.#entries.set(entry.id,{entry,path});return entry;
  }
  async #resolve(id){
    const value=this.#entries.get(id);if(!value||!this.#root)throw new Error('INVALID_FILE');
    const path=await realpath(value.path); const rel=relative(this.#root,path);
    if(rel==='..'||rel.startsWith('../')||isAbsolute(rel))throw new Error('FILE_OUTSIDE_FOLDER');
    return {...value,path,info:await stat(path)};
  }
  async openRoot(path){
    const root=await realpath(path);if(!(await stat(root)).isDirectory())throw new Error('INVALID_FOLDER');
    this.#root=root;this.#entries.clear();this.#paths.clear();return this.list(this.#add(root,true).id);
  }
  async list(id){
    const value=await this.#resolve(id);if(!value.info.isDirectory())throw new Error('INVALID_FOLDER');
    const entries=[];let truncated=false;
    for await(const item of await opendir(value.path)){
      if(item.name.startsWith('.')||item.isSymbolicLink()||(!item.isDirectory()&&!item.isFile()))continue;
      if(entries.length===500){truncated=true;break;}
      entries.push(this.#add(join(value.path,item.name),item.isDirectory()));
    }
    entries.sort((a,b)=>(a.kind===b.kind?0:a.kind==='directory'?-1:1)||a.name.localeCompare(b.name));
    return {directory:value.entry,entries,truncated};
  }
  async preview(id){
    const value=await this.#resolve(id);if(!value.info.isFile())throw new Error('INVALID_FILE');
    /** @type {import('../src/lib/workspace-files').WorkspacePreview} */
    const result={entry:value.entry,kind:kind(value.path),bytes:value.info.size};
    if(result.kind==='text'){
      if(value.info.size>256*1024)throw new Error('FILE_TOO_LARGE');
      const file=await open(value.path,'r');try {const buffer=Buffer.alloc(256*1024+1);const {bytesRead}=await file.read(buffer,0,buffer.length,0);if(bytesRead>256*1024)throw new Error('FILE_TOO_LARGE');result.text=buffer.subarray(0,bytesRead).toString('utf8');}finally{await file.close();}
      if(/\.html?$/i.test(value.path)&&this.compileHtml){try{const preview=await this.compileHtml(value.path,this.#root);result.previewSrc=preview.src;result.previewWidth=preview.width;result.previewHeight=preview.height;}catch(e){result.previewError=/^(HTML_|PROJECT_PATH_)/.test(e.message)?e.message:'HTML_PREVIEW_FAILED';}}
    }else if(result.kind!=='unsupported')result.src=`studio-file://${id}/${encodeURIComponent(value.entry.name)}`;
    return result;
  }
  // Host-only: resolve an opaque grant again immediately before the OS action.
  async pathForReveal(id){
    const original=this.#entries.get(id);if(!original)throw Error('INVALID_FILE');
    const value=await this.#resolve(id);
    if(value.path!==original.path)throw Error('FILE_OUTSIDE_FOLDER');
    if(!value.info.isFile())throw Error('INVALID_FILE');
    return value.path;
  }
  async serve(request){
    let value;try{const url=new URL(request.url);if(url.protocol!=='studio-file:')throw new Error();value=await this.#resolve(url.hostname);}catch{return new Response(null,{status:404});}
    const type=media[extname(value.path).toLowerCase()];if(!type||!value.info.isFile())return new Response(null,{status:404});
    if(!['GET','HEAD'].includes(request.method))return new Response(null,{status:405});
    const size=value.info.size,headers={'Content-Type':type[1],'Accept-Ranges':'bytes','Cache-Control':'no-store','Access-Control-Allow-Origin':'http://127.0.0.1:18147','X-Content-Type-Options':'nosniff'};
    let start=0,end=size-1,status=200;const range=request.headers.get('range');
    if(range){
      const match=/^bytes=(\d*)-(\d*)$/.exec(range);
      if(!match||(!match[1]&&!match[2]))return new Response(null,{status:416,headers:{...headers,'Content-Range':`bytes */${size}`}});
      start=match[1]?Number(match[1]):Math.max(0,size-Number(match[2]));end=match[1]&&match[2]?Math.min(Number(match[2]),size-1):size-1;
      if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||start>end||start>=size)return new Response(null,{status:416,headers:{...headers,'Content-Range':`bytes */${size}`}});
      status=206;headers['Content-Range']=`bytes ${start}-${end}/${size}`;
    }
    headers['Content-Length']=String(Math.max(0,end-start+1));
    if(request.method==='HEAD'||size===0)return new Response(null,{status,headers});
    try {
      const file=await open(value.path,'r');const stream=file.createReadStream({start,end,autoClose:true});
      request.signal.addEventListener('abort',()=>stream.destroy(),{once:true});stream.once('close',()=>file.close().catch(()=>{}));
      return new Response(Readable.toWeb(stream),{status,headers});
    }catch{return new Response(null,{status:404});}
  }
}
