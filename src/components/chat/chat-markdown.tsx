'use client';

import {memo} from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import './chat-markdown.css';

/** Model text is data: raw HTML and remote media never run in the app. */
export const ChatMarkdown=memo(function ChatMarkdown({text}:{text:string}){
 return <div className="chat-markdown"><Markdown remarkPlugins={[remarkGfm]} skipHtml
  disallowedElements={['img']}
  urlTransform={url=>/^https?:\/\//i.test(url)?url:url.startsWith('#')?url:undefined}
  components={{
   table:({children})=><div className="chat-markdown-table" role="region" aria-label="ตารางในคำตอบ" tabIndex={0}><table>{children}</table></div>,
   a:({href,children})=>href?<a href={href} target={href.startsWith('#')?undefined:'_blank'} rel="noopener noreferrer">{children}</a>:<span>{children}</span>,
  }}
 >{text}</Markdown></div>;
});
