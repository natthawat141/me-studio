import Link from 'next/link';
import { Folder, Library, MessageSquare, Settings } from 'lucide-react';
import './app-navigation.css';
const entries = [
  {id:'studio',href:'/',label:'สตูดิโอ',icon:MessageSquare},
  {id:'projects',href:'/projects',label:'โปรเจกต์',icon:Folder},
  {id:'library',href:'/library',label:'คลังไฟล์',icon:Library},
  {id:'settings',href:'/settings',label:'ตั้งค่า',icon:Settings},
] as const;
export function AppNavigation({active}:{active:(typeof entries)[number]['id']}) {
  return <nav className="app-navigation" aria-label="เมนูหลัก">{entries.map((entry) => {
    const Icon=entry.icon;
    return <Link className="app-navigation-link" href={entry.href} key={entry.id} aria-current={active===entry.id ? 'page' : undefined}><Icon size={18} />{entry.label}</Link>;
  })}</nav>;
}
