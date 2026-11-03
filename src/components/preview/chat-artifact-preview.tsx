'use client';
import { useState } from 'react';
import Image from 'next/image';
import { Download, Maximize2, Minimize2, X } from 'lucide-react';
import type { ChatArtifact } from '@/lib/chat-prototype';

export function ChatArtifactPreview({ artifact, onClose, onDownload }: { artifact: ChatArtifact; onClose: () => void; onDownload?:()=>void }) {
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState(false);
  return <section className={`artifact-preview ${expanded ? 'is-expanded' : ''}`} aria-label="ดูผลงาน">
    <header><span>{artifact.title}</span><div><button className="chat-icon" aria-label={expanded ? 'ย่อพรีวิว' : 'ขยายพรีวิว'} onClick={() => setExpanded(!expanded)}>{expanded ? <Minimize2 size={17} /> : <Maximize2 size={17} />}</button><button className="chat-icon" aria-label="ปิดพรีวิว" onClick={onClose}><X size={19} strokeWidth={1.5} /></button></div></header>
    <div className="artifact-stage">
      {artifact.kind === 'video' ? <video key={artifact.id} controls playsInline preload="auto" width={1080} height={1920} src={artifact.src} onError={() => setError(true)} aria-label={artifact.title} /> : <Image src={artifact.src} alt={artifact.title} width={1080} height={1920} unoptimized onError={() => setError(true)} />}
      {error && <p role="alert">เปิดไฟล์ไม่สำเร็จ</p>}
    </div>
    <footer><span>{artifact.nativeProjectId?'วิดีโอที่สร้างใน Project':'ไฟล์ตัวอย่างสำหรับทดลองหน้าจอ'}</span><a href={artifact.src} onClick={e=>{if(onDownload){e.preventDefault();onDownload();}}} download className="chat-button"><Download size={15} />{artifact.nativeProjectId?'ดาวน์โหลด MP4':'ดาวน์โหลดไฟล์ตัวอย่าง'}</a></footer>
  </section>;
}
