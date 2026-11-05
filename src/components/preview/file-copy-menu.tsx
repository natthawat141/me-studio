'use client';
import {Save,FolderOpen} from 'lucide-react';
import {useLocale} from '@/components/studio/locale';
import {DropdownMenu,DropdownMenuContent,DropdownMenuItem,DropdownMenuTrigger} from '@/components/ui/dropdown-menu';

export function FileCopyMenu({label,disabled,className='chat-icon',onSave}:{label?:string;disabled?:boolean;className?:string;onSave:(destination:'downloads'|'choose')=>void}){
 const {t}=useLocale();
 return <DropdownMenu><DropdownMenuTrigger render={<button className={className} disabled={disabled} aria-label={label??t('Save a copy…','บันทึกสำเนา…')} title={t('Save a copy…','บันทึกสำเนา…')}/>}><Save size={14} strokeWidth={1.3}/></DropdownMenuTrigger><DropdownMenuContent className="chat-menu" align="end">
  <DropdownMenuItem onClick={()=>onSave('downloads')}><Save size={14} strokeWidth={1.3}/>{t('Save to Downloads','บันทึกลง Downloads')}</DropdownMenuItem>
  <DropdownMenuItem onClick={()=>onSave('choose')}><FolderOpen size={14} strokeWidth={1.3}/>{t('Choose another folder…','เลือกโฟลเดอร์อื่น…')}</DropdownMenuItem>
 </DropdownMenuContent></DropdownMenu>;
}
