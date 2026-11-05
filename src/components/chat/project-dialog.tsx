'use client';
import {useLocale} from '@/components/studio/locale';
import {FolderPlus,X} from 'lucide-react';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import type {useProjectEditor} from '@/hooks/use-project-editor';
export function ProjectDialog({editor}:{editor:ReturnType<typeof useProjectEditor>}){
  const {t}=useLocale();
 const {edit,busy,error}=editor;
 return <Dialog open={!!edit} onOpenChange={open=>{if(!open)editor.close();}}><DialogContent className="project-dialog" showCloseButton={false}>
  <form onSubmit={e=>{e.preventDefault();void editor.save();}}>
   <div className="project-dialog-title"><DialogTitle>{edit?.id?t("Edit project","แก้ไขโปรเจกต์"):t("Create project","สร้างโปรเจกต์")}</DialogTitle><button className="chat-icon" type="button" aria-label={t("Close project settings","ปิดตั้งค่า Project")} disabled={busy} onClick={editor.close}><X size={16}/></button></div>
   <DialogDescription>{t("Choose a name and folders for this project","ชื่อและโฟลเดอร์สำหรับงานในโปรเจกต์นี้")}</DialogDescription>
   <label htmlFor="project-name">{t("Project name","ชื่อโปรเจกต์")}</label><input id="project-name" value={edit?.name??''} onChange={e=>editor.name(e.target.value)} placeholder={edit?.folderName||t("Choose a folder to suggest a name","เลือกโฟลเดอร์เพื่อตั้งชื่อ")} maxLength={80} autoFocus/>
   {(['source','output'] as const).map(kind=><div className="project-directory-row" key={kind}><div><label>{kind==='source'?t("Source folder","โฟลเดอร์ต้นทาง"):t("Output folder","โฟลเดอร์เก็บผลงาน")}</label><p title={kind==='source'?edit?.sourcePath:edit?.outputPath}>{(kind==='source'?edit?.sourcePath:edit?.outputPath)||t("No folder selected","ยังไม่ได้เลือกโฟลเดอร์")}</p></div><button type="button" className="project-folder-button" disabled={busy} onClick={()=>void editor.pick(kind)} aria-label={kind==='source'?t("Choose source folder","เลือกโฟลเดอร์ต้นทาง"):t("Choose output folder","เลือกโฟลเดอร์ผลงาน")}><FolderPlus size={15}/>{kind==='source'&&!edit?.sourcePath?t("Choose folder","เลือกโฟลเดอร์"):t("Change","เปลี่ยน")}</button></div>)}
   {error&&<p role="alert" className="project-dialog-error">{error}</p>}
   <div className="project-dialog-actions"><button type="button" disabled={busy} onClick={editor.close}>{t("Cancel","ยกเลิก")}</button><button type="submit" disabled={busy||!edit?.sourcePath}>{busy?t("Saving…","กำลังบันทึก…"):edit?.id?t("Save","บันทึก"):t("Create project","สร้างโปรเจกต์")}</button></div>
  </form>
 </DialogContent></Dialog>;
}
