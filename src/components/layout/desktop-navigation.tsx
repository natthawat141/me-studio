'use client';

import type { Ref } from 'react';
import { File, FolderOpen, PanelLeft, PanelRight, SquarePen, X } from 'lucide-react';
import './desktop-navigation.css';

type Props = {
  title: string;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  onNew: () => void;
  panelOpen: boolean;
  onToggleFiles: () => void;
  ref: Ref<HTMLButtonElement>;
  fileName?: string;
  onCloseFile: () => void;
};

export function DesktopNavigation({ref,...props}: Props) {
  return <nav className="desktop-navigation" aria-label="แถบนำทางหลัก">
    <div className="desktop-navigation-controls">
      <button className="chat-icon" aria-label={props.sidebarOpen ? 'ยุบแถบด้านข้าง' : 'เปิดแถบด้านข้าง'} title={props.sidebarOpen ? 'ยุบแถบด้านข้าง' : 'เปิดแถบด้านข้าง'} aria-expanded={props.sidebarOpen} onClick={props.onToggleSidebar}><PanelLeft size={18} strokeWidth={1.4}/></button>
      <button className="chat-icon" aria-label="เริ่มแชตใหม่" title="แชตใหม่" onClick={props.onNew}><SquarePen size={18} strokeWidth={1.4}/></button>
    </div>
    <span className="desktop-navigation-title" title={props.title}>{props.title}</span>
    {props.fileName && <div className="desktop-navigation-tab" aria-label={`แท็บไฟล์ ${props.fileName}`}><File size={14} strokeWidth={1.25}/><span title={props.fileName}>{props.fileName}</span><button className="chat-icon" aria-label={`ปิดแท็บ ${props.fileName}`} onClick={props.onCloseFile}><X size={14} strokeWidth={1.25}/></button></div>}
    <button ref={ref} className={`desktop-files-button ${props.panelOpen ? 'is-active' : ''}`} aria-label={props.panelOpen ? 'ซ่อนแผงไฟล์' : 'เปิดแผงไฟล์'} aria-expanded={props.panelOpen} title="ไฟล์และพรีวิว" onClick={props.onToggleFiles}><FolderOpen size={16} strokeWidth={1.25}/><span>ไฟล์</span><PanelRight size={16} strokeWidth={1.25}/></button>
  </nav>;
}
