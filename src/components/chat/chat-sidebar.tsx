'use client';
import {useLocale} from '@/components/studio/locale';

import { useEffect, useRef, useState } from 'react';
import { Folder, FolderOpen, FolderPlus, MessageSquarePlus, MoreHorizontal, Pencil, Search, Settings, SquarePen, Trash2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Brand } from '@/components/layout/brand';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import type { ChatThread } from '@/lib/chat-prototype';
import { chatWorkspaceId, type ChatWorkspace } from '@/lib/chat-workspaces';

type Props = { pendingId?:string; threads: ChatThread[]; activeId: string; onOpen: (id: string) => void; onNew: () => void; onSearch: () => void; onSettings: () => void; onRename: (id: string, title: string) => void; projects: ChatWorkspace[]; projectId?: string; onCreateProject:()=>void; onProjectSettings:(id:string)=>void; projectBusy:boolean; onNewInProject:(id:string)=>void; onDelete:(id:string)=>void; collapsedProjects:Record<string,boolean>;onToggleProject:(id:string)=>void; scrollTop:number;onScrollTop:(top:number)=>void;ready:boolean; };
export function ChatSidebar(props: Props) {
  const {t}=useLocale();
  const [editing, setEditing] = useState<string>();
  const [title, setTitle] = useState('');
  const [deleting,setDeleting] = useState<ChatThread>();
  const history = useRef<HTMLDivElement>(null);
  const scrollTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const restoredScroll = useRef(false);
  useEffect(() => {
    if (props.ready && !restoredScroll.current && history.current) {
      history.current.scrollTop = props.scrollTop; restoredScroll.current = true;
    }
  }, [props.ready, props.projects.length, props.scrollTop]);
  useEffect(() => () => clearTimeout(scrollTimer.current), []);
  function commit() { if (editing && title.trim()) props.onRename(editing, title); setEditing(undefined); }
  function chatRow(thread:ChatThread) { return <div className={`history-row ${thread.id === props.activeId ? 'is-active' : ''}`} key={thread.id}>
    {editing === thread.id ? <input className="history-rename" aria-label={t("Chat name","ชื่อแชต")} autoFocus value={title} maxLength={80} onChange={e => setTitle(e.target.value)} onBlur={commit} onKeyDown={e => { if (e.nativeEvent.isComposing) return; if (e.key === 'Enter') { e.preventDefault(); commit(); } if (e.key === 'Escape') setEditing(undefined); }} /> : <button className="history-title" aria-label={`เปิดแชต ${thread.title}`} aria-current={thread.id === props.activeId ? 'page' : undefined} onClick={() => props.onOpen(thread.id)}>{thread.title}</button>}
    {thread.unread&&props.pendingId!==thread.id&&<span className="chat-unread" aria-label={t("New activity","มีผลงานใหม่")}/>}{props.pendingId===thread.id&&<span className="chat-row-spinner" role="status" aria-label={t("Working","กำลังทำงาน")}/>}<DropdownMenu><DropdownMenuTrigger render={<button className="history-more chat-icon" aria-label={`เมนูแชต ${thread.title}`} />}><MoreHorizontal size={16} /></DropdownMenuTrigger><DropdownMenuContent className="chat-menu" align="start"><DropdownMenuItem onClick={() => { setEditing(thread.id); setTitle(thread.title); }}><Pencil size={15} />{t("Rename","เปลี่ยนชื่อ")}</DropdownMenuItem><DropdownMenuItem onClick={()=>setDeleting(thread)}><Trash2 size={15}/>{t("Delete chat","ลบแชต")}</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
  </div>; }
  return <aside className="chat-sidebar" aria-label={t("Sidebar","แถบด้านข้าง")}>
    <div className="sidebar-brand"><Brand /></div>
    <nav className="sidebar-actions" aria-label={t("Main menu","เมนูหลัก")}>
      <button onClick={props.onNew}><MessageSquarePlus size={18} strokeWidth={1.6} />{t("New chat","แชตใหม่")}</button>
      <button onClick={props.onSearch}><Search size={18} strokeWidth={1.6} />{t("Search chats","ค้นหาแชต")}<kbd>⌘ K</kbd></button>
    </nav>
    <div ref={history} className="chat-history" onScroll={event=>{const top=event.currentTarget.scrollTop;clearTimeout(scrollTimer.current);scrollTimer.current=setTimeout(()=>props.onScrollTop(top),150);}}><div className="project-heading"><h2>Projects</h2><button className="chat-icon" aria-label={t("Create project","สร้าง Project")} title={t("Create project","สร้าง Project")} onClick={props.onCreateProject} disabled={props.projectBusy}><FolderPlus size={16}/></button></div>
      {props.projects.map(project=>{const collapsed=!!props.collapsedProjects[project.id];const threads=props.threads.filter(t=>chatWorkspaceId(t.projectId)===project.id&&t.messages.length);const Icon=collapsed?Folder:FolderOpen;return <div className="project-group" key={project.id}>
        <div className={`project-line ${props.projectId===project.id?'is-current':''}`}>
          <TooltipProvider delay={500}><Tooltip><TooltipTrigger render={<button className="project-row" onClick={()=>props.onToggleProject(project.id)} aria-expanded={!collapsed} aria-controls={`project-chats-${project.id}`}/>}><Icon size={15} strokeWidth={1.4}/><span>{project.name}</span></TooltipTrigger><TooltipContent side="right" align="start" sideOffset={8} className="project-hover-tooltip"><div className="project-info-name"><Folder size={15}/>{project.name}</div><div className="project-info-detail">{t(`${threads.length} chats`,`แชต ${threads.length} รายการ`)}</div><div className="project-info-detail"><Folder size={14}/>{project.kind==='default'?t("General chats","พื้นที่แชตทั่วไป"):project.folderName || t("Selected folder","โฟลเดอร์ที่เลือก")}</div></TooltipContent></Tooltip></TooltipProvider>
          {collapsed&&threads.some(t=>t.id===props.pendingId)&&<span className="chat-row-spinner" role="status" aria-label={t("Project is working","Project กำลังทำงาน")}/>}{collapsed&&threads.some(t=>t.unread)&&!threads.some(t=>t.id===props.pendingId)&&<span className="chat-unread" aria-label={t("New activity","มีผลงานใหม่")}/>}
          <DropdownMenu><DropdownMenuTrigger render={<button className="project-action chat-icon" aria-label={`รายละเอียด ${project.name}`} title={t("Project details","รายละเอียดโปรเจกต์")}/>}><MoreHorizontal size={15}/></DropdownMenuTrigger><DropdownMenuContent className="chat-menu project-info" align="start"><div className="project-info-name"><Folder size={15}/>{project.name}</div><div className="project-info-detail">{t(`${threads.length} chats`,`แชต ${threads.length} รายการ`)}</div><div className="project-info-detail"><Folder size={14}/>{project.kind==='default'?t("General chats","พื้นที่แชตทั่วไป"):project.folderName || t("Selected folder","โฟลเดอร์ที่เลือก")}</div>{project.kind==='folder'&&<DropdownMenuItem onClick={()=>props.onProjectSettings(project.id)}><Settings size={14} strokeWidth={1.4}/>{t("Project settings","ตั้งค่า Project")}</DropdownMenuItem>}</DropdownMenuContent></DropdownMenu>
          <button className="project-action chat-icon" aria-label={`แชตใหม่ใน ${project.name}`} title={t("New chat in project","แชตใหม่ในโปรเจกต์")} onClick={()=>props.onNewInProject(project.id)} disabled={props.projectBusy}><SquarePen size={15} strokeWidth={1.4}/></button>
        </div>
        <div id={`project-chats-${project.id}`} className={`project-disclosure ${collapsed?'is-collapsed':''}`} inert={collapsed} aria-hidden={collapsed}><div className="project-threads">{threads.length?threads.map(thread=>chatRow(thread)):<p className="project-empty">{t("No chats","ไม่มีแชต")}</p>}</div></div>
      </div>;})}
    </div>
    <Dialog open={!!deleting} onOpenChange={open=>{if(!open)setDeleting(undefined);}}><DialogContent className="chat-delete-dialog" showCloseButton={false}><DialogTitle>{t("Delete this chat?","ลบแชตนี้?")}</DialogTitle><DialogDescription>{t(`Messages in “${deleting?.title}” will be removed from this device`,`ข้อความในแชต “${deleting?.title}” จะถูกลบออกจากเครื่อง`)}</DialogDescription><div className="chat-delete-actions"><button onClick={()=>setDeleting(undefined)}>{t("Cancel","ยกเลิก")}</button><button onClick={()=>{if(deleting)props.onDelete(deleting.id);setDeleting(undefined);}}>{t("Delete chat","ลบแชต")}</button></div></DialogContent></Dialog>
    <button className="sidebar-settings" onClick={props.onSettings}><Settings size={18} strokeWidth={1.6} />{t("Settings","ตั้งค่า")}</button>
  </aside>;
}

export function ChatSidebarRail({onNew,onSearch,onSettings}:Pick<Props,'onNew'|'onSearch'|'onSettings'>) {
  const {t}=useLocale();
  return <aside className="chat-sidebar-rail" aria-label={t("Chat toolbar","แถบเครื่องมือแชต")}>
    <button className="chat-icon" aria-label={t("New chat","แชตใหม่")} title={t("New chat","แชตใหม่")} onClick={onNew}><MessageSquarePlus size={19} strokeWidth={1.4}/></button>
    <button className="chat-icon" aria-label="ค้นหาแชต ⌘ K" title={t("Search chats","ค้นหาแชต")} onClick={onSearch}><Search size={19} strokeWidth={1.4}/></button>
    <button className="chat-icon rail-settings" aria-label={t("Settings","ตั้งค่า")} title={t("Settings","ตั้งค่า")} onClick={onSettings}><Settings size={19} strokeWidth={1.4}/></button>
  </aside>;
}
