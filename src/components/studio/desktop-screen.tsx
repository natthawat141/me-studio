'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import {ProjectDialog} from '@/components/chat/project-dialog';
import {useProjectEditor} from '@/hooks/use-project-editor';
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
import {resolveChatFile, workspaceFiles } from '@/services/workspace-files';
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
  const editor=useProjectEditor(async(project,created)=>{setProjects(await workspaceFiles().projects());if(created){setProjectId(project.id);chat.newChat(project.id);chat.revealProject(project.id);}if(created||projectId===project.id)await workspace.activate(project.id,true);});
  const projectBusy=editor.busy;
  const [projectError,setProjectError]=useState('');
  const restoredProject=useRef(false);
  useEffect(()=>{
    if(!chat.ready||restoredProject.current)return;
    restoredProject.current=true;
    const id=chat.active.projectId;
    if(id)queueMicrotask(()=>{setProjectId(id);void workspace.activate(id).then(ok=>{if(!ok){setProjectError('เปิดโฟลเดอร์ Project ไม่ได้ อาจถูกย้ายหรือไม่มีสิทธิ์เข้าถึง');setFilesOpen(true);}});});
  },[chat.ready,chat.active.projectId,workspace]);
  useEffect(()=>{ void (window.meStudioFiles?.projects()??Promise.resolve([])).then(setProjects).catch(()=>setProjectError('อ่านรายการ Project ไม่สำเร็จ ข้อมูลเดิมยังอยู่')).finally(()=>setProjectsReady(true)); },[]);
  const autoOpenGeneration=useRef(0);
  const handledCompletion=useRef<string|undefined>(undefined);
  useEffect(()=>{const done=chat.completion;if(!done||handledCompletion.current===done.requestId)return;handledCompletion.current=done.requestId;if(chat.activeId!==done.sessionId)return;void workspace.refresh();if(done.file){const generation=autoOpenGeneration.current,selectionVersion=workspace.selectionVersion();void resolveChatFile(done.file).then(file=>{if(generation!==autoOpenGeneration.current||selectionVersion!==workspace.selectionVersion()||!chat.isResultCurrent(done.requestId))return;workspace.present(file);setArtifact(undefined);setFilesOpen(true);}).catch(()=>setVideoStatus('เปิดผลงานไม่สำเร็จ ลองกดไฟล์ในแชตอีกครั้ง'));}},[chat,workspace,setVideoStatus]);
  const projectActivation=useRef(0);
  function activateChatProject(id?:string) {
    autoOpenGeneration.current++;
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
  async function relinkProject(){if(projectId)await editor.open(projectId);}
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
  const newChatRef = useRef(newChat);
  useEffect(() => { newChatRef.current = newChat; });
  useEffect(() => {
    const keyboard = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.altKey || e.isComposing) return;
      if (e.key.toLowerCase() === 'k') { e.preventDefault(); setSearchOpen(true); }
      if (e.key.toLowerCase() === 'n' && !settingsOpen && !searchOpen) { e.preventDefault(); newChatRef.current(); }
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
  function newChat() {autoOpenGeneration.current++; chat.newChat(projectId);chat.revealProject(chatWorkspaceId(projectId));setMessageId(undefined); }
  function closePreview() {autoOpenGeneration.current++; setArtifact(undefined); requestAnimationFrame(() => artifactTrigger.current?.focus()); }
  function openChatFile(file:WorkspacePreview,trigger:HTMLButtonElement) {autoOpenGeneration.current++; artifactTrigger.current=trigger;workspace.present(file);setArtifact(undefined);setFilesOpen(true); }
  function closeFiles() {autoOpenGeneration.current++; setFilesOpen(false); requestAnimationFrame(() => filesTrigger.current?.focus()); }
  return <div className={`chat-app ${prefs.sidebarOpen ? '' : 'sidebar-collapsed'} ${prefs.reduceTransparency ? 'opaque-sidebar' : ''} ${prefs.compact ? 'compact-history' : ''}`}>
    <DesktopNavigation title={hasMessages ? chat.active.title : groups.find(p=>p.id===chatWorkspaceId(projectId))?.name??'me studio'} sidebarOpen={prefs.sidebarOpen} onToggleSidebar={()=>chat.preferences({sidebarOpen:!prefs.sidebarOpen})} onNew={newChat} panelOpen={filesOpen||!!artifact} ref={filesTrigger} onToggleFiles={()=>{if(artifact)closePreview();else if(filesOpen)closeFiles();else setFilesOpen(true);}} onOpenConfig={()=>void models.open()} fileName={filesOpen?workspace.selected?.entry.name:artifact?.title} onCloseFile={()=>{autoOpenGeneration.current++;if(filesOpen)workspace.closeFile();else closePreview();}}/>
    {models.error&&!settingsOpen&&<p className="video-status" role="alert">{models.error}</p>}
    {videoStatus&&<p className="video-status" role="status">{videoStatus}</p>}
    <div className="chat-workspace">
    {prefs.sidebarOpen&&<button className="sidebar-scrim" aria-label="ปิดแถบด้านข้าง" onClick={() => chat.preferences({ sidebarOpen: false })} />}
    <div className="chat-sidebar-slot">
      <div className="sidebar-full" inert={!prefs.sidebarOpen} aria-hidden={!prefs.sidebarOpen}><ChatSidebar pendingId={chat.pendingId} threads={chat.state.threads} activeId={chat.activeId} onOpen={selectChat} onNew={newChat} onSearch={() => setSearchOpen(true)} onSettings={() => openSettings()} onRename={chat.rename} onDelete={chat.deleteChat} onNewInProject={id=>newChatInProject(id===defaultWorkspaceId?undefined:id)} projects={groups} projectId={chatWorkspaceId(projectId)} collapsedProjects={prefs.collapsedProjects} onToggleProject={chat.toggleProject} scrollTop={prefs.sidebarScrollTop} onScrollTop={top=>chat.preferences({sidebarScrollTop:top})} ready={chat.ready&&projectsReady} onProjectSettings={id=>{setProjectError('');void editor.open(id);}} onCreateProject={()=>void editor.open()} projectBusy={projectBusy} /></div>
      <div className="sidebar-rail" inert={prefs.sidebarOpen} aria-hidden={prefs.sidebarOpen}><ChatSidebarRail onNew={newChat} onSearch={()=>setSearchOpen(true)} onSettings={()=>openSettings()}/></div>
    </div>
    <main className={`chat-main ${hasMessages ? 'has-conversation' : 'is-home'}`}>
      {editor.error&&!editor.edit&&<p className="project-error" role="alert">{editor.error}</p>}
      {projectError&&<div className="project-error" role="alert">{projectError} {projectId&&<button onClick={()=>void relinkProject()} disabled={projectBusy}>เลือกโฟลเดอร์ใหม่</button>}<button aria-label="ปิดข้อความ Project" onClick={()=>setProjectError('')}>×</button></div>}
      {chat.storageError && <p className="chat-storage-error" role="alert">{chat.storageError}</p>}
      <div className="chat-content">
        <div className="chat-stage">
          {!hasMessages&&<h1 className="chat-home-brand chat-thread-enter" key={chat.active.id}><Brand /></h1>}
          <ChatTranscript activities={chat.activities[chat.active.id]} stage={chat.productionStage?.sessionId===chat.active.id?chat.productionStage.text:undefined} onRetryMessage={typeof window!=='undefined'&&window.meStudioFiles?.produceVideo?(text,files)=>{void (async()=>{if(models.catalog&&!models.selection){setVideoStatus('เปิดใช้งานโมเดลอย่างน้อยหนึ่งรายการในตั้งค่า');return;}if(await video.prepareSend(projectId,models.selection?.provider??chat.state.selectedProvider)==='native'){setVideoStatus('');chat.sendProduction(projectId,files,models.selection,text||'ช่วยดูไฟล์ที่แนบให้หน่อย');}})();}:undefined} onChoice={text=>{void (async()=>{if(await video.prepareSend(projectId,models.selection?.provider??chat.state.selectedProvider)==='native')chat.sendProduction(projectId,[],models.selection,text);})();}} thread={chat.active} pending={chat.pendingId===chat.active.id} messageId={messageId} onOpenFile={openChatFile} onOpenArtifact={(resolved,trigger)=>{autoOpenGeneration.current++;artifactTrigger.current=trigger;setFilesOpen(false);setArtifact(resolved);}} />
        </div>
        <div className="chat-composer-area"><ChatComposer onReasoning={models.reasoning} projectId={projectId} threadId={chat.active.id} value={chat.active.draft} onChange={chat.draft} onSend={async(files,localFiles)=>{const route=await video.prepareSend(projectId,models.selection?.provider??chat.state.selectedProvider);if(route==='sample')return chat.send(files,localFiles);if(route==='blocked')return false;if(files.length&&!localFiles?.length){setVideoStatus('แนบไฟล์ไม่สำเร็จ กรุณาลองใหม่');return false;}if(models.catalog&&!models.selection){setVideoStatus('เปิดใช้งานโมเดลอย่างน้อยหนึ่งรายการในตั้งค่า');return false;}setVideoStatus('');return chat.sendProduction(projectId,localFiles??[],models.selection);}} pending={chat.pendingId === chat.active.id} busy={!!chat.pendingId} disabled={!chat.ready || settingsOpen || searchOpen} onStop={chat.stop} catalog={models.catalog} selection={models.selection} onSelectModel={value=>{models.select(value);chat.selectProvider(value.provider);}} providers={chat.state.providers} selected={chat.state.selectedProvider} onSelect={chat.selectProvider} onSettings={() => openSettings(true)} /></div>
      </div>
    </main>
    {(artifact||filesOpen) && <><div className="preview-resizer" role="separator" tabIndex={0} aria-label="ปรับขนาดพรีวิว" aria-orientation="vertical" aria-valuemin={300} aria-valuemax={900} aria-valuenow={rightWidth} onKeyDown={e => { if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); setRightWidth(w => Math.max(300, Math.min(900, w + (e.key === 'ArrowLeft' ? 24 : -24)))); } }} onPointerDown={e => {
      const handle = e.currentTarget, start = e.clientX, width = rightWidth; handle.setPointerCapture(e.pointerId);
      const move = (event: PointerEvent) => setRightWidth(Math.max(300, Math.min(900, width + start - event.clientX)));
      const up = () => { handle.removeEventListener('pointermove', move); handle.removeEventListener('pointerup', up); handle.removeEventListener('pointercancel', up); };
      handle.addEventListener('pointermove', move); handle.addEventListener('pointerup', up); handle.addEventListener('pointercancel', up);
    }} /><div className="preview-container" style={{ width:rightWidth }}>{filesOpen?<WorkspacePanel onOpenConfig={()=>void models.open()} files={projectId?{...workspace,choose:relinkProject}:workspace}/>:artifact&&<ChatArtifactPreview key={artifact.id} artifact={artifact}/>}</div></>}
    </div>
    <ProjectDialog editor={editor}/>
    <ChatSettings onSaveProvider={models.saveProvider} catalog={models.catalog} configError={models.error} onOpenConfig={()=>void models.open()} onRefreshConfig={()=>void models.refresh()} onToggleModel={models.toggle} open={settingsOpen} onOpenChange={setSettingsOpen} initialCategory={settingsCategory} providers={chat.state.providers} onSave={chat.provider} onConnectVideo={()=>void connectVideo()} videoConnected={videoConnected} connectionStatus={videoStatus} preferences={prefs} onPreferences={chat.preferences} />
    <ChatSearch open={searchOpen} onOpenChange={setSearchOpen} threads={[...chat.state.threads,...chat.state.drafts.filter(t=>t.draft)]} activeId={chat.activeId} onSelect={selectChat} onNew={newChat} onSettings={() => openSettings()} onArtifact={(threadId, file) => {autoOpenGeneration.current++; selectChat(threadId); artifactTrigger.current = null; setFilesOpen(false);setArtifact(file); }} />
  </div>;
}
