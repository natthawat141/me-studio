'use client';

import { useLayoutEffect, useRef } from 'react';
import {ChatMarkdown} from './chat-markdown';
import { Paperclip } from 'lucide-react';
import { Brand } from '@/components/layout/brand';
import { ChatInlineArtifact, ChatLocalFile } from './chat-media';
import type { ChatArtifact, ChatThread } from '@/lib/chat-prototype';
import type { WorkspacePreview,ChatFileRef } from '@/lib/workspace-files';

type Props = {
  onRetryMessage?:(text:string,files:ChatFileRef[])=>void;
  onChoice?:(text:string)=>void;
  thread: ChatThread;
  pending: boolean;
  messageId?: string;
  onOpenFile: (file: WorkspacePreview, trigger: HTMLButtonElement) => void;
  onOpenArtifact: (artifact: ChatArtifact, trigger: HTMLButtonElement) => void;
};

/** Only the message column changes identity; the viewport and composer stay mounted. */
export function ChatTranscript({thread, pending,onChoice,onRetryMessage, messageId, onOpenFile, onOpenArtifact}: Props) {
  const viewport = useRef<HTMLDivElement>(null);
  const column = useRef<HTMLDivElement>(null);
  const current = useRef<string | undefined>(undefined);
  const positions = useRef(new Map<string, number>());
  const follow = useRef(true);
  useLayoutEffect(() => {
    const el = viewport.current;
    if (!el) return;
    if (current.current !== thread.id) {
      current.current = thread.id;
      el.scrollTop = positions.current.get(thread.id) ?? el.scrollHeight;
      follow.current = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
    } else if (follow.current) el.scrollTop = el.scrollHeight;
    if (messageId) {
      const message = document.getElementById(`chat-message-${messageId}`);
      if (message && el.contains(message)) el.scrollTop += message.getBoundingClientRect().top - el.getBoundingClientRect().top - el.clientHeight / 3;
      follow.current = false;
    }
  }, [thread.id, thread.messages.length, messageId]);
  useLayoutEffect(() => {
    const observer = new ResizeObserver(() => {
      if (follow.current && viewport.current) viewport.current.scrollTop = viewport.current.scrollHeight;
    });
    if (column.current) observer.observe(column.current);
    return () => observer.disconnect();
  }, [thread.id]);

  return <div ref={viewport} className="chat-messages" role="log" aria-label="บทสนทนา" onScroll={event => {
    const el = event.currentTarget;
    positions.current.set(thread.id, el.scrollTop);
    follow.current = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
  }}>
    <div ref={column} key={thread.id} className="message-column chat-thread-enter" data-thread-id={thread.id}>
      {thread.messages.map(message => <article id={`chat-message-${message.id}`} className={`chat-message message-${message.role} ${message.files?.length ? 'message-has-files' : ''}`} key={message.id}>
        {message.role === 'assistant' && <div className="assistant-byline"><Brand />{message.sample && <span>คำตอบตัวอย่าง</span>}</div>}
        {!!message.files?.length && <div className="chat-file-attachments">{message.files.map(file => <ChatLocalFile key={file.id} file={file} onOpen={onOpenFile} />)}</div>}
        {!!message.text && (message.role==='assistant'?<ChatMarkdown text={message.text}/>:<p>{message.text}</p>)}
        {message.role==='user'&&message.files?.length&&message.delivery!=='sent'&&onRetryMessage&&<button className="chat-resend" disabled={pending} onClick={()=>onRetryMessage(message.text,message.files!)}>ส่งข้อความนี้ให้ AI</button>}
        {!!message.attachments?.length && <div className="message-attachments">{message.attachments.map((name, i) => <span key={i}><Paperclip size={13} />{name}</span>)}<small>แสดงชื่อไฟล์เท่านั้นในต้นแบบนี้</small></div>}
        {message.choices&&<div className="chat-choice-group" aria-label={message.choices.question}><p>{message.choices.question}</p><div>{message.choices.options.map(option=><button key={option.label} disabled={pending} onClick={()=>onChoice?.(`เลือก ${option.label}: ${option.description}`)}><strong>{option.label}</strong><span>{option.description}</span></button>)}</div></div>}
        {!!message.artifacts?.length && <div className="chat-artifacts">{message.artifacts.map(item => <ChatInlineArtifact key={item.id} item={item} onOpenFile={onOpenFile} onOpen={onOpenArtifact} />)}</div>}
      </article>)}
      {pending && <p className="chat-thinking" role="status" aria-label="กำลังคิด…"><span aria-hidden="true">กำลังคิด</span><span className="thinking-dots" aria-hidden="true"><i/><i/><i/></span></p>}
    </div>
  </div>;
}
