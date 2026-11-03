'use client';

import { useEffect, useRef, useState } from 'react';
import { chatPrototypeKey, emptyThread, initialChatState, prototypeSchema, sampleReply, type ChatProvider, type ChatPrototypeState } from '@/lib/chat-prototype';
import type {NativeSelection} from '@/lib/native-models';
import type { ChatFileRef } from '@/lib/workspace-files';
import { commitChatMessage, createChatDraft, restoreChatDrafts } from '@/lib/chat-drafts';

export function useChatPrototype() {
  const [state, setState] = useState<ChatPrototypeState>(initialChatState);
  const [activeId, setActiveId] = useState('new');
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState('');
  const [pendingId, setPendingId] = useState<string>();
  const nativeRequest=useRef<{requestId:string;sessionId:string;assistantId:string;userId:string;streamed:string}|undefined>(undefined);
  const [productionStage,setProductionStage]=useState<{sessionId:string;text:string}>();
  useEffect(()=>window.meStudioFiles?.onProductionEvent?.(event=>{
    const request=nativeRequest.current;
    if(!request||event.requestId!==request.requestId||event.sessionId!==request.sessionId)return;
    if(event.type==='text_delta'&&typeof event.text==='string'){
      request.streamed=(request.streamed+event.text).slice(0,100000);
      const text=request.streamed;
      setState(s=>({...s,threads:s.threads.map(t=>t.id===request.sessionId?{...t,messages:t.messages.some(m=>m.id===request.assistantId)?t.messages.map(m=>m.id===request.assistantId?{...m,text}:m):[...t.messages,{id:request.assistantId,role:'assistant',text}]}:t)}));
    }
    if(event.type==='tool_start')setProductionStage({sessionId:request.sessionId,text:event.name==='render_video'?'กำลังเรนเดอร์วิดีโอ':event.name==='inspect_animation'?'กำลังตรวจภาพผลงาน':'กำลังทำงาน'});
    if(event.type==='tool_end')setProductionStage(undefined);
    if(event.type==='render')setProductionStage({sessionId:request.sessionId,text:'กำลังเรนเดอร์วิดีโอ'});
  }),[]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    queueMicrotask(() => {
      try {
        const raw = localStorage.getItem(chatPrototypeKey);
        if (raw) {
          const saved = restoreChatDrafts(prototypeSchema.parse(JSON.parse(raw)));
          if (window.matchMedia('(max-width: 800px)').matches) saved.preferences.sidebarOpen = false;
          const draft = saved.drafts.find(t => !t.projectId) ?? createChatDraft();
          setState({ ...saved, drafts: saved.drafts.includes(draft) ? saved.drafts : [draft, ...saved.drafts] });
          setActiveId(draft.id);
        } else {
          const fresh = createChatDraft();
          setState(s => ({ ...s, drafts: [fresh], preferences: { ...s.preferences, sidebarOpen: !window.matchMedia('(max-width: 800px)').matches } }));
          setActiveId(fresh.id);
        }
        setReady(true);
      } catch { setStorageError('อ่านประวัติแชตไม่สำเร็จ ข้อมูลเดิมจะไม่ถูกเขียนทับ'); }
    });
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, []);
  useEffect(() => {
    if (!ready || storageError) return;
    const timer = setTimeout(() => {
      try { localStorage.setItem(chatPrototypeKey, JSON.stringify(state)); }
      catch { setStorageError('บันทึกประวัติไม่สำเร็จ โปรดตรวจสอบพื้นที่จัดเก็บ'); }
    }, 180);
    const flush = () => { try { localStorage.setItem(chatPrototypeKey, JSON.stringify(state)); } catch { /* Preserve the last successfully saved snapshot. */ } };
    window.addEventListener('pagehide', flush);
    return () => { clearTimeout(timer); window.removeEventListener('pagehide', flush); };
  }, [state, ready, storageError]);
  const active = [...state.threads, ...state.drafts].find(t => t.id === activeId) ?? state.drafts[0] ?? state.threads[0] ?? emptyThread('new');
  function newChat(projectId?: string, resume = false) {
    const fresh = (resume ? state.drafts.find(t => t.projectId === projectId && t.draft) ?? state.drafts.find(t => t.projectId === projectId) : undefined) ?? createChatDraft(projectId);
    if (!state.drafts.includes(fresh)) setState(s => ({ ...s, drafts: [fresh, ...s.drafts] }));
    setActiveId(fresh.id);
  }
  function draft(value: string) {
    const update = (t: typeof active) => t.id === active.id ? { ...t, draft: value.slice(0, 8000), ...(!t.messages.length ? { title: value.trim().slice(0, 42) || 'แชตใหม่' } : {}) } : t;
    setState(s => ({ ...s, threads: s.threads.map(update), drafts: s.drafts.map(update) }));
  }
  function send(attachments: string[],files:ChatFileRef[]=[]) {
    if (!ready || pendingId || (!active.draft.trim() && !attachments.length)) return false;
    const id = active.id, text = active.draft.trim();
    const message = { id: crypto.randomUUID(), role: 'user' as const, text, attachments:files.length?[]:attachments,...(files.length?{files}:{}) };
    setState(s => commitChatMessage(s, active, message));
    setPendingId(id);
    timer.current = setTimeout(() => {
      const reply = sampleReply();
      setState(s => ({ ...s, threads: s.threads.map(t => t.id === id ? { ...t, messages: [...t.messages, reply] } : t) }));
      setPendingId(undefined); timer.current = null;
    }, 650);
    return true;
  }
  function sendProduction(projectId?:string,files:ChatFileRef[]=[],selection?:NativeSelection,textOverride?:string) {
    if(!ready||pendingId||(!(textOverride??active.draft).trim()&&!files.length)||!window.meStudioFiles?.produceVideo)return false;
    const id=active.id,text=(textOverride??active.draft).trim()||'ช่วยดูไฟล์ที่แนบให้หน่อย',requestId=crypto.randomUUID();setPendingId(id);
    const userMessageId=crypto.randomUUID(),assistantId=crypto.randomUUID();
    nativeRequest.current={requestId,sessionId:id,assistantId,userId:userMessageId,streamed:''};
    const references=files.length?files:[...active.messages].reverse().find(m=>m.role==='user'&&m.files?.length)?.files??[];
    setState(s=>{const next=commitChatMessage(s,active,{id:userMessageId,role:'user',text,delivery:'sent',...(files.length?{files}:{})});return textOverride?{...next,threads:next.threads.map(t=>t.id===id?{...t,draft:active.draft}:t)}:next;});
    void window.meStudioFiles.produceVideo({projectId,sessionId:id,requestId,text,attachments:references.map(f=>({id:f.id})),...selection}).then(result=>{
      if(nativeRequest.current?.requestId!==requestId)return;
      const message={id:assistantId,role:'assistant' as const,text:result.text.slice(0,100000),...(result.files?.length?{files:result.files}:{}),...(result.choices?{choices:result.choices}:{}),...(result.artifact?{artifacts:[{id:result.artifact.id,title:result.artifact.title,kind:'video' as const,src:result.artifact.url,poster:'' as const,nativeProjectId:result.projectId??projectId,files:result.artifact.files}]}:{})};
      setState(s=>({...s,threads:s.threads.map(t=>t.id===id?{...t,messages:t.messages.some(m=>m.id===assistantId)?t.messages.map(m=>m.id===assistantId?message:m):[...t.messages,message]}:t)}));
    }).catch(()=>{
      if(nativeRequest.current?.requestId!==requestId)return;
      const partial=nativeRequest.current.streamed;
      setState(s=>({...s,threads:s.threads.map(t=>t.id===id?{...t,messages:[...t.messages.filter(m=>m.id!==assistantId).map(m=>m.id===userMessageId?{...m,delivery:'failed' as const}:m),{id:assistantId,role:'assistant',text:(partial?partial+'\n\n':'')+'การทำงานไม่สำเร็จ กรุณาตรวจการเชื่อมต่อ AI และลองใหม่'}]}:t)}));
    }).finally(()=>{if(nativeRequest.current?.requestId===requestId){nativeRequest.current=undefined;setPendingId(undefined);setProductionStage(undefined);}});return true;
  }

  function attach(files:ChatFileRef[]){
    if(!ready||pendingId||!files.length)return false;
    const text=active.draft.trim();
    setState(s=>commitChatMessage(s,active,{id:crypto.randomUUID(),role:'user',text,files}));return true;
  }
  function stop() {
    const request=nativeRequest.current;nativeRequest.current=undefined;
    if(request){void window.meStudioFiles?.cancelVideo?.({requestId:request.requestId});setState(s=>({...s,threads:s.threads.map(t=>t.id===request.sessionId?{...t,messages:t.messages.map(m=>m.id===request.assistantId?{...m,text:m.text+'\n\nหยุดแล้ว'}:m)}:t)}));}
    if(timer.current)clearTimeout(timer.current);timer.current=null;setPendingId(undefined);setProductionStage(undefined);
  }

  function rename(id: string, title: string) {
    if (!title.trim()) return;
    setState(s => ({ ...s, threads: s.threads.map(t => t.id === id ? { ...t, title: title.trim().slice(0, 80) } : t) }));
  }
  function deleteChat(id: string) {
    if (!ready || storageError) return;
    const target=state.threads.find(t=>t.id===id); if(!target)return;
    if(pendingId===id)stop();
    const remaining=state.threads.filter(t=>t.id!==id);
    const next=remaining.find(t=>t.projectId===target.projectId)??state.drafts.find(t=>t.projectId===target.projectId)??createChatDraft(target.projectId);
    if(activeId===id)setActiveId(next.id);
    setState(s=>({...s,threads:s.threads.filter(t=>t.id!==id),drafts:activeId===id&&!remaining.includes(next)&&!s.drafts.includes(next)?[next,...s.drafts]:s.drafts}));
  }
  function provider(value: ChatProvider) {
    setState(s => ({ ...s, providers: s.providers.map(p => p.id === value.id ? value : p) }));
  }
  function toggleProject(id: string) {
    setState(s => ({ ...s, preferences: { ...s.preferences, collapsedProjects: { ...s.preferences.collapsedProjects, [id]: !s.preferences.collapsedProjects[id] } } }));
  }
  function revealProject(id: string) {
    setState(s => s.preferences.collapsedProjects[id] ? { ...s, preferences: { ...s.preferences, collapsedProjects: { ...s.preferences.collapsedProjects, [id]: false } } } : s);
  }
  return {
    state, active, activeId, productionStage, sendProduction, attach, setActiveId, newChat, draft, send, stop, pendingId, ready, storageError, rename, deleteChat, provider, toggleProject, revealProject,
    selectProvider: (id: string) => setState(s => ({ ...s, selectedProvider: id })),
    preferences: (patch: Partial<ChatPrototypeState['preferences']>) => setState(s => ({ ...s, preferences: { ...s.preferences, ...patch } })),
  };
}
