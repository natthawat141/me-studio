'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { FolderPlus } from 'lucide-react';
import { Brand } from '@/components/layout/brand';
import { ChatTranscript } from '@/components/chat/chat-transcript';
import { ChatComposer } from '@/components/chat/chat-composer';
import { ChatSidebar, ChatSidebarRail } from '@/components/chat/chat-sidebar';
import { DesktopNavigation } from '@/components/layout/desktop-navigation';
import { ChatSearch } from '@/components/chat/chat-search';
import { ChatSettings } from '@/components/settings/chat-settings';
import { ChatArtifactPreview } from '@/components/preview/chat-artifact-preview';
import { WorkspacePanel } from '@/components/preview/workspace-panel';
import { useWorkspaceFiles } from '@/hooks/use-workspace-files';
import { useChatPrototype } from '@/hooks/use-chat-prototype';
import {useNativeModels} from '@/hooks/use-native-models';
import { useVideoConnection } from '@/hooks/use-video-connection';
import type { ChatArtifact } from '@/lib/chat-prototype';
import { chatWorkspaces, chatWorkspaceId, defaultWorkspaceId } from '@/lib/chat-workspaces';
import type { FolderProject, WorkspacePreview } from '@/lib/workspace-files';
import { workspaceFiles } from '@/services/workspace-files';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import './desktop-screen.css';
import './desktop-theme.css';

export function DesktopScreen() {
  const chat = useChatPrototype();
  const models=useNativeModels();
  const video=useVideoConnection();
  const {connected:videoConnected,status:videoStatus,setStatus:setVideoStatus}=video;
  async function connectVideo(){if(await video.connect()){chat.selectProvider('openai');chat.provider({id:'openai',name:'OpenAI',endpoint:'https://api.openai.com/v1',modelId:'gpt-6-luna',modelLabel:'GPT-6 Luna'});await models.refresh();}}
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsCategory, setSettingsCategory] = useState<'general' | 'providers'>('general');
  const [searchOpen, setSearchOpen] = useState(false);
  const [artifact, setArtifact] = useState<ChatArtifact>();
  const [previewWidth, setPreviewWidth] = useState(440);
  const [filesOpen,setFilesOpen]=useState(false);
  const [filesWidth,setFilesWidth]=useState(700);
  const workspace=useWorkspaceFiles();
  const [projects,setProjects]=useState<FolderProject[]>([]);
  const [projectsReady,setProjectsReady]=useState(false);
  const groups=useMemo(()=>chatWorkspaces(projects,projectsReady?[...chat.state.threads,...chat.state.drafts]:[]),[projects,projectsReady,chat.state.threads,chat.state.drafts]);
  const [messageId,setMessageId]=useState<string>();
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
  useEffect(()=>{ void (window.meStudioFiles?.projects()??Promise.resolve([])).then(setProjects).catch(()=>setProjectError('อ่านรายการ Project ไม่สำเร็จ ข้อมูลเดิมยังอยู่')).finally(()=>setProjectsReady(true)); },[]);
  const projectActivation=useRef(0);
  function activateChatProject(id?:string) {
    if(id===projectId)return;
    const version=++projectActivation.current;
    setProjectError('');setProjectId(id);
    if(!id){workspace.clear();return;}
    void workspace.activate(id).then(ok=>{if(version===projectActivation.current&&!ok)setProjectError('เปิดโฟลเดอร์ Project ไม่ได้ อาจถูกย้ายหรือไม่มีสิทธิ์เข้าถึง');});
  }
  function newChatInProject(id?:string) {
    activateChatProject(id);chat.newChat(id,true);
    chat.revealProject(chatWorkspaceId(id));setMessageId(undefined);
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
      if (e.key.toLowerCase() === 'n' && !settingsOpen && !searchOpen) { e.preventDefault(); newChatRef.current(projectId); }
    };
    window.addEventListener('keydown', keyboard); return () => window.removeEventListener('keydown', keyboard);
  }, [settingsOpen, searchOpen, projectId]);
  function openSettings(providers = false) { setSettingsCategory(providers ? 'providers' : 'general'); setSettingsOpen(true); }
  function selectChat(id: string, targetMessageId?: string) {
    const selectedThread=[...chat.state.threads,...chat.state.drafts].find(t=>t.id===id);
    if(!selectedThread)return;
    activateChatProject(selectedThread.projectId);
    chat.setActiveId(id); chat.revealProject(chatWorkspaceId(selectedThread.projectId));setMessageId(targetMessageId);
  }
  function newChat() { chat.newChat(projectId);chat.revealProject(chatWorkspaceId(projectId));setMessageId(undefined); }
  function closePreview() { setArtifact(undefined); requestAnimationFrame(() => artifactTrigger.current?.focus()); }
  function openChatFile(file:WorkspacePreview,trigger:HTMLButtonElement) { artifactTrigger.current=trigger;workspace.present(file);setArtifact(undefined);setFilesOpen(true); }
  function closeFiles() { setFilesOpen(false); requestAnimationFrame(() => filesTrigger.current?.focus()); }
  return <div className={`chat-app ${prefs.sidebarOpen ? '' : 'sidebar-collapsed'} ${prefs.reduceTransparency ? 'opaque-sidebar' : ''} ${prefs.compact ? 'compact-history' : ''}`}>
    <DesktopNavigation title={hasMessages ? chat.active.title : groups.find(p=>p.id===chatWorkspaceId(projectId))?.name??'me studio'} sidebarOpen={prefs.sidebarOpen} onToggleSidebar={()=>chat.preferences({sidebarOpen:!prefs.sidebarOpen})} onNew={newChat} panelOpen={filesOpen||!!artifact} ref={filesTrigger} onToggleFiles={()=>{if(artifact)closePreview();else if(filesOpen)closeFiles();else setFilesOpen(true);}} onOpenConfig={()=>void models.open()} fileName={filesOpen?workspace.selected?.entry.name:artifact?.title} onCloseFile={()=>{if(filesOpen)workspace.closeFile();else closePreview();}}/>
    {models.error&&!settingsOpen&&<p className="video-status" role="alert">{models.error}</p>}
    {videoStatus&&<p className="video-status" role="status">{videoStatus}</p>}
    <div className="chat-workspace">
    {prefs.sidebarOpen&&<button className="sidebar-scrim" aria-label="ปิดแถบด้านข้าง" onClick={() => chat.preferences({ sidebarOpen: false })} />}
    <div className="chat-sidebar-slot">
      <div className="sidebar-full" inert={!prefs.sidebarOpen} aria-hidden={!prefs.sidebarOpen}><ChatSidebar threads={chat.state.threads} activeId={chat.activeId} onOpen={selectChat} onNew={newChat} onSearch={() => setSearchOpen(true)} onSettings={() => openSettings()} onRename={chat.rename} onDelete={chat.deleteChat} onNewInProject={id=>newChatInProject(id===defaultWorkspaceId?undefined:id)} projects={groups} projectId={chatWorkspaceId(projectId)} collapsedProjects={prefs.collapsedProjects} onToggleProject={chat.toggleProject} scrollTop={prefs.sidebarScrollTop} onScrollTop={top=>chat.preferences({sidebarScrollTop:top})} ready={chat.ready&&projectsReady} onProjectSettings={id=>{setProjectError('');setEditingProject(id);}} onCreateProject={()=>setCreatingProject(true)} projectBusy={projectBusy} /></div>
      <div className="sidebar-rail" inert={prefs.sidebarOpen} aria-hidden={prefs.sidebarOpen}><ChatSidebarRail onNew={newChat} onSearch={()=>setSearchOpen(true)} onSettings={()=>openSettings()}/></div>
    </div>
    <main className={`chat-main ${hasMessages ? 'has-conversation' : 'is-home'}`}>
      {projectError&&<div className="project-error" role="alert">{projectError} {projectId&&<button onClick={()=>void relinkProject()} disabled={projectBusy}>เลือกโฟลเดอร์ใหม่</button>}<button aria-label="ปิดข้อความ Project" onClick={()=>setProjectError('')}>×</button></div>}
      {chat.storageError && <p className="chat-storage-error" role="alert">{chat.storageError}</p>}
      <div className="chat-content">
        <div className="chat-stage">
          {!hasMessages&&<h1 className="chat-home-brand chat-thread-enter" key={chat.active.id}><Brand /></h1>}
          <ChatTranscript onRetryMessage={typeof window!=='undefined'&&window.meStudioFiles?.produceVideo?(text,files)=>{void (async()=>{if(models.catalog&&!models.selection){setVideoStatus('เปิดใช้งานโมเดลอย่างน้อยหนึ่งรายการในตั้งค่า');return;}if(await video.prepareSend(projectId,models.selection?.provider??chat.state.selectedProvider)==='native'){setVideoStatus('');chat.sendProduction(projectId,files,models.selection,text||'ช่วยดูไฟล์ที่แนบให้หน่อย');}})();}:undefined} onChoice={text=>{void (async()=>{if(await video.prepareSend(projectId,models.selection?.provider??chat.state.selectedProvider)==='native')chat.sendProduction(projectId,[],models.selection,text);})();}} thread={chat.active} pending={chat.pendingId===chat.active.id} messageId={messageId} onOpenFile={openChatFile} onOpenArtifact={(resolved,trigger)=>{artifactTrigger.current=trigger;setFilesOpen(false);setArtifact(resolved);}} />
        </div>
        <div className="chat-composer-area"><ChatComposer projectId={projectId} threadId={chat.active.id} value={chat.active.draft} onChange={chat.draft} onSend={async(files,localFiles)=>{const route=await video.prepareSend(projectId,models.selection?.provider??chat.state.selectedProvider);if(route==='sample')return chat.send(files,localFiles);if(route==='blocked')return false;if(files.length&&!localFiles?.length){setVideoStatus('แนบไฟล์ไม่สำเร็จ กรุณาลองใหม่');return false;}if(models.catalog&&!models.selection){setVideoStatus('เปิดใช้งานโมเดลอย่างน้อยหนึ่งรายการในตั้งค่า');return false;}setVideoStatus('');return chat.sendProduction(projectId,localFiles??[],models.selection);}} pending={chat.pendingId === chat.active.id} busy={!!chat.pendingId} disabled={!chat.ready || settingsOpen || searchOpen} onStop={chat.stop} catalog={models.catalog} selection={models.selection} onSelectModel={value=>{models.select(value);chat.selectProvider(value.provider);}} providers={chat.state.providers} selected={chat.state.selectedProvider} onSelect={chat.selectProvider} onSettings={() => openSettings(true)} /></div>
      </div>
    </main>
    {(artifact||filesOpen) && <><div className="preview-resizer" role="separator" tabIndex={0} aria-label="ปรับขนาดพรีวิว" aria-orientation="vertical" aria-valuemin={300} aria-valuemax={900} aria-valuenow={rightWidth} onKeyDown={e => { if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); setRightWidth(w => Math.max(300, Math.min(900, w + (e.key === 'ArrowLeft' ? 24 : -24)))); } }} onPointerDown={e => {
      const handle = e.currentTarget, start = e.clientX, width = rightWidth; handle.setPointerCapture(e.pointerId);
      const move = (event: PointerEvent) => setRightWidth(Math.max(300, Math.min(900, width + start - event.clientX)));
      const up = () => { handle.removeEventListener('pointermove', move); handle.removeEventListener('pointerup', up); handle.removeEventListener('pointercancel', up); };
      handle.addEventListener('pointermove', move); handle.addEventListener('pointerup', up); handle.addEventListener('pointercancel', up);
    }} /><div className="preview-container" style={{ width:rightWidth }}>{filesOpen?<WorkspacePanel onOpenConfig={()=>void models.open()} files={projectId?{...workspace,choose:relinkProject}:workspace}/>:artifact&&<ChatArtifactPreview key={artifact.id} artifact={artifact}/>}</div></>}
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
    <ChatSettings onSaveProvider={models.saveProvider} catalog={models.catalog} configError={models.error} onOpenConfig={()=>void models.open()} onRefreshConfig={()=>void models.refresh()} onToggleModel={models.toggle} open={settingsOpen} onOpenChange={setSettingsOpen} initialCategory={settingsCategory} providers={chat.state.providers} onSave={chat.provider} onConnectVideo={()=>void connectVideo()} videoConnected={videoConnected} connectionStatus={videoStatus} preferences={prefs} onPreferences={chat.preferences} />
    <ChatSearch open={searchOpen} onOpenChange={setSearchOpen} threads={[...chat.state.threads,...chat.state.drafts.filter(t=>t.draft)]} activeId={chat.activeId} onSelect={selectChat} onNew={newChat} onSettings={() => openSettings()} onArtifact={(threadId, file) => { selectChat(threadId); artifactTrigger.current = null; setFilesOpen(false);setArtifact(file); }} />
  </div>;
}
