'use client';
import {useCallback,useEffect,useState} from 'react';
import type {NativeCatalog,NativeSelection,ProviderConnection,ReasoningEffort} from '@/lib/native-models';
const storageKey='me-studio.native-model.v1';
export function useNativeModels(){
 const [catalog,setCatalog]=useState<NativeCatalog>();
 const [selection,setSelection]=useState<NativeSelection>();
 const [error,setError]=useState('');
 const refresh=useCallback(async()=>{
  if(!window.meStudioFiles?.configCatalog)return;
  try{
   const value=await window.meStudioFiles.configCatalog();setCatalog(value);setError('');
   setSelection(previous=>{
    let candidate=previous;
    if(!candidate){try{candidate=JSON.parse(localStorage.getItem(storageKey)||'null') as NativeSelection;}catch{/* Invalid UI preference never becomes a host model. */}}
    const available=(s:NativeSelection|undefined)=>s&&value.providers.some(p=>p.configured&&p.id===s.provider&&p.models.some(m=>m.id===s.model&&m.enabled));
    if(available(candidate))return candidate;
    const preferred={provider:value.defaultProvider,model:value.defaultModel};if(available(preferred))return preferred;
    const provider=value.providers.find(p=>p.configured&&p.models.some(m=>m.enabled)),model=provider?.models.find(m=>m.enabled);
    return provider&&model?{provider:provider.id,model:model.id}:undefined;
   });
  }catch{setError('อ่าน config.env ไม่สำเร็จ ตรวจรูปแบบไฟล์แล้วโหลดใหม่');}
 },[]);
 useEffect(()=>{queueMicrotask(()=>void refresh());const focus=()=>void refresh();window.addEventListener('focus',focus);return()=>window.removeEventListener('focus',focus);},[refresh]);
 function select(value:NativeSelection){setSelection(value);try{localStorage.setItem(storageKey,JSON.stringify(value));}catch{setError('บันทึกการเลือกโมเดลไม่สำเร็จ');}}
 async function saveProvider(input:ProviderConnection){try{const save=window.meStudioFiles?.saveProvider;if(!save)throw Error();await save(input);await refresh();return true;}catch{setError('บันทึกคีย์ไม่สำเร็จ กรุณาตรวจข้อมูลแล้วลองใหม่');return false;}}
 async function toggle(provider:string,model:string,enabled:boolean){try{await window.meStudioFiles?.toggleModel?.({provider,model,enabled});await refresh();}catch{setError('บันทึกโมเดลไม่สำเร็จ กรุณาลองใหม่');}}
 async function reasoning(effort:ReasoningEffort){try{if(!window.meStudioFiles?.setReasoning)throw Error();await window.meStudioFiles.setReasoning({effort});await refresh();}catch{setError('บันทึกระดับการคิดไม่สำเร็จ');}}
 async function open(){try{if(!window.meStudioFiles?.openConfig){setError('เปิด config.env ได้ในแอป Mac');return;}await window.meStudioFiles.openConfig();}catch{setError('เปิด config.env ไม่สำเร็จ กรุณาตั้งแอปสำหรับเปิดไฟล์ .env');}}
 return {catalog,selection,error,refresh,select,toggle,open,saveProvider,reasoning};
}
