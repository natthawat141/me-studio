'use client';
import { useState } from 'react';
import { ChevronDown,ChevronRight,File,Folder,FolderOpen,FolderPlus,Maximize2,Minimize2,PanelRight,RefreshCw,Search,X } from 'lucide-react';
import type { WorkspaceEntry,WorkspacePreview } from '@/lib/workspace-files';
import type { useWorkspaceFiles } from '@/hooks/use-workspace-files';
import './workspace-panel.css';
type Controller=ReturnType<typeof useWorkspaceFiles>;

export function WorkspacePanel({files,onClose}:{files:Controller;onClose:()=>void}) {
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
      {entry.kind==='directory'&&files.expanded[entry.id]&&files.folders[entry.id]&&<ul role="group">{rows(files.folders[entry.id].entries,depth+1,entry.id)}{files.folders[entry.id].truncated&&<li className="workspace-tree-note">แสดง 500 รายการแรก</li>}</ul>}
    </li>);
  }
  return <section id="workspace-panel" className={`workspace-panel ${expanded?'is-expanded':''}`} aria-label="ไฟล์และพรีวิว">
    <header className="workspace-header">
      <div className="workspace-breadcrumb" aria-label="ตำแหน่งไฟล์"><FolderOpen size={15} strokeWidth={1.25}/><span title={files.root?.directory.name}>{files.root?.directory.name??'ไฟล์'}</span>{file&&<><ChevronRight size={12}/><span className="workspace-current-file" title={file.entry.relativePath}>{file.entry.relativePath}</span><button className="chat-icon workspace-close-file" aria-label={`ปิดไฟล์ ${file.entry.name}`} onClick={files.closeFile}><X size={13}/></button></>}</div>
      <div className="workspace-header-actions">
        {files.root&&<><button className="chat-icon" aria-label="เลือกโฟลเดอร์อื่น" title="เลือกโฟลเดอร์อื่น" onClick={()=>void files.choose()} disabled={files.pending}><FolderPlus size={16} strokeWidth={1.25}/></button><button className="chat-icon" aria-label="รีเฟรชไฟล์" title="รีเฟรชไฟล์" onClick={()=>void files.refresh()} disabled={files.pending}><RefreshCw size={15} strokeWidth={1.25}/></button></>}
        {file&&<><button className={`chat-icon workspace-tree-toggle ${treeVisible?'is-active':''}`} aria-label={treeVisible?'ซ่อนรายการไฟล์':'แสดงรายการไฟล์'} title={treeVisible?'ซ่อนรายการไฟล์':'แสดงรายการไฟล์'} aria-pressed={treeVisible} onClick={()=>setTreeVisible(!treeVisible)}><PanelRight size={16} strokeWidth={1.25}/></button><button className={`chat-icon workspace-list-toggle ${listExpanded?'is-active':''}`} aria-label={listExpanded?'กลับไปดูไฟล์':'แสดงรายการไฟล์'} aria-pressed={listExpanded} onClick={()=>setListExpanded(!listExpanded)}><PanelRight size={16} strokeWidth={1.25}/></button></>}
        <button className="chat-icon" aria-label={expanded?'ย่อแผงไฟล์':'ขยายแผงไฟล์'} title={expanded?'ย่อแผงไฟล์':'ขยายแผงไฟล์'} onClick={()=>setExpanded(!expanded)}>{expanded?<Minimize2 size={16}/>:<Maximize2 size={16}/>}</button><button className="chat-icon" aria-label="ปิดแผงไฟล์" title="ปิดแผงไฟล์" onClick={onClose}><X size={18} strokeWidth={1.25}/></button>
      </div>
    </header>
    {files.error&&<p className="workspace-error" role="alert">{files.error}</p>}
    {!files.root?<div className="workspace-welcome"><FolderOpen size={27} strokeWidth={1.1}/><h2>เปิดไฟล์ของคุณ</h2><p>เลือกโฟลเดอร์ แล้วเปิดวิดีโอ รูปภาพ เสียง หรือข้อความดูข้างแชต</p><button className="chat-button" onClick={()=>void files.choose()} disabled={files.pending}><FolderPlus size={15} strokeWidth={1.25}/>{files.pending?'กำลังเปิด…':'เลือกโฟลเดอร์'}</button></div>:<>
      <div className={`workspace-body ${file?'has-file':''} ${listExpanded?'list-expanded':''} ${treeVisible?'':'tree-hidden'}`}>
        {file&&<WorkspaceFilePreview key={file.entry.id} file={file}/>}
        <aside className="workspace-browser" aria-label="รายการไฟล์">
          <label className="workspace-filter"><Search size={14} strokeWidth={1.25}/><input aria-label="กรองไฟล์ในรายการ" placeholder="กรองไฟล์…" value={query} onChange={e=>setQuery(e.target.value)}/></label>
          <ul className="workspace-tree" role="tree" aria-label={`ไฟล์ใน ${files.root.directory.name}`} onKeyDown={e=>{
            if(!['ArrowUp','ArrowDown','Home','End'].includes(e.key))return;e.preventDefault();
            const items=Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>('[role="treeitem"]'));const index=items.indexOf(document.activeElement as HTMLButtonElement);
            const next=e.key==='Home'?0:e.key==='End'?items.length-1:Math.max(0,Math.min(items.length-1,index+(e.key==='ArrowDown'?1:-1)));items[next]?.focus();
          }}>{rows(files.root.entries)}
            {!files.root.entries.length&&<li className="workspace-tree-note">โฟลเดอร์นี้ไม่มีไฟล์ที่แสดงได้</li>}
            {!!files.root.entries.length&&!files.root.entries.some(e=>e.kind==='directory'||e.name.toLocaleLowerCase().includes(query.toLocaleLowerCase()))&&<li className="workspace-tree-note">ไม่พบไฟล์ที่ตรงกัน</li>}
            {files.root.truncated&&<li className="workspace-tree-note">แสดง 500 รายการแรก กรุณาเลือกโฟลเดอร์ย่อย</li>}
          </ul>
        </aside>
      </div>
    </>}
  </section>;
}
function WorkspaceFilePreview({file}:{file:WorkspacePreview}) {
  const [error,setError]=useState(false);
  return <div className={`workspace-file-preview file-kind-${file.kind}`} aria-label={`พรีวิว ${file.entry.name}`}>
    {file.kind==='video'&&<video controls playsInline preload="metadata" src={file.src} aria-label={file.entry.name} onError={()=>setError(true)}/>}
    {file.kind==='audio'&&<div className="workspace-audio"><File size={30} strokeWidth={1}/><span>{file.entry.name}</span><audio controls preload="metadata" src={file.src} aria-label={file.entry.name} onError={()=>setError(true)}/></div>}
    {file.kind==='image'&&<LocalImage src={file.src!} name={file.entry.name} onError={()=>setError(true)}/>}
    {file.kind==='text'&&<pre tabIndex={0}>{file.text}</pre>}
    {file.kind==='unsupported'&&<p className="workspace-unsupported">ยังไม่รองรับพรีวิวไฟล์ประเภทนี้</p>}
    {error&&<p className="workspace-error" role="alert">เปิดไฟล์นี้ไม่สำเร็จ ไฟล์อาจเปลี่ยนแปลงหรือใช้รูปแบบที่เครื่องเล่นไม่รองรับ</p>}
  </div>;
}
function LocalImage({src,name,onError}:{src:string;name:string;onError:()=>void}){
  // Local capability URLs are streamed by Electron, not Next's HTTP image optimizer.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={name} onError={onError}/>;
}
