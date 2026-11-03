'use client';

import { useEffect, useRef, useState } from 'react';
import { chatPrototypeKey, emptyThread, initialChatState, prototypeSchema, sampleReply, type ChatProvider, type ChatPrototypeState } from '@/lib/chat-prototype';

export function useChatPrototype() {
  const [state, setState] = useState<ChatPrototypeState>(initialChatState);
  const [activeId, setActiveId] = useState('new');
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState('');
  const [pendingId, setPendingId] = useState<string>();
  const nativeRequest=useRef<string|undefined>(undefined);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    queueMicrotask(() => {
      try {
        const raw = localStorage.getItem(chatPrototypeKey);
        if (raw) {
          const saved = prototypeSchema.parse(JSON.parse(raw));
          if (window.matchMedia('(max-width: 800px)').matches) saved.preferences.sidebarOpen = false;
          const empty = saved.threads.find(t => !t.messages.length && !t.draft);
          if (empty) { setState(saved); setActiveId(empty.id); }
          else { const fresh = emptyThread(crypto.randomUUID()); setState({ ...saved, threads: [fresh, ...saved.threads] }); setActiveId(fresh.id); }
        } else if (window.matchMedia('(max-width: 800px)').matches) {
          setState(s => ({ ...s, preferences: { ...s.preferences, sidebarOpen: false } }));
        }
        setReady(true);
      } catch { setStorageError('อ่านประวัติแชตไม่สำเร็จ ข้อมูลเดิมจะไม่ถูกเขียนทับ'); }
    });
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, []);
  useEffect(() => {
    if (!ready || storageError) return;
    try { localStorage.setItem(chatPrototypeKey, JSON.stringify(state)); }
    catch { queueMicrotask(() => setStorageError('บันทึกประวัติไม่สำเร็จ โปรดตรวจสอบพื้นที่จัดเก็บ')); }
  }, [state, ready, storageError]);
  const active = state.threads.find(t => t.id === activeId) ?? state.threads[0];
  function newChat(projectId?: string) {
    const fresh = { ...emptyThread(crypto.randomUUID()), ...(projectId ? {projectId} : {}) };
    setState(s => ({ ...s, threads: [fresh, ...s.threads] }));
    setActiveId(fresh.id);
  }
  function draft(value: string) {
    setState(s => ({ ...s, threads: s.threads.map(t => t.id === active.id ? { ...t, draft: value.slice(0, 8000), ...(!t.messages.length ? { title: value.trim().slice(0, 42) || 'แชตใหม่' } : {}) } : t) }));
  }
  function send(attachments: string[]) {
    if (!ready || pendingId || (!active.draft.trim() && !attachments.length)) return false;
    const id = active.id, text = active.draft.trim();
    const message = { id: crypto.randomUUID(), role: 'user' as const, text, attachments };
    setState(s => ({ ...s, threads: s.threads.map(t => t.id === id ? { ...t, draft: '', title: t.messages.length ? t.title : text.slice(0, 42) || 'ไฟล์แนบ', updatedAt: Date.now(), messages: [...t.messages, message] } : t) }));
    setPendingId(id);
    timer.current = setTimeout(() => {
      const reply = sampleReply();
      setState(s => ({ ...s, threads: s.threads.map(t => t.id === id ? { ...t, messages: [...t.messages, reply] } : t) }));
      setPendingId(undefined); timer.current = null;
    }, 650);
    return true;
  }
  function sendProduction(projectId:string) {
    if(!ready||pendingId||!active.draft.trim()||!window.meStudioFiles?.produceVideo)return false;
    const id=active.id,text=active.draft.trim(),requestId=crypto.randomUUID();nativeRequest.current=requestId;setPendingId(id);
    setState(s=>({...s,threads:s.threads.map(t=>t.id===id?{...t,draft:'',title:t.messages.length?t.title:text.slice(0,42),messages:[...t.messages,{id:crypto.randomUUID(),role:'user',text}],updatedAt:Date.now()}:t)}));
    void window.meStudioFiles.produceVideo({projectId,sessionId:id,requestId,text}).then(result=>{
      setState(s=>({...s,threads:s.threads.map(t=>t.id===id?{...t,messages:[...t.messages,{id:crypto.randomUUID(),role:'assistant',text:result.text.replace(/\[[^\]]+\]\([^)]*\)/g,''),...(result.artifact?{artifacts:[{id:result.artifact.id,title:result.artifact.title,kind:'video' as const,src:result.artifact.url,poster:'' as const,nativeProjectId:projectId}]}:{})}]}:t)}));
    }).catch(()=>setState(s=>({...s,threads:s.threads.map(t=>t.id===id?{...t,messages:[...t.messages,{id:crypto.randomUUID(),role:'assistant',text:'สร้างงานไม่สำเร็จ หรือถูกหยุด กรุณาตรวจการเชื่อมต่อ AI และลองใหม่'}]}:t)}))).finally(()=>{if(nativeRequest.current===requestId)setPendingId(undefined);});return true;
  }
  function stop() { if(pendingId)void window.meStudioFiles?.cancelVideo?.(); if (timer.current) clearTimeout(timer.current); timer.current = null; setPendingId(undefined); }
  function rename(id: string, title: string) {
    if (!title.trim()) return;
    setState(s => ({ ...s, threads: s.threads.map(t => t.id === id ? { ...t, title: title.trim().slice(0, 80) } : t) }));
  }
  function deleteChat(id: string) {
    if (!ready || storageError) return;
    const target=state.threads.find(t=>t.id===id); if(!target)return;
    if(pendingId===id)stop();
    let remaining=state.threads.filter(t=>t.id!==id);
    if(activeId===id&&!remaining.some(t=>t.projectId===target.projectId))remaining=[{...emptyThread(crypto.randomUUID()),...(target.projectId?{projectId:target.projectId}:{})},...remaining];
    if(!remaining.length)remaining=[emptyThread(crypto.randomUUID())];
    if(activeId===id){const next=remaining.find(t=>t.projectId===target.projectId)??remaining[0];setActiveId(next.id);}
    setState(s=>({...s,threads:remaining}));
  }
  function provider(value: ChatProvider) {
    setState(s => ({ ...s, providers: s.providers.map(p => p.id === value.id ? value : p) }));
  }
  return {
    state, active, activeId, sendProduction, setActiveId, newChat, draft, send, stop, pendingId, ready, storageError, rename, deleteChat, provider,
    selectProvider: (id: string) => setState(s => ({ ...s, selectedProvider: id })),
    preferences: (patch: Partial<ChatPrototypeState['preferences']>) => setState(s => ({ ...s, preferences: { ...s.preferences, ...patch } })),
  };
}
