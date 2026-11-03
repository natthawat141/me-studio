"use client";
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, X } from 'lucide-react';
import { ModelSelect } from '@/components/chat/model-select';
import { chatModelKey, chatModelLabel, type ChatModel } from '@/lib/chat-models';
import { type AgentSettings } from '@/lib/agent-settings';
import { useMediaQuery } from '@/hooks/use-media-query';
import recommendations from '@/data/model-recommendations.json';
import './agent-settings-panel.css';

type Option = {value:string;label:string};
function Choices({label,value,options,onChange}:{label:string;value:string;options:Option[];onChange:(value:string)=>void}) {
  return <fieldset className="agent-choices"><legend>{label}</legend><div>{options.map((option)=><label key={option.value}><input type="radio" name={label} value={option.value} checked={value===option.value} onChange={()=>onChange(option.value)} /><span>{option.label}</span></label>)}</div></fieldset>;
}
const imageRatios=['16:9','4:3','1:1','3:4','9:16'].map((value)=>({value,label:value}));
const videoRatios=['16:9','9:16'].map((value)=>({value,label:value}));
const counts=[1,2,3,4].map((value)=>({value:String(value),label:`×${value}`}));

export function AgentSettingsPanel({value,models,onChange,onClose,hasVideo,disabled=false}:{value:AgentSettings;models:(ChatModel & {label:string})[];onChange:(value:AgentSettings)=>boolean;onClose:()=>void;hasVideo:boolean;disabled?:boolean}) {
  const heading=useRef<HTMLHeadingElement>(null);
  const panel=useRef<HTMLElement>(null);
  const modelMenuOpen=useRef(false);
  const modelMenuTransition=useRef(0);
  const mobile=useMediaQuery('(max-width: 600px)');
  const [notice,setNotice]=useState('');
  useEffect(()=>{heading.current?.focus();},[]);
  const available=[...models,...recommendations.models.filter((model)=>!models.some((entry)=>chatModelKey(entry)===chatModelKey(model)))];
  const chosen=value.chatModel;
  const modelOptions=[{value:'default',label:'ใช้ค่าเริ่มต้นของสตูดิโอ'},
    ...(chosen && !available.some((model)=>chatModelKey(model)===chatModelKey(chosen)) ? [{value:chatModelKey(chosen),label:chatModelLabel(chosen)}] : []),
    ...available.map((model)=>({value:chatModelKey(model),label:model.label})),
  ];
  function change(next:AgentSettings) {
    if(onChange(next)) setNotice('บันทึกแล้ว');
    else setNotice('บันทึกไม่สำเร็จ การตั้งค่าก่อนหน้ายังคงอยู่');
  }
  return <section ref={panel} className="agent-settings-panel" role={mobile?'dialog':'region'} aria-modal={mobile || undefined} aria-labelledby="agent-settings-heading"
    onKeyDown={(event)=>{
      // Base UI menus portal outside this panel but still bubble through React.
      // Let the nested control own its keyboard interaction before closing/trapping the panel.
      const target=event.target as HTMLElement;
      if(modelMenuOpen.current || !event.currentTarget.contains(target) || target.closest('[role="combobox"][aria-expanded="true"]')) return;
      if(event.key==='Escape' && !event.defaultPrevented) {event.preventDefault();onClose();}
      if(event.key==='Tab' && mobile) {
        const focusable=Array.from(panel.current?.querySelectorAll<HTMLElement>('button,input,[tabindex],a[href]')??[]).filter((element)=>element.tabIndex>=0 && !element.hasAttribute('disabled'));
        const first=focusable[0],last=focusable.at(-1),active=document.activeElement;
        if(event.shiftKey && (active===first || active===heading.current)) {event.preventDefault();last?.focus();}
        else if(!event.shiftKey && active===last) {event.preventDefault();first?.focus();}
      }
    }}>
    <header className="agent-panel-header">
      <button className="icon-btn" aria-label={hasVideo?'กลับไปดูวิดีโอ':'กลับไปที่แชต'} onClick={onClose}><ArrowLeft size={19}/></button>
      <h2 id="agent-settings-heading" ref={heading} tabIndex={-1}>การตั้งค่า Agent</h2>
      <button className="icon-btn" aria-label="ปิดการตั้งค่า Agent" onClick={onClose}><X size={19}/></button>
    </header>
    <div className="agent-panel-body">
      <p className="agent-panel-context">การตั้งค่าสำหรับโปรเจกต์นี้</p>
      <fieldset className="agent-confirmation" disabled={disabled}>
        <legend>ยืนยันก่อนสร้าง</legend>
        <label><input type="radio" name="agent-confirmation" checked={value.confirmation==='always'} onChange={()=>change({...value,confirmation:'always'})}/><span><strong>ทุกครั้ง</strong><small>ให้ตรวจแผนก่อนเริ่มสร้างสื่อ</small></span></label>
        <label><input type="radio" name="agent-confirmation" checked={value.confirmation==='paid-only'} onChange={()=>change({...value,confirmation:'paid-only'})}/><span><strong>เฉพาะงานที่ใช้เครดิต</strong><small>งานใช้ฟรีเริ่มได้โดยไม่ถามซ้ำ</small></span></label>
      </fieldset>
      <div className="agent-model-field"><label id="agent-chat-model-label">โมเดลแชตของโปรเจกต์</label><ModelSelect disabled={disabled} onOpenChange={(open)=>{
        const transition=++modelMenuTransition.current;
        if(open) modelMenuOpen.current=true;
        else window.setTimeout(()=>{if(modelMenuTransition.current===transition) modelMenuOpen.current=false;}, 0);
      }} label="โมเดลแชตของโปรเจกต์" value={chosen?chatModelKey(chosen):'default'} options={modelOptions} onChange={(key)=>{
        const model=available.find((model)=>chatModelKey(model)===key);
        change({...value,chatModel:key==='default'?null:model?{provider:model.provider,modelId:model.modelId}:chosen});
      }}/></div>
      <fieldset className="agent-output-settings" disabled={disabled}>
        <legend>ค่าเริ่มต้นสำหรับภาพ</legend>
        <Choices label="สัดส่วนภาพ" value={value.image.aspectRatio} options={imageRatios} onChange={(ratio)=>change({...value,image:{...value.image,aspectRatio:ratio as AgentSettings['image']['aspectRatio']}})}/>
        <Choices label="จำนวนภาพ" value={String(value.image.count)} options={counts} onChange={(count)=>change({...value,image:{...value.image,count:Number(count) as AgentSettings['image']['count']}})}/>
        <p className="agent-model-unavailable">โมเดลภาพจะเลือกได้เมื่อเชื่อมระบบสร้างภาพ</p>
      </fieldset>
      <fieldset className="agent-output-settings" disabled={disabled}>
        <legend>ค่าเริ่มต้นสำหรับวิดีโอ</legend>
        <Choices label="สัดส่วนวิดีโอ" value={value.video.aspectRatio} options={videoRatios} onChange={(ratio)=>change({...value,video:{...value.video,aspectRatio:ratio as AgentSettings['video']['aspectRatio']}})}/>
        <Choices label="จำนวนวิดีโอ" value={String(value.video.count)} options={counts} onChange={(count)=>change({...value,video:{...value.video,count:Number(count) as AgentSettings['video']['count']}})}/>
        <p className="agent-model-unavailable">โมเดลวิดีโอจะเลือกได้เมื่อเชื่อมระบบสร้างวิดีโอ</p>
      </fieldset>
      <p className="agent-panel-note">ค่าที่เลือกจะใช้เป็นค่าเริ่มต้นเมื่อเชื่อม AI งานที่ใช้เครดิตยังต้องได้รับการอนุมัติจากระบบ</p>
    </div>
    <footer className="agent-panel-footer"><span role="status">{notice || 'บันทึกเมื่อเปลี่ยนค่า'}</span><button className="solid-button" onClick={onClose}>เสร็จสิ้น</button></footer>
  </section>;
}
