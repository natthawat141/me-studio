'use client';

import { useState } from 'react';
import { ArrowLeft, ArrowUpRight, Check, ChevronRight, Info, Settings2, SlidersHorizontal, X } from 'lucide-react';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import type { ChatProvider, ChatPrototypeState } from '@/lib/chat-prototype';

type Category = 'general' | 'providers' | 'about';
const categories = [{ id: 'general', name: 'ทั่วไป', icon: SlidersHorizontal }, { id: 'providers', name: 'ผู้ให้บริการ AI', icon: Settings2 }, { id: 'about', name: 'เกี่ยวกับ', icon: Info }] as const;
type Props = {
  open: boolean; onOpenChange: (open: boolean) => void; initialCategory: Category;
  providers: ChatProvider[]; onSave: (provider: ChatProvider) => void;
  onConnectVideo?:()=>void; videoConnected?:boolean;
  preferences: ChatPrototypeState['preferences']; onPreferences: (patch: Partial<ChatPrototypeState['preferences']>) => void;
};
export function ChatSettings(props: Props) {
  return <Dialog open={props.open} onOpenChange={props.onOpenChange}>
    <DialogContent className="chat-settings-dialog" showCloseButton={false}>
      <DialogTitle className="sr-only">ตั้งค่า</DialogTitle><DialogDescription className="sr-only">ตั้งค่าหน้าตาแอปและผู้ให้บริการ AI</DialogDescription>
      <SettingsBody {...props} key={String(props.open) + props.initialCategory} />
      <DialogClose render={<button className="chat-icon settings-close" aria-label="ปิดการตั้งค่า" />}><X size={19} strokeWidth={1.6} /></DialogClose>
    </DialogContent>
  </Dialog>;
}
function SettingsBody(props: Props) {
  const [category, setCategory] = useState<Category>(props.initialCategory);
  const [editing, setEditing] = useState<ChatProvider>();
  const [saved, setSaved] = useState('');
  const [error, setError] = useState('');
  function save(e: React.FormEvent) {
    e.preventDefault(); if (!editing) return;
    const endpoint = editing.endpoint.trim();
    if (endpoint) { try { const url = new URL(endpoint); if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error(); } catch { setError('ใช้ URL แบบ http หรือ https โดยไม่มีชื่อผู้ใช้หรือรหัสผ่าน'); return; } }
    props.onSave({ ...editing, endpoint, modelId: editing.modelId.trim(), modelLabel: editing.modelLabel.trim() });
    setSaved(`บันทึก ${editing.name} แล้ว`); setEditing(undefined); setError('');
  }
  return <div className="chat-settings-layout">
    <nav className="settings-nav" aria-label="หมวดการตั้งค่า"><h2>ตั้งค่า</h2>
      <div role="tablist" aria-label="หมวดการตั้งค่า" aria-orientation="vertical">{categories.map((item, index) => <button key={item.id} id={`settings-tab-${item.id}`} role="tab" aria-selected={category === item.id} aria-controls="settings-panel" tabIndex={category === item.id ? 0 : -1} onClick={() => { setCategory(item.id); setEditing(undefined); setSaved(''); }} onKeyDown={e => {
        if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) return;
        e.preventDefault(); const target = e.key === 'Home' ? 0 : e.key === 'End' ? categories.length - 1 : (index + (e.key === 'ArrowDown' ? 1 : -1) + categories.length) % categories.length;
        setCategory(categories[target].id); setEditing(undefined); document.getElementById(`settings-tab-${categories[target].id}`)?.focus();
      }}><item.icon size={17} strokeWidth={1.5} />{item.name}</button>)}</div>
    </nav>
    <section className="settings-body" id="settings-panel" role="tabpanel" aria-labelledby={`settings-tab-${category}`} tabIndex={0}>
      {category === 'general' && <><h2>ทั่วไป</h2>
        <div className="setting-row theme-setting"><div><h3 id="theme-label">รูปแบบหน้าตา</h3></div><div className="theme-options" role="radiogroup" aria-labelledby="theme-label">{([{id:'system', label:'ตามอุปกรณ์'}, {id:'light', label:'สว่าง'}, {id:'dark', label:'มืด'}] as const).map(option => <label className="theme-option" key={option.id}><input type="radio" name="theme" value={option.id} checked={props.preferences.theme === option.id} onChange={() => props.onPreferences({theme:option.id})}/><span className={`theme-preview theme-preview-${option.id}`} aria-hidden="true"><span className="theme-preview-window"><span className="theme-preview-sidebar"/><span className="theme-preview-content"><i/><i/><i/><b/></span></span></span><span className="theme-option-label">{option.label}</span></label>)}</div></div>
        <div className="setting-row"><div><h3 id="transparency-label">ลดความโปร่งใส</h3><p>ใช้พื้นหลังทึบในแถบด้านข้าง</p></div><Switch aria-labelledby="transparency-label" checked={props.preferences.reduceTransparency} onCheckedChange={value => props.onPreferences({ reduceTransparency: value })} className="chat-switch" /></div>
        <div className="setting-row"><div><h3 id="compact-label">ประวัติแชตแบบกระชับ</h3><p>ลดระยะห่างของรายการในแถบด้านข้าง</p></div><Switch aria-labelledby="compact-label" checked={props.preferences.compact} onCheckedChange={value => props.onPreferences({ compact: value })} className="chat-switch" /></div>
        <p className="settings-footnote">แชตและการตั้งค่าของต้นแบบนี้เก็บไว้ในเครื่อง</p>
      </>}
      {category === 'providers' && (!editing ? <>
        <div className="provider-heading"><h2>ผู้ให้บริการ AI</h2>{props.onConnectVideo&&<button className="chat-button" onClick={props.onConnectVideo}>{props.videoConnected?'เปลี่ยนคีย์ AI / เสียง':'โหลดคีย์ AI / เสียง'}</button>}</div><p className="settings-intro">AI ใช้เขียนเรื่องและฉาก ส่วน HTML → MP4 เรนเดอร์ในเครื่อง ไม่ต้องใช้คีย์สร้างวิดีโอ</p>
        <div className="providers-list">{props.providers.map(p => <button key={p.id} aria-label={`ตั้งค่า ${p.name}`} onClick={() => { setEditing({ ...p }); setSaved(''); setError(''); }}><span className={`provider-symbol provider-${p.id}`}>{p.id === 'custom' ? '+' : p.name.slice(0, 1)}</span><span className="provider-copy"><strong>{p.name}</strong><span>{p.modelLabel || p.modelId || 'ยังไม่ตั้งค่า'}</span></span><ChevronRight size={17} strokeWidth={1.4} /></button>)}</div>
        <p className="settings-footnote">{props.onConnectVideo?'โหลดคีย์ OpenAI สำหรับเขียนเรื่องและฉาก กับ ElevenLabs สำหรับเสียงจากไฟล์ในเครื่อง คีย์ใช้เฉพาะรอบที่เปิดแอป':'รอบนี้ตั้งค่าได้เฉพาะข้อมูลโมเดล การเชื่อมต่อและตรวจสอบ API key จะเพิ่มหลังจากยืนยัน UX'}</p>
        {saved && <p className="settings-saved" role="status"><Check size={14} />{saved}</p>}
      </> : <form className="provider-form" onSubmit={save}>
        <button className="settings-back" type="button" onClick={() => { setEditing(undefined); setError(''); }}><ArrowLeft size={15} />ผู้ให้บริการ AI</button><h2>{editing.name}</h2>
        <label htmlFor="provider-key">API key</label><input id="provider-key" type="password" autoComplete="off" disabled placeholder="ยังไม่เชื่อมต่อในต้นแบบนี้" /><p className="field-help">ยังไม่รับ บันทึก หรือส่ง key จากหน้าจอนี้</p>
        <label htmlFor="provider-endpoint">API endpoint</label><input id="provider-endpoint" type="url" placeholder="https://…" value={editing.endpoint} maxLength={300} onChange={e => setEditing({ ...editing, endpoint: e.target.value })} />
        <label htmlFor="provider-model">Model ID</label><input id="provider-model" value={editing.modelId} maxLength={160} placeholder="รหัสโมเดลจากผู้ให้บริการ" onChange={e => setEditing({ ...editing, modelId: e.target.value })} />
        <label htmlFor="provider-label">ชื่อโมเดลที่แสดง</label><input id="provider-label" value={editing.modelLabel} maxLength={80} placeholder="ชื่อที่จะแสดงในช่องแชต" onChange={e => setEditing({ ...editing, modelLabel: e.target.value })} />
        {error && <p role="alert" className="composer-error">{error}</p>}
        <div className="provider-form-footer"><button className="chat-button" type="button" onClick={() => setEditing(undefined)}>ยกเลิก</button><button className="chat-button primary" type="submit">บันทึกการตั้งค่า</button></div>
      </form>)}
      {category === 'about' && <><h2>me studio</h2><p className="settings-intro">ต้นแบบแอปแชตสำหรับสร้างวิดีโอ</p><div className="setting-row"><span>เวอร์ชัน</span><span className="setting-value">0.1 · Frontend prototype</span></div><p className="settings-footnote">คำตอบและผลงานที่แสดงเป็นข้อมูลตัวอย่าง ยังไม่เชื่อมต่อ AI หรือระบบสร้างวิดีโอในหน้าจอนี้</p><h3 className="settings-section-title">UI components</h3><a className="settings-source" href="https://github.com/ibelick/prompt-kit" target="_blank" rel="noreferrer">Prompt Kit <ArrowUpRight size={15} /></a><a className="settings-source" href="https://ui.shadcn.com/docs/components" target="_blank" rel="noreferrer">shadcn/ui · Base UI <ArrowUpRight size={15} /></a></>}
    </section>
  </div>;
}
