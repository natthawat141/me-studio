'use client';

import { useState } from 'react';
import { Folder, FolderPlus, MessageSquarePlus, MoreHorizontal, Pencil, Search, Settings, SquarePen, Trash2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Brand } from '@/components/layout/brand';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import type { ChatThread } from '@/lib/chat-prototype';
import type { FolderProject } from '@/lib/workspace-files';

type Props = { threads: ChatThread[]; activeId: string; onOpen: (id: string) => void; onNew: () => void; onSearch: () => void; onSettings: () => void; onRename: (id: string, title: string) => void; projects: FolderProject[]; projectId?: string; onProject:(id:string)=>void; onCreateProject:()=>void; onProjectSettings:(id:string)=>void; projectBusy:boolean; onNewInProject:(id:string)=>void; onDelete:(id:string)=>void; };
export function ChatSidebar(props: Props) {
  const [editing, setEditing] = useState<string>();
  const [title, setTitle] = useState('');
  const [deleting,setDeleting] = useState<ChatThread>();
  function commit() { if (editing && title.trim()) props.onRename(editing, title); setEditing(undefined); }
  function chatRow(thread:ChatThread) { return <div className={`history-row ${thread.id === props.activeId ? 'is-active' : ''}`} key={thread.id}>
    {editing === thread.id ? <input className="history-rename" aria-label="ชื่อแชต" autoFocus value={title} maxLength={80} onChange={e => setTitle(e.target.value)} onBlur={commit} onKeyDown={e => { if (e.nativeEvent.isComposing) return; if (e.key === 'Enter') { e.preventDefault(); commit(); } if (e.key === 'Escape') setEditing(undefined); }} /> : <button className="history-title" aria-label={`เปิดแชต ${thread.title}`} aria-current={thread.id === props.activeId ? 'page' : undefined} onClick={() => props.onOpen(thread.id)}>{thread.title}</button>}
    <DropdownMenu><DropdownMenuTrigger render={<button className="history-more chat-icon" aria-label={`เมนูแชต ${thread.title}`} />}><MoreHorizontal size={16} /></DropdownMenuTrigger><DropdownMenuContent className="chat-menu" align="start"><DropdownMenuItem onClick={() => { setEditing(thread.id); setTitle(thread.title); }}><Pencil size={15} />เปลี่ยนชื่อ</DropdownMenuItem><DropdownMenuItem onClick={()=>setDeleting(thread)}><Trash2 size={15}/>ลบแชต</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
  </div>; }
  return <aside className="chat-sidebar" aria-label="แถบด้านข้าง">
    <div className="sidebar-brand"><Brand /></div>
    <nav className="sidebar-actions" aria-label="เมนูหลัก">
      <button onClick={props.onNew}><MessageSquarePlus size={18} strokeWidth={1.6} />แชตใหม่</button>
      <button onClick={props.onSearch}><Search size={18} strokeWidth={1.6} />ค้นหาแชต<kbd>⌘ K</kbd></button>
    </nav>
    <div className="chat-history"><div className="project-heading"><h2>Projects</h2><button className="chat-icon" aria-label="สร้าง Project" title="สร้าง Project" onClick={props.onCreateProject} disabled={props.projectBusy}><FolderPlus size={16}/></button></div>
      {props.projects.map(project=><div className="project-group" key={project.id}>
        <div className={`project-line ${props.projectId===project.id?'is-active':''}`}>
          <TooltipProvider delay={500}><Tooltip><TooltipTrigger render={<button className="project-row" onClick={()=>props.onProject(project.id)} disabled={props.projectBusy}/>}><Folder size={15} strokeWidth={1.4}/><span>{project.name}</span></TooltipTrigger><TooltipContent side="right" align="start" sideOffset={8} className="project-hover-tooltip"><div className="project-info-name"><Folder size={15}/>{project.name}</div><div className="project-info-detail">แชต {props.threads.filter(t=>t.projectId===project.id && (t.messages.length||t.draft)).length} รายการ</div><div className="project-info-detail"><Folder size={14}/>{project.folderName || 'โฟลเดอร์ที่เลือก'}</div></TooltipContent></Tooltip></TooltipProvider>
          <DropdownMenu><DropdownMenuTrigger render={<button className="project-action chat-icon" aria-label={`รายละเอียด ${project.name}`} title="รายละเอียดโปรเจกต์"/>}><MoreHorizontal size={15}/></DropdownMenuTrigger><DropdownMenuContent className="chat-menu project-info" align="start"><div className="project-info-name"><Folder size={15}/>{project.name}</div><div className="project-info-detail">แชต {props.threads.filter(t=>t.projectId===project.id && (t.messages.length||t.draft)).length} รายการ</div><div className="project-info-detail"><Folder size={14}/>{project.folderName || 'โฟลเดอร์ที่เลือก'}</div><DropdownMenuItem onClick={()=>props.onProjectSettings(project.id)}><Settings size={14} strokeWidth={1.4}/>ตั้งค่า Project</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
          <button className="project-action chat-icon" aria-label={`แชตใหม่ใน ${project.name}`} title="แชตใหม่ในโปรเจกต์" onClick={()=>props.onNewInProject(project.id)} disabled={props.projectBusy}><SquarePen size={15} strokeWidth={1.4}/></button>
        </div>
        <div className="project-threads">{props.threads.filter(t=>t.projectId===project.id && (t.draft||t.messages.length||t.id===props.activeId)).map(thread=>chatRow(thread))}</div>
      </div>)}
      {props.projectId&&<button className="project-all" onClick={()=>props.onProject('')}>แชตทั้งหมด</button>}
      <h2>แชตล่าสุด</h2>
      {props.threads.filter(t=>!t.projectId && (t.draft||t.messages.length||t.id===props.activeId)).map(thread=>chatRow(thread))}
    </div>
    <Dialog open={!!deleting} onOpenChange={open=>{if(!open)setDeleting(undefined);}}><DialogContent className="chat-delete-dialog" showCloseButton={false}><DialogTitle>ลบแชตนี้?</DialogTitle><DialogDescription>ข้อความในแชต “{deleting?.title}” จะถูกลบออกจากเครื่อง</DialogDescription><div className="chat-delete-actions"><button onClick={()=>setDeleting(undefined)}>ยกเลิก</button><button onClick={()=>{if(deleting)props.onDelete(deleting.id);setDeleting(undefined);}}>ลบแชต</button></div></DialogContent></Dialog>
    <button className="sidebar-settings" onClick={props.onSettings}><Settings size={18} strokeWidth={1.6} />ตั้งค่า</button>
  </aside>;
}

export function ChatSidebarRail({onNew,onSearch,onSettings}:Pick<Props,'onNew'|'onSearch'|'onSettings'>) {
  return <aside className="chat-sidebar-rail" aria-label="แถบเครื่องมือแชต">
    <button className="chat-icon" aria-label="แชตใหม่" title="แชตใหม่" onClick={onNew}><MessageSquarePlus size={19} strokeWidth={1.4}/></button>
    <button className="chat-icon" aria-label="ค้นหาแชต ⌘ K" title="ค้นหาแชต" onClick={onSearch}><Search size={19} strokeWidth={1.4}/></button>
    <button className="chat-icon rail-settings" aria-label="ตั้งค่า" title="ตั้งค่า" onClick={onSettings}><Settings size={19} strokeWidth={1.4}/></button>
  </aside>;
}
