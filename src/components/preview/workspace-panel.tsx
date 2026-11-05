'use client';
import {useLocale} from '@/components/studio/locale';
import { useEffect,useRef,useState } from 'react';
import { ChevronDown,ChevronRight,File,FileCog,Folder,FolderOpen,FolderPlus,Maximize2,Minimize2,PanelRight,RefreshCw,Search } from 'lucide-react';
import {FileCopyMenu} from './file-copy-menu';
import type { WorkspaceEntry,WorkspacePreview } from '@/lib/workspace-files';
import type { useWorkspaceFiles } from '@/hooks/use-workspace-files';
import './workspace-panel.css';
type Controller=ReturnType<typeof useWorkspaceFiles>;

export function WorkspacePanel({files,onOpenConfig}:{files:Controller;onOpenConfig?:()=>void}) {
  const {t}=useLocale();
  const [query,setQuery]=useState('');
  const [expanded,setExpanded]=useState(false);
  const [listExpanded,setListExpanded]=useState(false);
  const [treeVisible,setTreeVisible]=useState(true);
  const file=files.selected;
  async function open(entry:WorkspaceEntry){if(entry.kind==='directory')await files.toggle(entry.id);else{await files.openFile(entry.id);setListExpanded(false);}}
  function rows(entries:WorkspaceEntry[],depth=0,parent=''):React.ReactNode {
    return entries.filter(e=>e.kind==='directory'||e.name.toLocaleLowerCase().includes(query.toLocaleLowerCase())).map(entry=><li role="none" key={entry.id}>
      <button role="treeitem" aria-label={entry.name} title={entry.relativePath} aria-expanded={entry.kind==='directory'?!!files.expanded[entry.id]:undefined} aria-selected={file?.entry.id===entry.id} data-entry={entry.id} data-parent={parent} className="workspace-tree-row" style={{paddingLeft:10+depth*15}} disabled={files.pending} onClick={()=>void open(entry)} onKeyDown={e=>{
        if(e.key==='ArrowRight'&&entry.kind==='directory'&&!files.expanded[entry.id]){e.preventDefault();void files.toggle(entry.id);}
        if(e.key==='ArrowLeft'){e.preventDefault();if(entry.kind==='directory'&&files.expanded[entry.id])void files.toggle(entry.id);else if(parent){const tree=e.currentTarget.closest('[role="tree"]');Array.from(tree?.querySelectorAll<HTMLButtonElement>('[role="treeitem"]')??[]).find(el=>el.dataset.entry===parent)?.focus();}}
      }}>
        {entry.kind==='directory'?(files.expanded[entry.id]?<ChevronDown size={12}/>:<ChevronRight size={12}/>):<span className="tree-indent"/>}
        {entry.kind==='directory'?<Folder size={15} strokeWidth={1.25}/>:<File size={14} strokeWidth={1.25}/>}<span>{entry.name}</span>
      </button>
      {entry.kind==='directory'&&files.expanded[entry.id]&&files.folders[entry.id]&&<ul role="group">{rows(files.folders[entry.id].entries,depth+1,entry.id)}{files.folders[entry.id].truncated&&<li className="workspace-tree-note">{t("Showing the first 500 items","แสดง 500 รายการแรก")}</li>}</ul>}
    </li>);
  }
  return <section id="workspace-panel" className={`workspace-panel ${expanded?'is-expanded':''}`} aria-label={t("Files and preview","ไฟล์และพรีวิว")}>
    <header className="workspace-header">
      <div className="workspace-breadcrumb" aria-label={t("File location","ตำแหน่งไฟล์")}><FolderOpen size={15} strokeWidth={1.25}/><span title={files.root?.directory.name}>{files.root?.directory.name??t("Files","ไฟล์")}</span>{file&&<><ChevronRight size={12}/><span className="workspace-current-file" title={file.entry.relativePath}>{file.entry.relativePath}</span></>}</div>
      <div className="workspace-header-actions">
        {file&&<><button className="chat-icon" aria-label={t('Show in Finder','แสดงใน Finder')} title={t('Show in Finder','แสดงใน Finder')} onClick={()=>void files.revealSelected()}><FolderOpen size={15} strokeWidth={1.25}/></button><FileCopyMenu disabled={files.saving} onSave={destination=>void files.saveSelectedCopy(destination)}/></>}
        {onOpenConfig&&<button className="chat-icon" aria-label={t("Open config.env","เปิด config.env")} title={t("Open config.env","เปิด config.env")} onClick={onOpenConfig}><FileCog size={15} strokeWidth={1.25}/></button>}
        {files.root&&<><button className="chat-icon" aria-label={t("Choose another folder","เลือกโฟลเดอร์อื่น")} title={t("Choose another folder","เลือกโฟลเดอร์อื่น")} onClick={()=>void files.choose()} disabled={files.pending}><FolderPlus size={16} strokeWidth={1.25}/></button><button className="chat-icon" aria-label={t("Refresh files","รีเฟรชไฟล์")} title={t("Refresh files","รีเฟรชไฟล์")} onClick={()=>void files.refresh()} disabled={files.pending}><RefreshCw size={15} strokeWidth={1.25}/></button></>}
        {file&&<><button className={`chat-icon workspace-tree-toggle ${treeVisible?'is-active':''}`} aria-label={treeVisible?t("Hide files","ซ่อนรายการไฟล์"):t("Show files","แสดงรายการไฟล์")} title={treeVisible?t("Hide files","ซ่อนรายการไฟล์"):t("Show files","แสดงรายการไฟล์")} aria-pressed={treeVisible} onClick={()=>setTreeVisible(!treeVisible)}><PanelRight size={16} strokeWidth={1.25}/></button><button className={`chat-icon workspace-list-toggle ${listExpanded?'is-active':''}`} aria-label={listExpanded?t("Back to file","กลับไปดูไฟล์"):t("Show files","แสดงรายการไฟล์")} aria-pressed={listExpanded} onClick={()=>setListExpanded(!listExpanded)}><PanelRight size={16} strokeWidth={1.25}/></button></>}

      </div>
    </header>
    {files.error&&<p className="workspace-error" role="alert">{files.error}</p>}
    {files.notice&&<p className="workspace-file-notice" role="status">{t('Copy saved','บันทึกสำเนาแล้ว')}</p>}
    {!files.root&&!file?<div className="workspace-welcome"><FolderOpen size={27} strokeWidth={1.1}/><h2>{t("Open your files","เปิดไฟล์ของคุณ")}</h2><p>{t("Choose a folder to preview video, images, audio, or text beside your chat.","เลือกโฟลเดอร์ แล้วเปิดวิดีโอ รูปภาพ เสียง หรือข้อความดูข้างแชต")}</p><button className="chat-button" onClick={()=>void files.choose()} disabled={files.pending}><FolderPlus size={15} strokeWidth={1.25}/>{files.pending?t("Opening…","กำลังเปิด…"):t("Choose folder","เลือกโฟลเดอร์")}</button></div>:<>
      <div className={`workspace-body ${file?'has-file':''} ${listExpanded?'list-expanded':''} ${treeVisible?'':'tree-hidden'}`}>
        {file&&<WorkspaceFilePreview key={file.entry.id} file={file}/>}
        {files.root&&<aside className="workspace-browser" aria-label={t("Files","รายการไฟล์")}>
          <label className="workspace-filter"><Search size={14} strokeWidth={1.25}/><input aria-label={t("Filter files","กรองไฟล์ในรายการ")} placeholder={t("Filter files…","กรองไฟล์…")} value={query} onChange={e=>setQuery(e.target.value)}/></label>
          <ul className="workspace-tree" role="tree" aria-label={`ไฟล์ใน ${files.root.directory.name}`} onKeyDown={e=>{
            if(!['ArrowUp','ArrowDown','Home','End'].includes(e.key))return;e.preventDefault();
            const items=Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>('[role="treeitem"]'));const index=items.indexOf(document.activeElement as HTMLButtonElement);
            const next=e.key==='Home'?0:e.key==='End'?items.length-1:Math.max(0,Math.min(items.length-1,index+(e.key==='ArrowDown'?1:-1)));items[next]?.focus();
          }}>{rows(files.root.entries)}
            {!files.root.entries.length&&<li className="workspace-tree-note">{t("No visible files in this folder","โฟลเดอร์นี้ไม่มีไฟล์ที่แสดงได้")}</li>}
            {!!files.root.entries.length&&!files.root.entries.some(e=>e.kind==='directory'||e.name.toLocaleLowerCase().includes(query.toLocaleLowerCase()))&&<li className="workspace-tree-note">{t("No matching files","ไม่พบไฟล์ที่ตรงกัน")}</li>}
            {files.root.truncated&&<li className="workspace-tree-note">{t("Showing the first 500 items. Choose a subfolder.","แสดง 500 รายการแรก กรุณาเลือกโฟลเดอร์ย่อย")}</li>}
          </ul>
        </aside>}
      </div>
    </>}
    <footer className="preview-bottom-actions"><button className="chat-icon" aria-label={expanded?t("Minimize files","ย่อแผงไฟล์"):t("Expand files","ขยายแผงไฟล์")} title={expanded?t("Minimize files","ย่อแผงไฟล์"):t("Expand files","ขยายแผงไฟล์")} onClick={()=>setExpanded(!expanded)}>{expanded?<Minimize2 size={16}/>:<Maximize2 size={16}/>}</button></footer>
  </section>;
}
function WorkspaceFilePreview({file}:{file:WorkspacePreview}) {
  const {t}=useLocale();
  const [error,setError]=useState(false);
  const [source,setSource]=useState(false);
  return <div className={`workspace-file-preview file-kind-${file.kind}`} aria-label={`พรีวิว ${file.entry.name}`}>
    {file.kind==='video'&&<video controls controlsList="nodownload" playsInline preload="metadata" src={file.src} aria-label={file.entry.name} onError={()=>setError(true)}/>}
    {file.kind==='audio'&&<div className="workspace-audio"><File size={30} strokeWidth={1}/><span>{file.entry.name}</span><audio controls preload="metadata" src={file.src} aria-label={file.entry.name} onError={()=>setError(true)}/></div>}
    {file.kind==='image'&&<LocalImage src={file.src!} name={file.entry.name} onError={()=>setError(true)}/>}
    {file.kind==='text'&&<div className="workspace-document">{file.previewSrc&&<nav className="workspace-document-tabs" aria-label={t("HTML view","มุมมอง HTML")}><button aria-pressed={!source} onClick={()=>setSource(false)}>{t("Preview","ตัวอย่าง")}</button><button aria-pressed={source} onClick={()=>setSource(true)}>{t("Source","โค้ด")}</button></nav>}{file.previewSrc&&!source?<HtmlPreviewFrame file={file}/>:<pre tabIndex={0}>{file.text}</pre>}{file.previewError&&<p className="workspace-error" role="alert">HTML นี้ไม่ผ่านการตรวจพรีวิว ({file.previewError}) ยังเปิดโค้ดดูได้</p>}</div>}
    {file.kind==='unsupported'&&<p className="workspace-unsupported">{t("This file type cannot be previewed","ยังไม่รองรับพรีวิวไฟล์ประเภทนี้")}</p>}
    {error&&<p className="workspace-error" role="alert">{t("Could not open this file. It may have changed or use an unsupported format.","เปิดไฟล์นี้ไม่สำเร็จ ไฟล์อาจเปลี่ยนแปลงหรือใช้รูปแบบที่เครื่องเล่นไม่รองรับ")}</p>}
  </div>;
}
function HtmlPreviewFrame({file}:{file:WorkspacePreview}){
  const box=useRef<HTMLDivElement>(null);const [size,setSize]=useState({width:1,height:1});
  useEffect(()=>{if(!box.current)return;const observer=new ResizeObserver(entries=>{const {width,height}=entries[0].contentRect;setSize({width,height});});observer.observe(box.current);return()=>observer.disconnect();},[]);
  const width=file.previewWidth??720,height=file.previewHeight??1280,scale=Math.min(size.width/width,size.height/height);
  return <div ref={box} className="workspace-html-stage"><iframe title={`ตัวอย่าง ${file.entry.name}`} src={file.previewSrc} sandbox="" referrerPolicy="no-referrer" style={{width,height,transform:`scale(${scale})`}}/></div>;
}
function LocalImage({src,name,onError}:{src:string;name:string;onError:()=>void}){
  // Local capability URLs are streamed by Electron, not Next's HTTP image optimizer.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={name} onError={onError}/>;
}
