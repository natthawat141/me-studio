'use client';
import {useLocale} from '@/components/studio/locale';
import {useState} from 'react';
import {FileCog,Plus,RefreshCw,Search,KeyRound} from 'lucide-react';
import {Switch} from '@/components/ui/switch';
import {ProviderConnectionForm} from './provider-connection-form';
import type {NativeCatalog,ProviderConnection} from '@/lib/native-models';
type Props={catalog:NativeCatalog;error?:string;onOpen:()=>void;onRefresh:()=>void;onToggle:(provider:string,model:string,enabled:boolean)=>Promise<void>;onSaveProvider?:(input:ProviderConnection)=>Promise<boolean>};
export function NativeModelSettings({catalog,error,onOpen,onRefresh,onToggle,onSaveProvider}:Props){
  const {t}=useLocale();
 const [query,setQuery]=useState('');const [busy,setBusy]=useState(false);
 const [editing,setEditing]=useState<ProviderConnection['provider']>();
 const [saved,setSaved]=useState(false);
 if(editing&&onSaveProvider)return <ProviderConnectionForm key={editing} provider={editing} catalog={catalog} onBack={()=>setEditing(undefined)} onSave={onSaveProvider} onSaved={()=>{setEditing(undefined);setSaved(true);}}/>;
 return <div className="native-model-settings">
  <div className="models-heading"><div><h2>{t("Manage models","จัดการโมเดล")}</h2><p>{t("Choose which models appear in the model picker","เลือกโมเดลที่จะปรากฏในตัวเลือกโมเดล")}</p></div><button className="chat-button" onClick={()=>onSaveProvider?setEditing('openai'):onOpen()}><Plus size={15} strokeWidth={1.4}/>{t("Connect provider","เชื่อมต่อผู้ให้บริการ")}</button></div>
  <div className="models-search"><Search size={16} strokeWidth={1.4}/><input aria-label={t("Search models","ค้นหาโมเดล")} placeholder={t("Search models","ค้นหาโมเดล")} value={query} onChange={e=>setQuery(e.target.value)}/></div>
  <div className="models-config-actions"><button onClick={onOpen}><FileCog size={15} strokeWidth={1.3}/>{t("Open config.env","เปิด config.env")}</button><button onClick={onRefresh}><RefreshCw size={14} strokeWidth={1.3}/>{t("Refresh","โหลดใหม่")}</button></div>
  {error&&<p className="composer-error" role="alert">{error}</p>}
  {saved&&<p className="settings-saved" role="status">{t("Key saved. Choose models to show.","บันทึกคีย์แล้ว เลือกโมเดลที่ต้องการแสดงได้")}</p>}
  {catalog.providers.map(provider=>{
   const models=provider.models.filter(m=>`${m.label} ${m.id} ${provider.name}`.toLowerCase().includes(query.toLowerCase()));
   if(query&&!models.length)return null;
   if(!provider.configured)return <section className="provider-connect-row" key={provider.id} aria-label={`เชื่อมต่อ ${provider.name}`}><div><h3>{provider.name}</h3><p>{t("Add an API key to choose models","ใส่ API key เพื่อเลือกโมเดล")}</p></div><button className="chat-button" onClick={()=>onSaveProvider?setEditing(provider.id as ProviderConnection['provider']):onOpen()}><KeyRound size={14} strokeWidth={1.3}/>ใส่คีย์ {provider.name}</button></section>;
   return <section className="model-provider-group" key={provider.id} aria-label={`โมเดล ${provider.name}`}><div className="model-provider-heading"><h3>{provider.name}</h3><button className="model-edit-key" onClick={()=>onSaveProvider?setEditing(provider.id as ProviderConnection['provider']):onOpen()}>{t("Change key","เปลี่ยนคีย์")}</button></div>
    <div className="model-visibility-list">{models.map(model=><div className="model-visibility-row" key={model.id}><div><strong>{model.label}</strong><small>{model.id}</small>{model.id.endsWith('-contributor')&&<small>{t("Contributor: data may be used for model training","Contributor: ข้อมูลอาจถูกใช้ฝึกโมเดล")}</small>}</div><Switch className="chat-switch" aria-label={`แสดง ${model.label}`} checked={model.enabled} disabled={busy} onCheckedChange={value=>{setBusy(true);void onToggle(provider.id,model.id,value).finally(()=>setBusy(false));}}/></div>)}</div>
    {!models.length&&<p className="models-empty">{t("Add provider models in config.env","เพิ่มรายชื่อโมเดลของผู้ให้บริการใน config.env")}</p>}
   </section>;
  })}
  <p className="settings-footnote">{t("Keys are stored locally. A key does not guarantee access to every model.","คีย์เก็บในเครื่อง การมีคีย์ไม่ได้ยืนยันสิทธิ์เข้าถึงแต่ละโมเดล")}</p>
 </div>;
}
