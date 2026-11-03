'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowUp, Check, ChevronDown, Paperclip, Plus, Settings2, Square, Upload, X } from 'lucide-react';
import { PromptInput, PromptInputTextarea, PromptInputActions } from '@/components/prompt-kit/prompt-input';
import { FileUpload, FileUploadTrigger, FileUploadContent } from '@/components/prompt-kit/file-upload';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import type {NativeCatalog,NativeSelection} from '@/lib/native-models';
import {chatCommands} from '@/lib/chat-commands';
import type { ChatProvider } from '@/lib/chat-prototype';
import type { ChatFileRef } from '@/lib/workspace-files';
import { workspaceFiles } from '@/services/workspace-files';

type Props = {
  catalog?:NativeCatalog;selection?:NativeSelection;onSelectModel?:(selection:NativeSelection)=>void;
  threadId: string; projectId?:string;
  value: string; onChange: (value: string) => void; onSend: (files: string[],localFiles?:ChatFileRef[]) => boolean | Promise<boolean>;
  pending: boolean; busy: boolean; disabled: boolean; onStop: () => void;
  providers: ChatProvider[]; selected: string; onSelect: (id: string) => void; onSettings: () => void;
};
export function ChatComposer(props: Props) {
  const composer=useRef<HTMLDivElement>(null);
  const submitting=useRef(false);
  const focusedThread=useRef<string|undefined>(undefined);
  const importFocus=useRef<{threadId:string;origin:Element|null}|undefined>(undefined);
  useEffect(()=>{
    if(props.disabled||focusedThread.current===props.threadId)return;
    focusedThread.current=props.threadId;
    const frame=requestAnimationFrame(()=>composer.current?.querySelector('textarea')?.focus({preventScroll:true}));
    return()=>cancelAnimationFrame(frame);
  },[props.threadId,props.disabled]);
  const [draftFiles, setDraftFiles] = useState<Record<string, File[]>>({});
  const files = draftFiles[props.threadId] ?? [];
  const setFiles = (next: File[]) => setDraftFiles(previous => ({ ...previous, [props.threadId]: next }));
  const [error, setError] = useState('');
  const [importing,setImporting]=useState(false);
  useEffect(()=>{
    const request=importFocus.current;
    if(importing||!request)return;
    importFocus.current=undefined;
    if(props.disabled||request.threadId!==props.threadId)return;
    const frame=requestAnimationFrame(()=>{
      const active=document.activeElement;
      if(active===document.body||active===request.origin)composer.current?.querySelector('textarea')?.focus({preventScroll:true});
    });
    return()=>cancelAnimationFrame(frame);
  },[importing,props.threadId,props.disabled]);
  const [commandIndex,setCommandIndex]=useState(0);
  const [commandsHidden,setCommandsHidden]=useState(false);
  const commands=/^\/[^\s]*$/.test(props.value)&&!commandsHidden?chatCommands.filter(c=>c.command.startsWith(props.value.toLowerCase())):[];
  const activeCommand=Math.min(commandIndex,Math.max(0,commands.length-1));
  const availableModels=props.catalog?.providers.flatMap(p=>p.configured?p.models.filter(m=>m.enabled).map(m=>({...m,provider:p.id,providerName:p.name})):[])??[];
  const nativeSelected=availableModels.find(m=>m.id===props.selection?.model&&m.provider===props.selection?.provider);
  function chooseCommand(command:string){props.onChange(command+' ');setCommandsHidden(false);composer.current?.querySelector('textarea')?.focus();}
  const selected = props.providers.find(p => p.id === props.selected);
  function addFiles(incoming: File[]) {
    const valid = incoming.filter(f => f.size <= 25 * 1024 * 1024 && /\.(mp4|m4v|webm|mp3|m4a|wav|ogg|png|jpg|jpeg|webp|gif|avif|txt|md|json|html|css|js|ts|tsx|py|yaml|yml|csv|svg)$/i.test(f.name));
    const next = [...files, ...valid];
    setFiles(next.slice(0, 10));
    setError(valid.length !== incoming.length ? 'รองรับภาพ วิดีโอ เสียง และไฟล์ข้อความ ไฟล์ละไม่เกิน 25 MB' : next.length > 10 ? 'แนบได้ครั้งละ 10 ไฟล์' : '');
  }
  async function submit() {
    if(submitting.current||importing||props.pending||props.busy||props.disabled||(!props.value.trim()&&!files.length))return;
    submitting.current=true;
    const threadId=props.threadId,origin=document.activeElement;
    const restore=!!origin&&!!composer.current?.contains(origin);
    setImporting(true);
    try{
      const localFiles:ChatFileRef[]=[];
      if(files.length&&window.meStudioFiles?.storeChatFile){
        for(const file of files)localFiles.push(await workspaceFiles().storeChatFile!({name:file.name,data:await file.arrayBuffer(),projectId:props.projectId}));
      }
      if (await props.onSend(files.map(f => f.name.slice(0, 250)),localFiles)) { setFiles([]); setError(''); }
    }catch{setError('แนบไฟล์ไม่สำเร็จ ไฟล์เดิมยังอยู่ กรุณาลองอีกครั้ง');}finally{
      submitting.current=false;
      if(restore)importFocus.current={threadId,origin};
      setImporting(false);
    }
  }
  return <FileUpload onFilesAdded={addFiles} accept="image/*,video/*,audio/*,.txt,.md,.json,.html,.css,.js,.ts,.tsx,.py,.yaml,.yml,.csv,.svg" disabled={props.disabled||importing}>
    <PromptInput ref={composer} data-thread-id={props.threadId} value={props.value} onValueChange={value=>{setCommandsHidden(false);setCommandIndex(0);props.onChange(value);}} onKeyDownCapture={e=>{if(!commands.length||e.nativeEvent.isComposing||e.keyCode===229)return;if(e.key==='Escape'){e.preventDefault();e.stopPropagation();setCommandsHidden(true);}if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();e.stopPropagation();setCommandIndex(i=>(i+(e.key==='ArrowDown'?1:-1)+commands.length)%commands.length);}if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();e.stopPropagation();if(!e.repeat)chooseCommand(commands[activeCommand].command);}}} onSubmit={()=>void submit()} disabled={props.disabled||importing} className="chat-composer" maxHeight={180}>
      {!!commands.length&&<div className="composer-commands" role="listbox" aria-label="คำสั่งในแชต">{commands.map((item,i)=><button type="button" role="option" aria-selected={i===activeCommand} key={item.command} onMouseEnter={()=>setCommandIndex(i)} onClick={()=>chooseCommand(item.command)}><code>{item.command}</code><span>{item.label}<small>{item.description}</small></span></button>)}</div>}
      {!!files.length && <div className="composer-files" aria-label="ไฟล์ที่แนบในร่าง">{files.map((file, index) => <DraftAttachment file={file} key={`${file.name}-${file.lastModified}-${index}`} disabled={importing} onRemove={()=>setFiles(files.filter((_,i)=>i!==index))}/>)}</div>}
      {error && <p className="composer-error" role="alert">{error}</p>}
      {importing&&<span className="sr-only" role="status">{files.length?'กำลังแนบไฟล์…':'กำลังส่งข้อความ…'}</span>}
      <PromptInputTextarea aria-label="ข้อความถึงผู้ช่วย" placeholder="อยากสร้างอะไรวันนี้?" maxLength={8000} onPaste={event=>{const pasted=Array.from(event.clipboardData.files);if(pasted.length){event.preventDefault();addFiles(pasted);}}}/>
      <PromptInputActions className="composer-actions">
        <FileUploadTrigger asChild><button className="chat-icon" aria-label="แนบไฟล์" title="แนบภาพ วิดีโอ หรือเสียง" disabled={props.disabled}><Plus size={21} strokeWidth={1.6} /></button></FileUploadTrigger>
        <div className="composer-spacer" />
        <DropdownMenu>
          <DropdownMenuTrigger render={<button className="model-picker" aria-label="เลือกโมเดล" disabled={props.disabled} />}>
            <span>{props.catalog?(nativeSelected?.label||'เลือกโมเดล'):selected?.modelLabel || selected?.modelId || 'เลือกโมเดล'}</span><ChevronDown size={14} />
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="end" className="chat-menu model-menu">
            {props.catalog?availableModels.map(m=><DropdownMenuItem key={`${m.provider}:${m.id}`} onClick={()=>props.onSelectModel?.({provider:m.provider,model:m.id})}><span className="model-item"><span>{m.label}</span><small>{m.providerName}</small></span>{nativeSelected===m&&<Check size={15}/>}</DropdownMenuItem>):props.providers.map(p => <DropdownMenuItem key={p.id} onClick={() => props.onSelect(p.id)}><span className="model-item"><span>{p.name}</span><small>{p.modelLabel || p.modelId || 'ยังไม่เลือกโมเดล'}</small></span>{p.id === props.selected && <Check size={15} />}</DropdownMenuItem>)}
            <DropdownMenuSeparator /><DropdownMenuItem onClick={props.onSettings}><Settings2 size={16} />{props.catalog?'จัดการโมเดล':'ตั้งค่าผู้ให้บริการ'}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        {props.pending ? <button className="composer-send" aria-label="หยุดตอบ" onClick={props.onStop}><Square size={13} fill="currentColor" /></button> : <button className="composer-send" aria-label="ส่งข้อความ" onClick={()=>void submit()} disabled={props.disabled || props.busy || importing || (!props.value.trim() && !files.length)}><ArrowUp size={20} strokeWidth={1.8} /></button>}
      </PromptInputActions>
    </PromptInput>
    <FileUploadContent className="chat-drop"><div><Upload size={30} strokeWidth={1.4} /><strong>วางไฟล์เพื่อแนบในแชต</strong><span>ภาพ วิดีโอ หรือเสียง · ไม่เกิน 25 MB ต่อไฟล์</span></div></FileUploadContent>
  </FileUpload>;
}
function DraftAttachment({file,onRemove,disabled}:{file:File;onRemove:()=>void;disabled:boolean}){
  const [preview,setPreview]=useState('');
  const image=file.type.startsWith('image/')&&!/\.svg$/i.test(file.name);
  useEffect(()=>{
    if(!image)return;
    const url=URL.createObjectURL(file);let active=true;
    queueMicrotask(()=>{if(active)setPreview(url);});
    return()=>{active=false;URL.revokeObjectURL(url);};
  },[file,image]);
  return <div className={`composer-file ${image?'composer-image':''}`} title={file.name}>
    {image?<DraftImage src={preview} name={file.name}/>:<><Paperclip size={14}/><span>{file.name}</span></>}
    <button type="button" aria-label={`นำ ${file.name} ออก`} disabled={disabled} onClick={onRemove}><X size={13}/></button>
  </div>;
}
function DraftImage({src,name}:{src:string;name:string}){
  if(!src)return <span className="composer-image-loading" aria-label={`กำลังโหลดภาพ ${name}`}/>;
  // The browser owns and revokes these temporary local-file URLs.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={`ภาพแนบ ${name}`}/>;
}
