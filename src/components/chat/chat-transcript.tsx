'use client';
import {useLocale} from '@/components/studio/locale';

import { useLayoutEffect, useRef } from 'react';
import {activityLabel,type Activity} from '@/lib/production-activity';
import {messageMedia} from '@/lib/chat-message-media';
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
  pending: boolean;stage?:string;activities?:Activity[];
  messageId?: string;
  onOpenFile: (file: WorkspacePreview, trigger: HTMLButtonElement) => void;
  onOpenArtifact: (artifact: ChatArtifact, trigger: HTMLButtonElement) => void;
};

/** Only the message column changes identity; the viewport and composer stay mounted. */
export function ChatTranscript({thread, pending,stage,activities,onChoice,onRetryMessage, messageId, onOpenFile, onOpenArtifact}: Props) {
  const {t,locale}=useLocale();
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

  return <div ref={viewport} className="chat-messages" role="log" aria-label={t("Conversation","บทสนทนา")} onScroll={event => {
    const el = event.currentTarget;
    positions.current.set(thread.id, el.scrollTop);
    follow.current = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
  }}>
    <div ref={column} key={thread.id} className="message-column chat-thread-enter" data-thread-id={thread.id}>
      {thread.messages.map(message => {const media=messageMedia(message);return <article id={`chat-message-${message.id}`} className={`chat-message message-${message.role} ${message.files?.length ? 'message-has-files' : ''}`} key={message.id}>
        {message.role === 'assistant' && <div className="assistant-byline"><Brand />{message.sample && <span>{t("Example response","คำตอบตัวอย่าง")}</span>}</div>}
        {!!media.files.length && <div className="chat-file-attachments">{media.files.map(file => <ChatLocalFile key={file.id} file={file} onOpen={onOpenFile} />)}</div>}
        {!!message.text && (message.role==='assistant'?<ChatMarkdown text={message.text}/>:<p>{message.text}</p>)}
        {message.role==='user'&&message.files?.length&&message.delivery!=='sent'&&onRetryMessage&&<button className="chat-resend" disabled={pending} onClick={()=>onRetryMessage(message.text,message.files!)}>{t("Send this message to AI","ส่งข้อความนี้ให้ AI")}</button>}
        {!!message.attachments?.length && <div className="message-attachments">{message.attachments.map((name, i) => <span key={i}><Paperclip size={13} />{name}</span>)}<small>{t("Only file names are shown in this prototype","แสดงชื่อไฟล์เท่านั้นในต้นแบบนี้")}</small></div>}
        {message.choices&&<div className="chat-choice-group" aria-label={message.choices.question}><p>{message.choices.question}</p><div>{message.choices.options.map(option=><button key={option.label} disabled={pending} onClick={()=>onChoice?.(`เลือก ${option.label}: ${option.description}`)}><strong>{option.label}</strong><span>{option.description}</span></button>)}</div></div>}
        {!!media.artifacts.length && <div className="chat-artifacts">{media.artifacts.map(item => <ChatInlineArtifact key={item.id} item={item} onOpenFile={onOpenFile} onOpen={onOpenArtifact} />)}</div>}
        {!!media.earlierFiles.length&&<details className="chat-activity"><summary>{t("Earlier video versions","วิดีโอเวอร์ชันก่อนหน้า")} · {media.earlierFiles.length}</summary>{media.earlierFiles.map(file=><ChatLocalFile key={file.id} file={file} compact onOpen={onOpenFile}/>)}</details>}
      </article>;})}
      {!!activities?.length&&<details className="chat-activity"><summary>{pending?t("Activity","การทำงาน"):t("Activity","ขั้นตอนการทำงาน")} · {activities.length}</summary><ol>{activities.map(a=><li key={a.operationId}><span>{activityLabel(a,locale)}</span><small>{a.status==='started'?t("Working","กำลังทำ"):a.status==='completed'?t("Done","เสร็จแล้ว"):a.status==='cancelled'?t("Stopped","หยุดแล้ว"):t("Failed","ไม่สำเร็จ")}</small></li>)}</ol></details>}
      {pending && <p className="chat-thinking" role="status" aria-label={t("Thinking…","กำลังคิด…")}><span aria-hidden="true">{stage||t("Thinking","กำลังคิด")}</span><span className="thinking-dots" aria-hidden="true"><i/><i/><i/></span></p>}
    </div>
  </div>;
}
