'use client';
import {useLocale} from '@/components/studio/locale';

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
  const {t}=useLocale();
  return <nav className="desktop-navigation" aria-label={t("Main navigation","แถบนำทางหลัก")}>
    <div className="desktop-navigation-controls">
      <button className="chat-icon" aria-label={props.sidebarOpen ? t("Hide sidebar","ยุบแถบด้านข้าง") : t("Show sidebar","เปิดแถบด้านข้าง")} title={props.sidebarOpen ? t("Hide sidebar","ยุบแถบด้านข้าง") : t("Show sidebar","เปิดแถบด้านข้าง")} aria-expanded={props.sidebarOpen} onClick={props.onToggleSidebar}><PanelLeft size={18} strokeWidth={1.4}/></button>
      <button className="chat-icon" aria-label={t("New chat","เริ่มแชตใหม่")} title={t("New chat","แชตใหม่")} onClick={props.onNew}><SquarePen size={18} strokeWidth={1.4}/></button>
    </div>
    <span className="desktop-navigation-title" title={props.title}>{props.title}</span>
    {props.fileName && <div className="desktop-navigation-tab" aria-label={`แท็บไฟล์ ${props.fileName}`}><File size={14} strokeWidth={1.25}/><span title={props.fileName}>{props.fileName}</span><button className="chat-icon" aria-label={`ปิดแท็บ ${props.fileName}`} onClick={props.onCloseFile}><X size={14} strokeWidth={1.25}/></button></div>}
    {props.onOpenConfig&&<button className="chat-icon" aria-label={t("Open config.env","เปิด config.env")} title={t("Open config.env","เปิด config.env")} onClick={props.onOpenConfig}><FileCog size={17} strokeWidth={1.3}/></button>}
    <button ref={ref} className={`desktop-files-button ${props.panelOpen ? 'is-active' : ''}`} aria-label={props.panelOpen ? t("Hide file panel","ซ่อนแผงไฟล์") : t("Show file panel","เปิดแผงไฟล์")} aria-expanded={props.panelOpen} title={props.panelOpen?t("Close side panel","ปิดแผงด้านข้าง"):t("Open side panel","เปิดแผงด้านข้าง")} onClick={props.onToggleFiles}><PanelRight size={17} strokeWidth={1.25}/></button>
  </nav>;
}
