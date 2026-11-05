'use client';
import {useLocale} from '@/components/studio/locale';

import { useEffect, useId, useRef, useState } from 'react';
import { File, FileText, MessageCircle, Settings, SquarePen, X } from 'lucide-react';
import { Dialog, DialogClose, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { searchCategories, searchChats, type SearchCategory, type SearchEntry } from '@/lib/chat-search';
import type { ChatArtifact, ChatThread } from '@/lib/chat-prototype';

type Props = {
  open: boolean; onOpenChange: (value: boolean) => void; threads: ChatThread[]; activeId: string;
  onSelect: (id: string, messageId?: string) => void; onNew: () => void; onSettings: () => void;
  onArtifact: (threadId: string, artifact: ChatArtifact) => void;
};
export function ChatSearch(props: Props) {
  const {t}=useLocale();
  const input = useRef<HTMLInputElement>(null);
  return <Dialog open={props.open} onOpenChange={props.onOpenChange}><DialogContent className="chat-search-dialog" overlayClassName="chat-search-backdrop" showCloseButton={false} initialFocus={input}>
    <DialogTitle className="sr-only">{t("Search chats or commands","ค้นหาแชตหรือใช้คำสั่ง")}</DialogTitle><DialogDescription className="sr-only">{t("Search chats, files, or text. Use arrow keys and Enter to open.","ค้นหาแชต ไฟล์ หรือข้อความ ใช้ลูกศรขึ้นลงเพื่อเลือกและ Enter เพื่อเปิด")}</DialogDescription>
    {props.open && <SearchPalette {...props} inputRef={input} />}
  </DialogContent></Dialog>;
}

function SearchPalette({ inputRef, ...props }: Props & { inputRef: React.RefObject<HTMLInputElement | null> }) {
  const {t}=useLocale();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<SearchCategory>('all');
  const [selected, setSelected] = useState<string | undefined>(`chat-${props.activeId}`);
  const id = useId();
  const groups = searchChats(props.threads, query, category);
  const entries = groups.flatMap(g => g.entries);
  const activeIndex = Math.max(0, entries.findIndex(entry => entry.id === selected));
  const active = entries[activeIndex];
  const activeOptionId = active ? `${id}-${active.id}` : undefined;
  useEffect(() => { if (activeOptionId) document.getElementById(activeOptionId)?.scrollIntoView({ block: 'nearest' }); }, [activeOptionId]);
  function choose(entry: SearchEntry) {
    props.onOpenChange(false);
    if (entry.kind === 'action') { if (entry.action === 'new') props.onNew(); else props.onSettings(); }
    else if (entry.kind === 'file') props.onArtifact(entry.threadId, entry.artifact);
    else props.onSelect(entry.threadId, entry.kind === 'text' ? entry.messageId : undefined);
  }
  function setFilter(value: SearchCategory) { setCategory(value); setSelected(undefined); }
  return <div className="search-palette" onKeyDown={e => {
    if (e.nativeEvent.isComposing || e.keyCode === 229 || !(e.metaKey || e.ctrlKey)) return;
    const command = e.key.toLowerCase() === 'n' ? 'new' : e.key === ',' ? 'settings' : undefined;
    if (command) { e.preventDefault(); e.stopPropagation(); props.onOpenChange(false); if (command === 'new') props.onNew(); else props.onSettings(); }
  }}>
    <div className="search-field"><input ref={inputRef} role="combobox" aria-label={t("Search chat history","ค้นหาในประวัติแชต")} aria-autocomplete="list" aria-expanded="true" aria-controls={`${id}-results`} aria-activedescendant={activeOptionId} autoComplete="off" spellCheck={false} value={query} onChange={e => { setQuery(e.target.value); setSelected(undefined); }} placeholder={t("Search chats or commands","ค้นหาแชตหรือใช้คำสั่ง")} onKeyDown={e => {
      if (e.nativeEvent.isComposing || e.keyCode === 229) return;
      if (['ArrowDown', 'ArrowUp', 'Enter'].includes(e.key)) {
        e.preventDefault();
        if (!entries.length) return;
        if (e.key === 'Enter') choose(active);
        else setSelected(entries[(activeIndex + (e.key === 'ArrowDown' ? 1 : -1) + entries.length) % entries.length].id);
      }
    }} /><DialogClose render={<button className="chat-icon" aria-label={t("Close search","ปิดการค้นหา")} />}><X size={16} strokeWidth={1.25} /></DialogClose></div>
    <div className="search-results" id={`${id}-results`} role="listbox" aria-label={t("Search results","ผลการค้นหา")}>
      {groups.map(group => <div className="search-group" key={group.id} role="group" aria-label={group.title}>
        <div className="search-group-title" aria-hidden="true">{group.title}</div>
        {group.entries.map(entry => {
          const Icon = entry.kind === 'action' ? entry.action === 'new' ? SquarePen : Settings : entry.kind === 'file' ? File : entry.kind === 'text' ? FileText : MessageCircle;
          return <div key={entry.id} id={`${id}-${entry.id}`} role="option" aria-label={entry.kind === 'file' ? `ไฟล์ ${entry.title}` : entry.kind === 'text' ? `ข้อความ ${entry.title}` : entry.title} aria-selected={active?.id === entry.id} className={`search-result result-${entry.kind}`} onMouseMove={() => setSelected(entry.id)} onMouseDown={e => e.preventDefault()} onClick={() => choose(entry)}>
            <Icon size={16} strokeWidth={1.25} aria-hidden="true" />
            <span className="search-result-title">{entry.title}</span>
            {entry.kind === 'action' ? <kbd>{entry.shortcut}</kbd> : <span className="search-result-detail">{entry.detail}</span>}
          </div>;
        })}
      </div>)}
      {!entries.length && <div className="search-empty"><strong>{query ? t("No results found","ไม่พบผลลัพธ์") : category === 'text' ? t("Type to search messages","พิมพ์เพื่อค้นหาในข้อความ") : category === 'file' ? t("No files in chats","ยังไม่มีไฟล์ในแชต") : t("No chat history yet","ยังไม่มีประวัติแชต")}</strong><span>{query ? t("Try a chat name or text in a message","ลองค้นด้วยชื่อแชตหรือคำในข้อความ") : t("Your chats and work will appear here","แชตและผลงานของคุณจะแสดงที่นี่")}</span></div>}
    </div>
    <footer className="search-footer"><div role="tablist" aria-label={t("Search result categories","ประเภทผลการค้นหา")}>{searchCategories.map((item, index) => <button key={item.id} role="tab" id={`${id}-tab-${item.id}`} aria-selected={category === item.id} tabIndex={category === item.id ? 0 : -1} aria-controls={`${id}-results`} onClick={() => setFilter(item.id)} onKeyDown={e => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
      e.preventDefault(); const next = e.key === 'Home' ? 0 : e.key === 'End' ? searchCategories.length - 1 : (index + (e.key === 'ArrowRight' ? 1 : -1) + searchCategories.length) % searchCategories.length;
      setFilter(searchCategories[next].id); document.getElementById(`${id}-tab-${searchCategories[next].id}`)?.focus();
    }}>{item.label}</button>)}</div></footer>
  </div>;
}
