'use client';
import {useState} from 'react';
import {ArrowLeft} from 'lucide-react';
import type {NativeCatalog,ProviderConnection} from '@/lib/native-models';
type Props={provider:ProviderConnection['provider'];catalog:NativeCatalog;onBack:()=>void;onSaved:()=>void;onSave:(input:ProviderConnection)=>Promise<boolean>};
const providers=[{id:'openai',name:'OpenAI'},{id:'meta',name:'Meta'},{id:'openrouter',name:'OpenRouter'},{id:'elevenlabs',name:'ElevenLabs'}] as const;
export function ProviderConnectionForm(props:Props){
 const [provider,setProvider]=useState(props.provider),[apiKey,setApiKey]=useState(''),[modelId,setModelId]=useState(''),[modelLabel,setModelLabel]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const name=providers.find(p=>p.id===provider)!.name;
 const configured=provider==='elevenlabs'?props.catalog.voiceConfigured:props.catalog.providers.find(p=>p.id===provider)?.configured;
 async function save(event:React.FormEvent){event.preventDefault();if(!apiKey.trim()||busy)return;setBusy(true);setError('');try{const success=await props.onSave({provider,apiKey:apiKey.trim(),...(modelId.trim()?{modelId:modelId.trim(),modelLabel:modelLabel.trim()||modelId.trim()}:{})});if(success){setApiKey('');props.onSaved();}else setError('บันทึกไม่สำเร็จ คีย์เดิมยังอยู่ กรุณาลองใหม่');}finally{setBusy(false);}}
 return <form className="provider-form provider-connection-form" onSubmit={e=>void save(e)}>
  <button className="settings-back" type="button" disabled={busy} onClick={props.onBack}><ArrowLeft size={15}/>จัดการโมเดล</button>
  <h2>{configured?'แก้ไขผู้ให้บริการ':'เชื่อมต่อผู้ให้บริการ'}</h2>
  <label htmlFor="connect-provider">ผู้ให้บริการ</label><select id="connect-provider" value={provider} disabled={busy} onChange={e=>{setProvider(e.target.value as ProviderConnection['provider']);setApiKey('');setModelId('');setModelLabel('');setError('');}}>{providers.map(p=><option value={p.id} key={p.id}>{p.name}</option>)}</select>
  <label htmlFor="connect-api-key">API key ของ {name}</label><input id="connect-api-key" name="api-key" type="password" autoComplete="off" spellCheck={false} autoCapitalize="none" value={apiKey} maxLength={4096} disabled={busy} placeholder={configured?'ใส่คีย์ใหม่เพื่อเปลี่ยนคีย์เดิม':'วาง API key'} onChange={e=>setApiKey(e.target.value)}/>
  <p className="field-help">บันทึกไว้ใน config.env บนเครื่อง คีย์เดิมจะไม่ถูกแสดงกลับมา</p>
  {provider==='openrouter'&&<><label htmlFor="connect-model-id">Model ID</label><input id="connect-model-id" value={modelId} maxLength={160} disabled={busy} placeholder="รหัสโมเดลจาก OpenRouter" onChange={e=>setModelId(e.target.value)}/><label htmlFor="connect-model-label">ชื่อที่แสดง</label><input id="connect-model-label" value={modelLabel} maxLength={80} disabled={busy} placeholder="ชื่อโมเดล" onChange={e=>setModelLabel(e.target.value)}/></>}
  {error&&<p className="composer-error" role="alert">{error}</p>}
  <div className="provider-form-footer"><button className="chat-button" type="button" disabled={busy} onClick={props.onBack}>ยกเลิก</button><button className="chat-button primary" type="submit" disabled={!apiKey.trim()||busy}>{busy?'กำลังบันทึก…':'บันทึกคีย์'}</button></div>
 </form>;
}
