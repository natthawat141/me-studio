'use client';

import { useState } from 'react';
import { ArrowUp, Check, ChevronDown, Paperclip, Plus, Settings2, Square, Upload, X } from 'lucide-react';
import { PromptInput, PromptInputTextarea, PromptInputActions } from '@/components/prompt-kit/prompt-input';
import { FileUpload, FileUploadTrigger, FileUploadContent } from '@/components/prompt-kit/file-upload';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import type { ChatProvider } from '@/lib/chat-prototype';

type Props = {
  threadId: string; live?:boolean;
  value: string; onChange: (value: string) => void; onSend: (files: string[]) => boolean;
  pending: boolean; busy: boolean; disabled: boolean; onStop: () => void;
  providers: ChatProvider[]; selected: string; onSelect: (id: string) => void; onSettings: () => void;
};
export function ChatComposer(props: Props) {
  const [draftFiles, setDraftFiles] = useState<Record<string, File[]>>({});
  const files = draftFiles[props.threadId] ?? [];
  const setFiles = (next: File[]) => setDraftFiles(previous => ({ ...previous, [props.threadId]: next }));
  const [error, setError] = useState('');
  const selected = props.providers.find(p => p.id === props.selected);
  function addFiles(incoming: File[]) {
    const valid = incoming.filter(f => f.size <= 25 * 1024 * 1024 && /^(image|video|audio)\//.test(f.type));
    const next = [...files, ...valid];
    setFiles(next.slice(0, 10));
    setError(valid.length !== incoming.length ? 'รองรับภาพ วิดีโอ และเสียง ไฟล์ละไม่เกิน 25 MB' : next.length > 10 ? 'แนบได้ครั้งละ 10 ไฟล์' : '');
  }
  function submit() {
    if (props.onSend(files.map(f => f.name.slice(0, 250)))) { setFiles([]); setError(''); }
  }
  return <FileUpload onFilesAdded={addFiles} accept="image/*,video/*,audio/*" disabled={props.disabled}>
    <PromptInput value={props.value} onValueChange={props.onChange} onSubmit={submit} disabled={props.disabled} className="chat-composer" maxHeight={180}>
      {!!files.length && <div className="composer-files">{files.map((file, index) => <span className="composer-file" key={`${file.name}-${index}`}><Paperclip size={14} /><span>{file.name}</span><button aria-label={`นำ ${file.name} ออก`} onClick={() => setFiles(files.filter((_, i) => i !== index))}><X size={13} /></button></span>)}</div>}
      <PromptInputTextarea aria-label="ข้อความถึงผู้ช่วย" placeholder="อยากสร้างอะไรวันนี้?" maxLength={8000} />
      <PromptInputActions className="composer-actions">
        <FileUploadTrigger asChild><button className="chat-icon" aria-label="แนบไฟล์" title="แนบภาพ วิดีโอ หรือเสียง" disabled={props.disabled}><Plus size={21} strokeWidth={1.6} /></button></FileUploadTrigger>
        <div className="composer-spacer" />
        <DropdownMenu>
          <DropdownMenuTrigger render={<button className="model-picker" aria-label="เลือกโมเดล" disabled={props.disabled} />}>
            <span>{selected?.modelLabel || selected?.modelId || 'เลือกโมเดล'}</span><ChevronDown size={14} />
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="end" className="chat-menu model-menu">
            {props.providers.map(p => <DropdownMenuItem key={p.id} onClick={() => props.onSelect(p.id)}><span className="model-item"><span>{p.name}</span><small>{p.modelLabel || p.modelId || 'ยังไม่เลือกโมเดล'}</small></span>{p.id === props.selected && <Check size={15} />}</DropdownMenuItem>)}
            <DropdownMenuSeparator /><DropdownMenuItem onClick={props.onSettings}><Settings2 size={16} />ตั้งค่าผู้ให้บริการ</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        {props.pending ? <button className="composer-send" aria-label="หยุดตอบ" onClick={props.onStop}><Square size={13} fill="currentColor" /></button> : <button className="composer-send" aria-label="ส่งข้อความ" onClick={submit} disabled={props.disabled || props.busy || (!props.value.trim() && !files.length)}><ArrowUp size={20} strokeWidth={1.8} /></button>}
      </PromptInputActions>
    </PromptInput>
    {error && <p className="composer-error" role="alert">{error}</p>}
    <p className="composer-note">{props.live?'GPT-6 Luna · สร้าง HTML และ MP4 ใน Project · อาจมีค่าใช้จ่าย API':'ต้นแบบหน้าจอ · คำตอบและผลงานเป็นตัวอย่าง ยังไม่เรียกใช้ AI'}</p>
    <FileUploadContent className="chat-drop"><div><Upload size={30} strokeWidth={1.4} /><strong>วางไฟล์เพื่อแนบในแชต</strong><span>ภาพ วิดีโอ หรือเสียง · ไม่เกิน 25 MB ต่อไฟล์</span></div></FileUploadContent>
  </FileUpload>;
}
