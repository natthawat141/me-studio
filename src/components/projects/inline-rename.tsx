"use client";
import { useRef, useState } from 'react';
import { Pencil } from 'lucide-react';
import './inline-rename.css';

export function InlineRename({value,onSave,disabled=false}:{value:string;onSave:(value:string)=>boolean|void|Promise<boolean|void>;disabled?:boolean}) {
  const [editing,setEditing]=useState(false);
  const [draft,setDraft]=useState(value);
  const [error,setError]=useState('');
  const [saving,setSaving]=useState(false);
  const finished=useRef(false);
  const button=useRef<HTMLButtonElement>(null);
  function close(restoreFocus:boolean) {
    finished.current=true;
    setEditing(false);
    setError('');
    if(restoreFocus) requestAnimationFrame(()=>button.current?.focus());
  }
  async function commit(restoreFocus:boolean) {
    if(finished.current) return;
    const title=draft.trim();
    if(!title) {
      if(!restoreFocus) close(false);
      else setError('กรุณาใส่ชื่อโปรเจกต์');
      return;
    }
    if(title===value) { close(restoreFocus); return; }
    finished.current=true;
    setSaving(true);
    try {
      const saved=await onSave(title);
      if(saved===false) throw new Error('Rename failed');
      close(restoreFocus);
    } catch {
      finished.current=false;
      setError('บันทึกชื่อไม่สำเร็จ ลองอีกครั้ง');
    } finally { setSaving(false); }
  }
  return <div className="inline-rename">
    {editing ? <input
      className="inline-rename-input" aria-label="ชื่อโปรเจกต์" aria-invalid={Boolean(error)}
      autoFocus maxLength={100} value={draft} readOnly={saving}
      onFocus={(event)=>event.currentTarget.select()}
      onChange={(event)=>{setDraft(event.target.value);setError('');}}
      onBlur={()=>void commit(false)}
      onKeyDown={(event)=>{
        if(event.nativeEvent.isComposing) return;
        if(event.key==='Enter') {event.preventDefault();void commit(true);}
        if(event.key==='Escape' && !saving) {event.preventDefault();close(true);}
      }}
    /> : <button ref={button} type="button" className="inline-rename-trigger" disabled={disabled}
      aria-label={`เปลี่ยนชื่อ ${value}`} title="คลิกเพื่อเปลี่ยนชื่อ"
      onClick={()=>{finished.current=false;setDraft(value);setError('');setEditing(true);}}>
      <span>{value}</span><Pencil size={13} aria-hidden="true" />
    </button>}
    {error && <span className="inline-rename-error" role="alert">{error}</span>}
  </div>;
}
