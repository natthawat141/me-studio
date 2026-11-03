'use client';
import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, FileImage, Film, FolderPlus, Paperclip, Play } from 'lucide-react';
import { Brand } from '@/components/layout/brand';
import { ChatComposer } from '@/components/chat/chat-composer';
import { ChatSidebar, ChatSidebarRail } from '@/components/chat/chat-sidebar';
import { DesktopNavigation } from '@/components/layout/desktop-navigation';
import { ChatSearch } from '@/components/chat/chat-search';
import { ChatSettings } from '@/components/settings/chat-settings';
import { ChatArtifactPreview } from '@/components/preview/chat-artifact-preview';
import { WorkspacePanel } from '@/components/preview/workspace-panel';
import { useWorkspaceFiles } from '@/hooks/use-workspace-files';
import { useChatPrototype } from '@/hooks/use-chat-prototype';
import type { ChatArtifact } from '@/lib/chat-prototype';
import type { FolderProject } from '@/lib/workspace-files';
import { workspaceFiles } from '@/services/workspace-files';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import './desktop-screen.css';
import './desktop-theme.css';

export function DesktopScreen() {
  const chat = useChatPrototype();
  const [videoConnected,setVideoConnected]=useState(false);
  const [videoStatus,setVideoStatus]=useState('');
  useEffect(()=>{void window.meStudioFiles?.videoStatus?.().then(v=>setVideoConnected(v.configured));},[]);
  async function connectVideo(){try{const configured=await workspaceFiles().loadVideoKeys?.();if(configured?.configured){setVideoConnected(true);chat.selectProvider('openai');chat.provider({id:'openai',name:'OpenAI',endpoint:'https://api.openai.com/v1',modelId:'gpt-6-luna',modelLabel:'GPT-6 Luna'});setVideoStatus('โหลดคีย์แล้ว · สั่งสร้างวิดีโอใน Project ได้');}}catch{setVideoStatus('เชื่อมต่อไม่สำเร็จ ตรวจไฟล์คีย์ในเครื่อง');}}
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsCategory, setSettingsCategory] = useState<'general' | 'providers'>('general');
  const [searchOpen, setSearchOpen] = useState(false);
  const [artifact, setArtifact] = useState<ChatArtifact>();
  const [previewWidth, setPreviewWidth] = useState(440);
  const [filesOpen,setFilesOpen]=useState(false);
  const [filesWidth,setFilesWidth]=useState(700);
  const workspace=useWorkspaceFiles();
  const [projects,setProjects]=useState<FolderProject[]>([]);
  const [projectId,setProjectId]=useState<string>();
  const [projectName,setProjectName]=useState('');
  const [projectFolder,setProjectFolder]=useState<FolderProject|null>(null);
  const [creatingProject,setCreatingProject]=useState(false);
  const [projectBusy,setProjectBusy]=useState(false);
  const [editingProject,setEditingProject]=useState<string>();
  const editedProject=projects.find(p=>p.id===editingProject);
  async function changeProjectDirectory(output=false) {
    if(!editingProject||projectBusy)return;setProjectBusy(true);setProjectError('');
    try { const bridge=workspaceFiles();const updated=output?await bridge.setProjectOutput?.({id:editingProject}):await bridge.relinkProject({id:editingProject});
      if(updated){setProjects(await bridge.projects());if(!output&&projectId===editingProject)await workspace.activate(editingProject);}
    } catch {setProjectError('เปลี่ยนโฟลเดอร์ไม่สำเร็จ กรุณาลองอีกครั้ง');}finally{setProjectBusy(false);}
  }
  const [projectError,setProjectError]=useState('');
  const restoredProject=useRef(false);
  useEffect(()=>{
    if(!chat.ready||restoredProject.current)return;
    restoredProject.current=true;
    const id=chat.active.projectId;
    if(id)queueMicrotask(()=>{setProjectId(id);void workspace.activate(id).then(ok=>{if(!ok){setProjectError('เปิดโฟลเดอร์ Project ไม่ได้ อาจถูกย้ายหรือไม่มีสิทธิ์เข้าถึง');setFilesOpen(true);}});});
  },[chat.ready,chat.active.projectId,workspace]);
  useEffect(()=>{ if(!window.meStudioFiles) return; void window.meStudioFiles.projects().then(setProjects).catch(()=>setProjectError('อ่านรายการ Project ไม่สำเร็จ ข้อมูลเดิมยังอยู่')); },[]);
  async function selectProject(id:string) {
    if(projectBusy)return;
    setProjectError(''); setArtifact(undefined);
    if(!id){setProjectId(undefined);workspace.clear();return;}
    setProjectBusy(true); setProjectId(id);
    const thread=chat.state.threads.find(t=>t.projectId===id);
    if(thread)chat.setActiveId(thread.id); else chat.newChat(id);
    const ok=await workspace.activate(id);
    if(!ok){setProjectError('เปิดโฟลเดอร์ Project ไม่ได้ อาจถูกย้ายหรือไม่มีสิทธิ์เข้าถึง');setFilesOpen(true);}
    setProjectBusy(false);
  }
  async function newChatInProject(id:string) {
    if(projectBusy)return;setProjectBusy(true);setProjectError('');setProjectId(id);setArtifact(undefined);chat.newChat(id);
    const ok=await workspace.activate(id);if(!ok){setProjectError('เปิดโฟลเดอร์ Project ไม่ได้ อาจถูกย้ายหรือไม่มีสิทธิ์เข้าถึง');setFilesOpen(true);}setProjectBusy(false);
  }
  async function pickProjectFolder() {
    if(projectBusy)return; setProjectBusy(true); setProjectError('');
    try {const folder=await workspaceFiles().pickProjectFolder();if(folder)setProjectFolder(folder);}
    catch {setProjectError('เลือกโฟลเดอร์ไม่สำเร็จ กรุณาใช้แอป me studio บน Mac');}
    finally {setProjectBusy(false);}
  }
  function closeProjectDialog() {if(projectBusy)return;setCreatingProject(false);setProjectFolder(null);setProjectName('');setProjectError('');}
  async function createProject(event:React.FormEvent) {
    event.preventDefault();if(!projectName.trim()||!projectFolder||projectBusy)return;
    setProjectBusy(true);setProjectError('');
    try { const project=await workspaceFiles().createProject({name:projectName.trim(),selectionId:projectFolder.id});
      if(project){setProjects(await workspaceFiles().projects());setProjectId(project.id);chat.newChat(project.id);setCreatingProject(false);setProjectName('');setProjectFolder(null);setFilesOpen(true);if(!await workspace.activate(project.id))setProjectError('เปิดโฟลเดอร์ Project ไม่สำเร็จ');}
    } catch(error){setProjectError(error instanceof Error&&error.message.includes('DUPLICATE_FOLDER')?'โฟลเดอร์นี้มี Project อยู่แล้ว':'สร้าง Project ไม่สำเร็จ กรุณาตรวจสอบแอปและโฟลเดอร์');}
    finally{setProjectBusy(false);}
  }
  async function relinkProject() {
    if(!projectId||projectBusy)return;setProjectBusy(true);setProjectError('');
    try {const result=await workspaceFiles().relinkProject({id:projectId});if(result){setProjects(await workspaceFiles().projects());if(!await workspace.activate(projectId))setProjectError('เปิดโฟลเดอร์ใหม่ไม่สำเร็จ');}}
    catch{setProjectError('เลือกโฟลเดอร์ใหม่ไม่สำเร็จ หรือโฟลเดอร์นี้มี Project อยู่แล้ว');}finally{setProjectBusy(false);}
  }
  const rightWidth=filesOpen?filesWidth:previewWidth;
  const setRightWidth=filesOpen?setFilesWidth:setPreviewWidth;
  const artifactTrigger = useRef<HTMLButtonElement | null>(null);
  const filesTrigger = useRef<HTMLButtonElement | null>(null);
  const end = useRef<HTMLDivElement | null>(null);
  const hasMessages = !!chat.active.messages.length;
  const prefs = chat.state.preferences;
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => { const dark = prefs.theme === 'dark' || (prefs.theme === 'system' && media.matches); document.documentElement.dataset.studioTheme = dark ? 'dark' : 'light'; document.documentElement.style.colorScheme = dark ? 'dark' : 'light'; };
    apply(); media.addEventListener('change', apply);
    return () => { media.removeEventListener('change', apply); delete document.documentElement.dataset.studioTheme; document.documentElement.style.colorScheme = ''; };
  }, [prefs.theme]);
  const newChatRef = useRef(chat.newChat);
  useEffect(() => { newChatRef.current = chat.newChat; });
  useEffect(() => {
    const keyboard = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.altKey || e.isComposing) return;
      if (e.key.toLowerCase() === 'k') { e.preventDefault(); setSearchOpen(true); }
      if (e.key.toLowerCase() === 'n' && !settingsOpen && !searchOpen) { e.preventDefault(); newChatRef.current(projectId); setArtifact(undefined); }
    };
    window.addEventListener('keydown', keyboard); return () => window.removeEventListener('keydown', keyboard);
  }, [settingsOpen, searchOpen, projectId]);
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }); }, [chat.active.id, chat.active.messages.length, chat.pendingId]);
  function openSettings(providers = false) { setSettingsCategory(providers ? 'providers' : 'general'); setSettingsOpen(true); }
  function selectChat(id: string, messageId?: string) {
    const selectedThread=chat.state.threads.find(t=>t.id===id);
    if(selectedThread?.projectId !== projectId) {
      setProjectId(selectedThread?.projectId); setProjectError('');
      if(selectedThread?.projectId) void workspace.activate(selectedThread.projectId).then(ok=>{if(!ok){setProjectError('เปิดโฟลเดอร์ Project ไม่ได้ อาจถูกย้ายหรือไม่มีสิทธิ์เข้าถึง');setFilesOpen(true);}});
      else workspace.clear();
    }
    chat.setActiveId(id); setArtifact(undefined);
    if (messageId) requestAnimationFrame(() => document.getElementById(`chat-message-${messageId}`)?.scrollIntoView({ block: 'center' }));
  }
  function newChat() { chat.newChat(projectId); setArtifact(undefined); }
  function closePreview() { setArtifact(undefined); requestAnimationFrame(() => artifactTrigger.current?.focus()); }
  function closeFiles() { setFilesOpen(false); requestAnimationFrame(() => filesTrigger.current?.focus()); }
  return <div className={`chat-app ${prefs.sidebarOpen ? '' : 'sidebar-collapsed'} ${prefs.reduceTransparency ? 'opaque-sidebar' : ''} ${prefs.compact ? 'compact-history' : ''}`}>
    <DesktopNavigation title={hasMessages ? chat.active.title : 'me studio'} sidebarOpen={prefs.sidebarOpen} onToggleSidebar={()=>chat.preferences({sidebarOpen:!prefs.sidebarOpen})} onNew={newChat} panelOpen={filesOpen} ref={filesTrigger} onToggleFiles={()=>{setFilesOpen(!filesOpen);setArtifact(undefined);}} fileName={filesOpen?workspace.selected?.entry.name:artifact?.title} onCloseFile={()=>{if(filesOpen)workspace.closeFile();else closePreview();}}/>
    {videoStatus&&<p className="video-status" role="status">{videoStatus}</p>}
    <div className="chat-workspace">
    {prefs.sidebarOpen ? <><button className="sidebar-scrim" aria-label="ปิดแถบด้านข้าง" onClick={() => chat.preferences({ sidebarOpen: false })} /><ChatSidebar threads={chat.state.threads} activeId={chat.activeId} onOpen={selectChat} onNew={newChat} onSearch={() => setSearchOpen(true)} onSettings={() => openSettings()} onRename={chat.rename} onDelete={chat.deleteChat} onNewInProject={id=>void newChatInProject(id)} projects={projects} projectId={projectId} onProject={id=>void selectProject(id)} onProjectSettings={id=>{setProjectError('');setEditingProject(id);}} onCreateProject={()=>setCreatingProject(true)} projectBusy={projectBusy} /></>:<ChatSidebarRail onNew={newChat} onSearch={()=>setSearchOpen(true)} onSettings={()=>openSettings()}/>}
    <main className={`chat-main ${hasMessages ? 'has-conversation' : 'is-home'}`}>
      {projectError&&<div className="project-error" role="alert">{projectError} {projectId&&<button onClick={()=>void relinkProject()} disabled={projectBusy}>เลือกโฟลเดอร์ใหม่</button>}<button aria-label="ปิดข้อความ Project" onClick={()=>setProjectError('')}>×</button></div>}
      {chat.storageError && <p className="chat-storage-error" role="alert">{chat.storageError}</p>}
      <div className="chat-content">
        {!hasMessages ? <h1 className="chat-home-brand"><Brand /></h1> : <div className="chat-messages" role="log" aria-label="บทสนทนา"><div className="message-column">{chat.active.messages.map(message => <article id={`chat-message-${message.id}`} className={`chat-message message-${message.role}`} key={message.id}>
          {message.role === 'assistant' && <div className="assistant-byline"><Brand />{message.sample && <span>คำตอบตัวอย่าง</span>}</div>}
          {!!message.text && <p>{message.text}</p>}
          {!!message.attachments?.length && <div className="message-attachments">{message.attachments.map((name, i) => <span key={i}><Paperclip size={13} />{name}</span>)}<small>แสดงชื่อไฟล์เท่านั้นในต้นแบบนี้</small></div>}
          {!!message.artifacts?.length && <div className="chat-artifacts">{message.artifacts.map(item => <button className={`chat-artifact artifact-${item.kind}`} key={item.id} aria-label={`ดู${item.title}`} onClick={e => { artifactTrigger.current = e.currentTarget; setFilesOpen(false);if(item.nativeProjectId){void workspaceFiles().videoArtifact?.({id:item.id,projectId:item.nativeProjectId}).then(a=>setArtifact({...item,src:a.url})).catch(()=>setVideoStatus('ไม่พบไฟล์ผลงาน อาจถูกย้ายหรือลบ'));}else setArtifact(item); }}>
            <span className="artifact-thumbnail" style={item.poster?{ backgroundImage: `url(${item.poster})` }:{background:'#202a3a'}}>{item.kind === 'video' && <span className="artifact-play"><Play size={17} fill="currentColor" /></span>}</span>
            <span className="artifact-card-copy"><span>{item.kind === 'video' ? <Film size={15} /> : <FileImage size={15} />}{item.title}</span><small>{item.kind === 'video' ? 'MP4' : 'JPG'} · {item.nativeProjectId?'ผลงานที่สร้าง':'ไฟล์ตัวอย่าง'}</small></span><ArrowUpRight size={15} className="artifact-card-arrow" />
          </button>)}</div>}
        </article>)}{chat.pendingId === chat.active.id && <p className="sample-loading" role="status">{videoConnected?'กำลังสร้างวิดีโอ…':'กำลังแสดงคำตอบตัวอย่าง'}<span>•••</span></p>}<div ref={end} /></div></div>}
        <div className="chat-composer-area"><ChatComposer live={videoConnected} threadId={chat.active.id} value={chat.active.draft} onChange={chat.draft} onSend={files=>{if(!videoConnected)return chat.send(files);if(chat.state.selectedProvider!=='openai'){setVideoStatus('รอบนี้ใช้ OpenAI / GPT-6 Luna กรุณาเลือก OpenAI');return false;}if(!projectId){setVideoStatus('เลือก Project ที่มีโฟลเดอร์ก่อนสร้างวิดีโอ');return false;}if(files.length){setVideoStatus('รอบนี้ยังไม่นำไฟล์แนบมาสร้างวิดีโอ');return false;}return chat.sendProduction(projectId);}} pending={chat.pendingId === chat.active.id} busy={!!chat.pendingId} disabled={!chat.ready || settingsOpen || searchOpen} onStop={chat.stop} providers={chat.state.providers} selected={chat.state.selectedProvider} onSelect={chat.selectProvider} onSettings={() => openSettings(true)} /></div>
      </div>
    </main>
    {(artifact||filesOpen) && <><div className="preview-resizer" role="separator" tabIndex={0} aria-label="ปรับขนาดพรีวิว" aria-orientation="vertical" aria-valuemin={300} aria-valuemax={900} aria-valuenow={rightWidth} onKeyDown={e => { if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); setRightWidth(w => Math.max(300, Math.min(900, w + (e.key === 'ArrowLeft' ? 24 : -24)))); } }} onPointerDown={e => {
      const handle = e.currentTarget, start = e.clientX, width = rightWidth; handle.setPointerCapture(e.pointerId);
      const move = (event: PointerEvent) => setRightWidth(Math.max(300, Math.min(900, width + start - event.clientX)));
      const up = () => { handle.removeEventListener('pointermove', move); handle.removeEventListener('pointerup', up); handle.removeEventListener('pointercancel', up); };
      handle.addEventListener('pointermove', move); handle.addEventListener('pointerup', up); handle.addEventListener('pointercancel', up);
    }} /><div className="preview-container" style={{ width:rightWidth }}>{filesOpen?<WorkspacePanel files={projectId?{...workspace,choose:relinkProject}:workspace} onClose={closeFiles}/>:artifact&&<ChatArtifactPreview key={artifact.id} artifact={artifact} onDownload={artifact.nativeProjectId?()=>{void workspaceFiles().saveVideo?.({id:artifact.id,projectId:artifact.nativeProjectId!}).catch(()=>setVideoStatus('บันทึกไฟล์ไม่สำเร็จ'));}:undefined} onClose={closePreview}/>}</div></>}
    </div>
    <Dialog open={creatingProject} onOpenChange={open=>{if(!open)closeProjectDialog();}}><DialogContent className="project-dialog" showCloseButton={false}><form onSubmit={e=>void createProject(e)}>
      <div className="project-dialog-title"><DialogTitle>สร้างโปรเจกต์</DialogTitle><button className="chat-icon" type="button" aria-label="ปิด" onClick={closeProjectDialog}>×</button></div>
      <label htmlFor="project-name">ชื่อโปรเจกต์</label><input id="project-name" value={projectName} onChange={e=>setProjectName(e.target.value)} placeholder="ชื่อโปรเจกต์" maxLength={80} autoFocus />
      <label>โฟลเดอร์ต้นทาง</label><div className="project-folder-choice"><DialogDescription>{projectFolder ? projectFolder.name : 'เพิ่มโฟลเดอร์ในคอมพิวเตอร์เครื่องนี้'}</DialogDescription><button type="button" className="project-folder-button" onClick={()=>void pickProjectFolder()} disabled={projectBusy}><FolderPlus size={15} strokeWidth={1.4}/>{projectFolder?'เปลี่ยนโฟลเดอร์':'เลือกโฟลเดอร์'}</button></div>
      {projectError&&<p role="alert" className="project-dialog-error">{projectError}</p>}
      <div className="project-dialog-actions"><button type="button" onClick={closeProjectDialog} disabled={projectBusy}>ยกเลิก</button><button type="submit" disabled={!projectName.trim()||!projectFolder||projectBusy}>สร้างโปรเจกต์</button></div>
    </form></DialogContent></Dialog>
    <Dialog open={!!editedProject} onOpenChange={open=>{if(!open&&!projectBusy)setEditingProject(undefined);}}><DialogContent className="project-dialog directory-dialog" showCloseButton={false}>
      <div className="project-dialog-title"><DialogTitle>ตั้งค่า {editedProject?.name}</DialogTitle><button className="chat-icon" aria-label="ปิดตั้งค่า Project" disabled={projectBusy} onClick={()=>setEditingProject(undefined)}>×</button></div>
      <DialogDescription>โฟลเดอร์สำหรับ Project นี้</DialogDescription>
      <div className="directory-setting"><h3>โฟลเดอร์ที่เปิดอ่านได้</h3><p>{editedProject?.sourcePath || editedProject?.folderName}</p><small>แผงไฟล์อ่านได้เฉพาะโฟลเดอร์นี้และโฟลเดอร์ย่อย</small><button className="chat-button" disabled={projectBusy} onClick={()=>void changeProjectDirectory()}>เลือกโฟลเดอร์ต้นทาง</button></div>
      <div className="directory-setting"><h3>โฟลเดอร์เก็บผลงาน</h3><p>{editedProject?.outputPath || 'output ภายในโฟลเดอร์ต้นทาง'}</p><small>บันทึกตำแหน่งไว้สำหรับระบบสร้างวิดีโอ ปัจจุบันแชตตัวอย่างยังไม่เขียนไฟล์</small><button className="chat-button" disabled={projectBusy} onClick={()=>void changeProjectDirectory(true)}>เลือกโฟลเดอร์ผลงาน</button></div>
      {projectError&&<p role="alert" className="project-dialog-error">{projectError}</p>}
    </DialogContent></Dialog>
    <ChatSettings open={settingsOpen} onOpenChange={setSettingsOpen} initialCategory={settingsCategory} providers={chat.state.providers} onSave={chat.provider} onConnectVideo={()=>void connectVideo()} videoConnected={videoConnected} preferences={prefs} onPreferences={chat.preferences} />
    <ChatSearch open={searchOpen} onOpenChange={setSearchOpen} threads={chat.state.threads} activeId={chat.activeId} onSelect={selectChat} onNew={newChat} onSettings={() => openSettings()} onArtifact={(threadId, file) => { selectChat(threadId); artifactTrigger.current = null; setFilesOpen(false);setArtifact(file); }} />
  </div>;
}
