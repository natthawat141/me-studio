'use client';
import {useRef,useState} from 'react';
import {workspaceFiles} from '@/services/workspace-files';
import type {FolderProject,ProjectEdit} from '@/lib/workspace-files';
export function useProjectEditor(onSaved:(project:FolderProject,created:boolean)=>Promise<void>){
 const [edit,setEdit]=useState<ProjectEdit>();const [busy,setBusy]=useState(false);const [error,setError]=useState('');const generation=useRef(0);
 function message(e:unknown){const text=e instanceof Error?e.message:'';return text.includes('PROJECT_BUSY')?'รอให้งานจบ หรือหยุดงานก่อนเปลี่ยนโฟลเดอร์':text.includes('PROJECT_CONFLICT')?'Project ถูกเปลี่ยนแล้ว กรุณาปิดและเปิดหน้าต่างนี้ใหม่':text.includes('DUPLICATE_FOLDER')?'โฟลเดอร์นี้มี Project อยู่แล้ว':'บันทึกไม่สำเร็จ ตรวจโฟลเดอร์แล้วลองอีกครั้ง';}
 async function open(id?:string){if(busy)return;const version=++generation.current;setBusy(true);setError('');try{const bridge=workspaceFiles();if(!bridge.beginProjectEdit)throw Error('DESKTOP_UPDATE_REQUIRED');const next=await bridge.beginProjectEdit({id});if(version!==generation.current){void bridge.cancelProjectEdit?.({token:next.token});return;}setEdit(next);}catch(e){setError(message(e));}finally{setBusy(false);}}
 async function pick(kind:'source'|'output'){if(!edit||busy)return;setBusy(true);setError('');try{const next=await workspaceFiles().pickProjectDirectory?.({token:edit.token,kind});if(next)setEdit(current=>current?{...next,name:current.nameOrigin==='custom'?current.name:next.name,nameOrigin:current.nameOrigin}:current);}catch(e){setError(message(e));}finally{setBusy(false);}}
 function close(){if(busy)return;generation.current++;if(edit)void workspaceFiles().cancelProjectEdit?.({token:edit.token});setEdit(undefined);setError('');}
 async function save(){if(!edit||busy||!edit.sourcePath)return;setBusy(true);setError('');try{const bridge=workspaceFiles();if(!bridge.saveProjectEdit)throw Error('DESKTOP_UPDATE_REQUIRED');const saved=await bridge.saveProjectEdit({token:edit.token,name:edit.name,nameOrigin:edit.name.trim()?edit.nameOrigin:'folder'});setEdit(undefined);await onSaved(saved,!edit.id);}catch(e){setError(message(e));}finally{setBusy(false);}}
 return {edit,busy,error,open,pick,close,save,name:(name:string)=>setEdit(e=>e?{...e,name,nameOrigin:'custom'}:e)};
}
