'use client';
import { useState } from 'react';
import Image from 'next/image';
import { Maximize2, Minimize2 } from 'lucide-react';
import type { ChatArtifact } from '@/lib/chat-prototype';

export function ChatArtifactPreview({ artifact }: { artifact: ChatArtifact }) {
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState(false);
  return <section className={`artifact-preview ${expanded ? 'is-expanded' : ''}`} aria-label="ดูผลงาน">

    <div className="artifact-stage">
      {artifact.kind === 'video' ? <video key={artifact.id} controls controlsList="nodownload" playsInline preload="metadata" width={1080} height={1920} src={artifact.src} onError={() => setError(true)} aria-label={artifact.title} /> : <Image src={artifact.src} alt={artifact.title} width={1080} height={1920} unoptimized onError={() => setError(true)} />}
      {error && <p role="alert">เปิดไฟล์ไม่สำเร็จ</p>}
    </div>
    <footer className="preview-bottom-actions"><button className="chat-icon" aria-label={expanded ? 'ย่อพรีวิว' : 'ขยายพรีวิว'} title={expanded ? 'ย่อพรีวิว' : 'ขยายพรีวิว'} onClick={() => setExpanded(!expanded)}>{expanded ? <Minimize2 size={16} strokeWidth={1.25} /> : <Maximize2 size={16} strokeWidth={1.25} />}</button></footer>
  </section>;
}
