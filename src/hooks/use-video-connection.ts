'use client';

import {useEffect,useRef,useState} from 'react';

/** UI connection state is advisory; every native send rechecks the trusted worker. */
export function useVideoConnection(){
 const [connected,setConnected]=useState(false);
 const [status,setStatus]=useState('');
 const revision=useRef(0);
 useEffect(()=>{
  const bridge=window.meStudioFiles;
  if(!bridge?.videoStatus)return;
  let active=true;const version=revision.current;
  void bridge.videoStatus().then(value=>{if(active&&version===revision.current)setConnected(value.configured);})
   .catch(()=>{if(active&&version===revision.current)setStatus('ตรวจสถานะ AI ไม่สำเร็จ กรุณาลองใหม่');});
  return()=>{active=false;};
 },[]);
 async function connect(){
  ++revision.current;
  try{
   const load=window.meStudioFiles?.loadVideoKeys;
   if(!load){setStatus('โหลดคีย์ผ่านแอป me studio บน Mac');return false;}
   const value=await load();
   if(!value)return false;
   setConnected(value.configured);
   setStatus(value.configured?'โหลดคีย์แล้ว · สั่งสร้างวิดีโอใน Project ได้':'โหลดคีย์ไม่สำเร็จ กรุณาตรวจไฟล์ในเครื่อง');
   return value.configured;
  }catch{setStatus('โหลดคีย์ไม่สำเร็จ ไฟล์ต้องมี OPENAI_API_KEY หรือ Openai_api');return false;}
 }
 async function prepareSend(_projectId:string|undefined,providerId:string):Promise<'native'|'sample'|'blocked'>{
  const bridge=window.meStudioFiles;
  // Browser and older read-only preview bridges have no agent capability.
  if(!bridge?.videoStatus&&!bridge?.produceVideo)return 'sample';
  if(!bridge.videoStatus||!bridge.produceVideo){setStatus('แอปรุ่นนี้ยังเรียก AI ไม่ได้ กรุณาเปิด me studio รุ่นล่าสุด');return 'blocked';}
  ++revision.current;
  try{
   const value=await bridge.videoStatus();setConnected(value.configured);
   if(!value.configured){setStatus('ยังไม่ได้โหลดคีย์ในรอบนี้ ไปที่ตั้งค่า → ผู้ให้บริการ AI → โหลดคีย์ AI / เสียง');return 'blocked';}
   if(value.busy){setStatus('AI กำลังทำงานอยู่ กรุณารอให้งานเดิมเสร็จหรือกดหยุด');return 'blocked';}
  }catch{setStatus('ตรวจสถานะ AI ไม่สำเร็จ กรุณาลองใหม่ ข้อความร่างยังอยู่');return 'blocked';}
  if(!['openai','openrouter','meta'].includes(providerId)){setStatus('เลือกโมเดลที่เชื่อมต่อแล้วในตั้งค่า');return 'blocked';}
  setStatus('');return 'native';
 }
 return {connected,status,setStatus,connect,prepareSend};
}
