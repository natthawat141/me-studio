import {constants} from 'node:fs';
import {open,realpath,stat,unlink} from 'node:fs/promises';
import {basename,dirname,extname,join} from 'node:path';

/** Host-resolved source and destination only. Never overwrites an existing file. */
export async function copyFileExclusive(source:string,destination:string){
 if(await realpath(source)!==source)throw Error('FILE_OUTSIDE_FOLDER');
 const parent=await realpath(dirname(destination));
 if(parent!==dirname(destination))throw Error('EXPORT_PATH_DENIED');
 const input=await open(source,constants.O_RDONLY|constants.O_NOFOLLOW);
 let output:Awaited<ReturnType<typeof open>>|undefined;
 try{
  const info=await input.stat();if(!info.isFile()||info.size===0||info.size>500*1024*1024)throw Error('FILE_TOO_LARGE');
  output=await open(destination,'wx',0o600);
  try{
   const buffer=Buffer.alloc(Math.min(info.size,1024*1024));let position=0;
   while(position<info.size){
    const {bytesRead}=await input.read(buffer,0,Math.min(buffer.length,info.size-position),position);
    if(!bytesRead)throw Error('EXPORT_SOURCE_CHANGED');
    await output.writeFile(buffer.subarray(0,bytesRead));position+=bytesRead;
   }
   await output.sync();
  }
  catch(error){await output.close();output=undefined;await unlink(destination).catch(()=>{});throw error;}
 }finally{await input.close();await output?.close();}
 return destination;
}

export async function copyToExportDirectory(source:string,directory:string,name=basename(source)){
 if(!name||name!==basename(name)||name.startsWith('.')||/[\\/:%?\x00-\x1f]/.test(name)||name.length>200||extname(name).toLowerCase()!==extname(source).toLowerCase())throw Error('EXPORT_PATH_DENIED');
 const root=await realpath(directory);if(!(await stat(root)).isDirectory())throw Error('EXPORT_PATH_DENIED');
 const ext=extname(name),stem=name.slice(0,-ext.length);
 for(let suffix=0;suffix<100;suffix++){
  const path=join(root,suffix?`${stem} (${suffix+1})${ext}`:name);
  try{return await copyFileExclusive(source,path);}catch(error){if((error as NodeJS.ErrnoException).code!=='EEXIST')throw error;}
 }
 throw Error('EXPORT_NAME_LIMIT');
}
