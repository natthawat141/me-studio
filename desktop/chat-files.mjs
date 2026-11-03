import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile, rename, realpath, stat } from 'node:fs/promises';
import { join, basename, extname, relative, isAbsolute } from 'node:path';
import { z } from 'zod';
import { WorkspaceFiles } from './workspace-files.mjs';

const recordSchema=z.object({id:z.string().uuid(),projectId:z.string().uuid().optional(),path:z.string(),root:z.string(),name:z.string(),relativePath:z.string(),kind:z.enum(['video','audio','image','text'])}).strict();
const supported=/\.(mp4|m4v|webm|mp3|m4a|wav|ogg|png|jpg|jpeg|webp|gif|avif|txt|md|json|html|css|js|ts|tsx|py|yaml|yml|csv|svg)$/i;
const scopeSchema=z.object({id:z.string().uuid(),projectId:z.string().uuid().optional()}).strict();
export class ChatFiles {
  #data; #queue=Promise.resolve(); #services=new Map(); #previews=new Map();
  constructor(data){this.#data=data;}
  async #records(){try{return z.array(recordSchema).parse(JSON.parse(await readFile(join(this.#data,'chat-files.json'),'utf8')));}catch(e){if(e.code==='ENOENT')return [];throw Error('CHAT_FILE_INDEX_UNREADABLE');}}
  #dto(item){const {id,projectId,name,relativePath,kind}=item;return {id,projectId,name,relativePath,kind};}
  async register(path,root,projectId){
    const operation=this.#queue.catch(()=>{}).then(async()=>{
      if(projectId!==undefined)z.string().uuid().parse(projectId);
      const resolved=await realpath(path),base=await realpath(root),rel=relative(base,resolved);
      if(rel==='..'||rel.startsWith('../')||isAbsolute(rel)||!supported.test(resolved)||basename(resolved).startsWith('.')||!(await stat(resolved)).isFile())throw Error('INVALID_FILE');
      const records=await this.#records(),existing=records.find(r=>r.path===resolved&&r.projectId===projectId);
      if(existing)return this.#dto(existing);
      if(records.length>=10000)throw Error('FOLDER_LIMIT');
      const item=recordSchema.parse({id:randomUUID(),projectId,path:resolved,root:base,name:basename(resolved),relativePath:rel,kind:kind(resolved)});
      await mkdir(this.#data,{recursive:true});await writeFile(join(this.#data,'chat-files.json.tmp'),JSON.stringify([...records,item]),{mode:0o600});await rename(join(this.#data,'chat-files.json.tmp'),join(this.#data,'chat-files.json'));
      return this.#dto(item);
    });this.#queue=operation;return operation;
  }
  async store(input){
    if(typeof input?.name!=='string'||input.name.length>250||basename(input.name)!==input.name||input.name.startsWith('.')||!supported.test(input.name)||!(input.data instanceof ArrayBuffer)||input.data.byteLength===0||input.data.byteLength>25*1024*1024)throw Error('INVALID_FILE');
    if(input.projectId!==undefined)z.string().uuid().parse(input.projectId);
    const directory=join(this.#data,'chat-attachments',randomUUID());await mkdir(directory,{recursive:true,mode:0o700});
    const path=join(directory,input.name);await writeFile(path,new Uint8Array(input.data),{flag:'wx',mode:0o600});
    return this.register(path,directory,input.projectId);
  }
  async preview(input){
    const v=scopeSchema.parse(input),item=(await this.#records()).find(r=>r.id===v.id&&r.projectId===v.projectId);
    if(!item)throw Error('INVALID_FILE');
    // An ID cannot be redirected by replacing the original with a symlink.
    if(await realpath(item.path)!==item.path)throw Error('FILE_OUTSIDE_FOLDER');
    let service=this.#previews.get(item.id);
    if(!service){service=new WorkspaceFiles();this.#previews.set(item.id,service);}
    const preview=await service.grantFile(item.path,item.root);
    if(preview.src)this.#services.set(new URL(preview.src).hostname,{service,path:item.path});
    return {...preview,entry:{...preview.entry,name:item.name,relativePath:item.relativePath}};
  }
  async agentInputs(input,projectId,transformImage){
    const refs=z.array(z.object({id:z.string().uuid()}).strict()).max(10).parse(input);
    if(projectId!==undefined)z.string().uuid().parse(projectId);
    const records=await this.#records(),media=[];let textBudget=30000,imageCount=0;
    for(const ref of refs){
      const item=records.find(r=>r.id===ref.id&&r.projectId===projectId);if(!item)throw Error('INVALID_FILE');
      const path=await realpath(item.path),root=await realpath(item.root),rel=relative(root,path);
      if(path!==item.path||rel==='..'||rel.startsWith('../')||isAbsolute(rel))throw Error('FILE_OUTSIDE_FOLDER');
      const info=await stat(path);if(!info.isFile()||info.size>25*1024*1024)throw Error('FILE_TOO_LARGE');
      if(item.kind==='image'){
        if(++imageCount>6)throw Error('ATTACHMENT_LIMIT');
        const dataUrl=await transformImage(await readFile(path));
        if(typeof dataUrl!=='string'||dataUrl.length>360000||!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(dataUrl))throw Error('INVALID_IMAGE');
        media.push({kind:'image',name:item.name,dataUrl});
      }else if(item.kind==='text'){
        if(info.size>65536)throw Error('FILE_TOO_LARGE');const text=await readFile(path,'utf8');textBudget-=text.length;if(textBudget<0)throw Error('ATTACHMENT_LIMIT');media.push({kind:'text',name:item.name,text});
      }else media.push({kind:'unsupported',name:item.name,mediaType:item.kind});
    }
    return media;
  }
  owns(id){return this.#services.has(id);}
  async serve(request){
    const grant=this.#services.get(new URL(request.url).hostname);if(!grant)return new Response(null,{status:404});
    try{if(await realpath(grant.path)!==grant.path)return new Response(null,{status:404});return grant.service.serve(request);}catch{return new Response(null,{status:404});}
  }
}
function kind(path){const ext=extname(path).toLowerCase();if(['.mp4','.m4v','.webm'].includes(ext))return 'video';if(['.mp3','.m4a','.wav','.ogg'].includes(ext))return 'audio';if(['.png','.jpg','.jpeg','.webp','.gif','.avif'].includes(ext))return 'image';return 'text';}
