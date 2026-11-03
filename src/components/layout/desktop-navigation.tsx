'use client';

import type { Ref } from 'react';
import { File, FileCog, PanelLeft, PanelRight, SquarePen, X } from 'lucide-react';
import './desktop-navigation.css';

type Props = {
  onOpenConfig?:()=>void;
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
    {props.onOpenConfig&&<button className="chat-icon" aria-label="เปิด config.env" title="เปิด config.env" onClick={props.onOpenConfig}><FileCog size={17} strokeWidth={1.3}/></button>}
    <button ref={ref} className={`desktop-files-button ${props.panelOpen ? 'is-active' : ''}`} aria-label={props.panelOpen ? 'ซ่อนแผงไฟล์' : 'เปิดแผงไฟล์'} aria-expanded={props.panelOpen} title={props.panelOpen?'ปิดแผงด้านข้าง':'เปิดแผงด้านข้าง'} onClick={props.onToggleFiles}><PanelRight size={17} strokeWidth={1.25}/></button>
  </nav>;
}
