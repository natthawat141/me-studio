'use client';
import { useEffect, useState } from 'react';
import { ArrowUpRight,File,FileImage,Film,Music } from 'lucide-react';
import type { ChatArtifact } from '@/lib/chat-prototype';
import type { ChatFileRef,WorkspacePreview } from '@/lib/workspace-files';
import { resolveChatFile,resolveVideoArtifact } from '@/services/workspace-files';

type OpenFile=(file:WorkspacePreview,trigger:HTMLButtonElement)=>void;
export function ChatLocalFile({file,onOpen,compact=false}:{file:ChatFileRef;onOpen:OpenFile;compact?:boolean}){
  const [preview,setPreview]=useState<WorkspacePreview>();
  const [error,setError]=useState('');
  useEffect(()=>{let active=true;void resolveChatFile(file).then(value=>{if(active)setPreview(value);}).catch(()=>{if(active)setError('เปิดไฟล์ไม่ได้ อาจถูกย้ายหรือลบ');});return()=>{active=false;};},[file.id,file.projectId,file]);
  const Icon=file.kind==='video'?Film:file.kind==='image'?FileImage:file.kind==='audio'?Music:File;
  return <div className={`chat-local-file ${compact?'is-compact':''}`}>
    {!compact&&preview?.src&&<InlineMedia kind={file.kind} src={preview.src} name={file.name} onError={()=>setError('เปิดสื่อไม่สำเร็จ')} onOpen={trigger=>onOpen(preview,trigger)}/>}
    <button className="chat-file-link" aria-label={`เปิดไฟล์ ${file.name}`} disabled={!preview} title={file.relativePath} onClick={e=>{if(preview)onOpen(preview,e.currentTarget);}}><Icon size={16} strokeWidth={1.3}/><span>{file.name}</span><ArrowUpRight size={14} strokeWidth={1.3}/></button>
    {error&&<small role="alert">{error}</small>}
  </div>;
}
export function ChatInlineArtifact({item,onOpen,onOpenFile}:{item:ChatArtifact;onOpen:(artifact:ChatArtifact,trigger:HTMLButtonElement)=>void;onOpenFile:OpenFile}){
  const [resolved,setResolved]=useState<ChatArtifact>(item);
  const [error,setError]=useState('');
  const [ready,setReady]=useState(!item.nativeProjectId);
  useEffect(()=>{let active=true;if(item.nativeProjectId){void resolveVideoArtifact(item.id,item.nativeProjectId).then(a=>{if(active){setResolved({...item,src:a.url,files:a.files??item.files});setReady(true);}}).catch(()=>{if(active)setError('เปิดผลงานไม่ได้ อาจถูกย้ายหรือลบ');});}return()=>{active=false;};},[item]);
  return <div className="chat-inline-artifact">
    {ready&&<InlineMedia kind={item.kind} src={resolved.src} name={item.title} onError={()=>setError('เปิดสื่อไม่สำเร็จ')} onOpen={trigger=>onOpen(resolved,trigger)}/>}
    <button className="chat-file-link" aria-label={`ดู${item.title}`} disabled={!ready} onClick={e=>onOpen(resolved,e.currentTarget)}>{item.kind==='video'?<Film size={16} strokeWidth={1.3}/>:<FileImage size={16} strokeWidth={1.3}/>}<span>{item.title}</span><ArrowUpRight size={14} strokeWidth={1.3}/></button>
    {error&&<small role="alert">{error}</small>}
    {!!resolved.files?.length&&<div className="chat-created-files" aria-label="ไฟล์ที่สร้าง">{resolved.files.map(file=><ChatLocalFile key={file.id} file={file} compact onOpen={onOpenFile}/>)}</div>}
  </div>;
}
function InlineMedia({kind,src,name,onError,onOpen}:{kind:string;src:string;name:string;onError:()=>void;onOpen:(trigger:HTMLButtonElement)=>void}){
  if(kind==='video')return <video className="chat-inline-video" controls controlsList="nodownload" playsInline preload="metadata" src={src} aria-label={name} onError={onError}/>;
  if(kind==='audio')return <audio controls controlsList="nodownload" preload="metadata" src={src} aria-label={name} onError={onError}/>;
  if(kind==='image')return <button className="chat-inline-image" aria-label={`ขยายภาพ ${name}`} onClick={e=>onOpen(e.currentTarget)}><LocalImage src={src} name={name} onError={onError}/></button>;
  return null;
}
function LocalImage({src,name,onError}:{src:string;name:string;onError:()=>void}){
  // Local capability URLs are streamed by Electron rather than Next's image optimizer.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={name} onError={onError}/>;
}
