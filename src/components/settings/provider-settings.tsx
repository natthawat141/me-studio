"use client";
import "./model-recommendations.css";
import { useEffect, useState } from 'react';
import { ModelSelect } from '@/components/chat/model-select';
import { loadProviderCatalog } from '@/services/provider-catalog';
import type { ProviderCatalog } from '@/lib/provider-config';
import recommendations from '@/data/model-recommendations.json';
import { chatModelKey, chatModelStorageKey, type ChatModel } from '@/lib/chat-models';

export function ProviderSettings({ section }: { section: 'models' | 'connections' }) {
  const [catalog, setCatalog] = useState<ProviderCatalog | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [retry, setRetry] = useState(0);
  const [choice, setChoice] = useState<ChatModel>({provider:'openrouter',modelId:''});
  useEffect(() => {
    const abort = new AbortController();
    loadProviderCatalog(abort.signal).then(setCatalog).catch(() => {
      if (!abort.signal.aborted) setError('โหลดการตั้งค่าไม่สำเร็จ ตรวจสอบ config ของเซิร์ฟเวอร์');
    });
    queueMicrotask(() => {
      if (abort.signal.aborted) return;
      try {
        const raw = localStorage.getItem(chatModelStorageKey);
        if (!raw) return;
        const data: unknown = JSON.parse(raw);
        if (data && typeof data === 'object' && 'provider' in data && 'modelId' in data && typeof data.provider === 'string' && typeof data.modelId === 'string') setChoice({provider:data.provider,modelId:data.modelId});
      } catch { setError('อ่านโมเดลที่บันทึกไว้ไม่สำเร็จ ข้อมูลเดิมยังไม่ถูกเขียนทับ'); }
    });
    return () => abort.abort();
  }, [retry]);
  function save(next: ChatModel) {
    try {
      localStorage.setItem(chatModelStorageKey, JSON.stringify(next));
      setChoice(next);
      setNotice('เลือกโมเดลแล้ว ใช้กับแชตเมื่อกลับสตูดิโอ ขณะนี้ยังเป็นโหมดจำลอง');
    } catch { setError('บันทึกโมเดลไม่สำเร็จ'); }
  }
  return <section className="settings-card" aria-label={section === 'models' ? 'การเลือกโมเดลแชต' : 'สถานะการเชื่อมต่อ'}>
    {error && <div role="alert"><p>{error}</p><button className="settings-save secondary" onClick={() => {setError('');setRetry((n) => n+1);}}>ลองอีกครั้ง</button></div>}
    {!catalog && !error && <p role="status">กำลังโหลดการตั้งค่า…</p>}
    {catalog && section === 'connections' && <>
      {catalog.providers.map((provider) => <div className="provider-status-row" key={provider.id}><strong>{provider.label}</strong><span>{provider.credentialConfigured ? 'ตั้งค่า key บนเซิร์ฟเวอร์แล้ว · ยังไม่ได้ตรวจการเชื่อมต่อ' : 'ยังไม่ได้ตั้งค่า key บนเซิร์ฟเวอร์'}</span></div>)}
      <p className="settings-explanation">ผู้ดูแลตั้งค่า OpenRouter, Meta และ ElevenLabs ผ่าน .env.local แล้วเริ่มเซิร์ฟเวอร์ใหม่ ระบบจัดการ key ผ่านหน้าจอจะเพิ่มหลังมีระบบบัญชีและสิทธิ์ผู้ดูแล</p>
    </>}
    {catalog && section === 'models' && <>
      {catalog.models.length > 0 ? <div className="settings-model-field">โมเดลที่ผู้ดูแลเพิ่มไว้<ModelSelect label="โมเดลจากเซิร์ฟเวอร์" value={chatModelKey(choice)} options={[
        ...(!catalog.models.some((model) => chatModelKey(model) === chatModelKey(choice)) && choice.modelId ? [{value:chatModelKey(choice),label:choice.modelId}] : []),
        ...catalog.models.map((model) => ({value:chatModelKey(model),label:model.label})),
      ]} onChange={(key) => {const model=catalog.models.find((model)=>chatModelKey(model)===key);if(model)save({provider:model.provider,modelId:model.modelId});}} /></div> : <p className="settings-explanation">ยังไม่มีโมเดลในรายการของเซิร์ฟเวอร์ ผู้ดูแลเพิ่มได้ผ่าน STUDIO_CHAT_MODELS</p>}
      <div className="model-recommendations">
        <h3>รุ่นที่ตรวจสอบไว้</h3><p>ตรวจชื่อและ API ID เมื่อ {recommendations.reviewedAt} · ยังไม่ได้ทดสอบกับงานของคุณ</p>
        {recommendations.models.map((model)=><button type="button" key={chatModelKey(model)} onClick={()=>save({provider:model.provider,modelId:model.modelId})}><strong>{model.label}</strong><span>{model.use}</span></button>)}
      </div>
      <form onSubmit={(event) => {event.preventDefault();save({provider:choice.provider,modelId:choice.modelId.trim()});}}>
        <div className="settings-model-field">ผู้ให้บริการ<ModelSelect label="ผู้ให้บริการของโมเดล" value={choice.provider} options={catalog.providers.filter((provider)=>provider.capability==='chat').map((provider)=>({value:provider.id,label:provider.label}))} onChange={(provider)=>setChoice({provider,modelId:''})} /></div>
        <label>Model ID จากผู้ให้บริการ<input required maxLength={200} value={choice.modelId} onChange={(event) => setChoice((current)=>({...current,modelId:event.target.value}))} placeholder="ระบุ Model ID จาก catalog ของผู้ให้บริการ" /></label>
        <p className="settings-explanation">เพิ่มเป็นตัวเลือกส่วนตัวในแชตได้ ผ่าน OpenRouter หรือ Meta Model API การเลือกนี้ไม่เพิ่มสิทธิ์ของเซิร์ฟเวอร์และยังไม่เรียก AI</p>
        <button className="settings-save" disabled={!choice.modelId.trim()}>เพิ่มและเลือกโมเดล</button>
      </form>
    </>}
    {notice && <p role="status" className="settings-explanation">{notice}</p>}
  </section>;
}
