import { app, BrowserWindow, ipcMain, dialog, protocol, nativeTheme, session, shell, Menu, nativeImage } from 'electron';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile, copyFile, mkdir, stat } from 'node:fs/promises';
import { startRuntime } from './runtime.mjs';
import { APP_ORIGIN, trustedSender, runtimeEnvironment } from './policy.mjs';
import { WorkspaceFiles } from './workspace-files.mjs';
import { ProjectFolders } from './project-folders.mjs';
import { ChatFiles } from './chat-files.mjs';
import { AppConfig } from './app-config.mjs';

protocol.registerSchemesAsPrivileged([{ scheme: 'studio-media', privileges: { standard: true, secure: true, stream: true, supportFetchAPI: true } }, {scheme:'studio-file',privileges:{standard:true,secure:true,stream:true,supportFetchAPI:true,corsEnabled:true}}]);
const location = dirname(fileURLToPath(import.meta.url));
const root = app.isPackaged ? join(process.resourcesPath, 'runtime') : join(location, '../.studio/desktop-build/runtime');
const files = new Map();
const workspaceFiles = new WorkspaceFiles();
let chatFiles;
const requests = new Map();
let window, worker, runtime, quitting = false;
const request = (method, input) => new Promise((resolve, reject) => {
  const requestId = randomUUID();
  const timer = setTimeout(() => { requests.delete(requestId); reject(new Error('DESKTOP_REQUEST_TIMEOUT')); }, method==='videoProduce'?660_000:180_000);
  requests.set(requestId, { resolve, reject, timer }); worker.send({ requestId, method, input });
});
function publicValue(value) {
  if (!value || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(publicValue);
  const result = {};
  for (const [key, field] of Object.entries(value)) {
    if (key === 'outputPath' && typeof field === 'string') { const token = randomUUID(); files.set(token, field); result.url = `studio-media://${token}/video.mp4`; }
    else result[key] = publicValue(field);
  }
  return result;
}
if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => { window?.show(); window?.focus(); });
  app.whenReady().then(async () => {
    nativeTheme.themeSource = 'light';
    app.dock?.setIcon(join(root, 'app/public/brand/me-studio-mark-v1.png'));
    await mkdir(app.getPath('userData'), { recursive: true });
    chatFiles=new ChatFiles(app.getPath('userData'));
    session.fromPartition('persist:me-studio-v1').protocol.handle('studio-file', request => chatFiles.owns(new URL(request.url).hostname)?chatFiles.serve(request):workspaceFiles.serve(request));
    session.fromPartition('persist:me-studio-v1').protocol.handle('studio-media', async request => {
      const path = files.get(new URL(request.url).hostname);
      if (!path) return new Response(null, { status: 404 });
      const bytes = await readFile(path);
      const range = request.headers.get('range');
      const headers = { 'Content-Type': 'video/mp4', 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-store' };
      if (range) {
        const match = /^bytes=(\d+)-(\d*)$/.exec(range);
        if (!match) return new Response(null, { status: 416 });
        const start = Number(match[1]), end = match[2] ? Math.min(Number(match[2]), bytes.length - 1) : bytes.length - 1;
        if (start > end || start >= bytes.length) return new Response(null, { status: 416 });
        return new Response(bytes.subarray(start, end + 1), { status: 206, headers: { ...headers, 'Content-Range': `bytes ${start}-${end}/${bytes.length}`, 'Content-Length': String(end - start + 1) } });
      }
      return new Response(bytes, { headers: { ...headers, 'Content-Length': String(bytes.length) } });
    });
    runtime = await startRuntime(root);
    worker = spawn(join(root, 'bin/node'), [join(root, 'desktop/worker.mjs'), root, app.getPath('userData')], { env: runtimeEnvironment(), stdio: ['ignore', 'ignore', 'pipe', 'ipc'] });
    worker.stderr.on('data', () => {});
    worker.on('message', message => {
      if (message.event) { if (!window?.isDestroyed()) window?.webContents.send('studio:event', publicValue(message.event)); return; }
      const pending = requests.get(message.requestId); if (!pending) return;
      clearTimeout(pending.timer); requests.delete(message.requestId);
      if (message.error) pending.reject(new Error(message.error)); else pending.resolve(message.result);
    });
    worker.on('exit', () => { for (const pending of requests.values()) { clearTimeout(pending.timer); pending.reject(new Error('DESKTOP_WORKER_EXITED')); } requests.clear(); });
    ipcMain.handle('studio:request', async (event, method, input) => {
      if (!window || event.sender !== window.webContents || !trustedSender(event.senderFrame?.url, event.senderFrame === event.sender.mainFrame)) throw new Error('UNAUTHORIZED_DESKTOP_CALL');
      const allowed = ['list', 'create', 'update', 'preview', 'render', 'cancel', 'artifacts', 'save', 'configureMeta', 'chat', 'cancelChat', 'newSession'];
      if (!allowed.includes(method) || JSON.stringify(input ?? {}).length > 16_000) throw new Error('INVALID_REQUEST');
      if (method === 'save') {
        const artifacts = await request('artifacts', { projectId: input?.projectId });
        const artifact = artifacts.find(entry => entry.id === input?.jobId);
        if (!artifact || (await stat(artifact.outputPath)).size > 300 * 1024 * 1024) throw new Error('ARTIFACT_NOT_READY');
        const destination = await dialog.showSaveDialog(window, { defaultPath: 'me-studio.mp4', filters: [{ name: 'MP4', extensions: ['mp4'] }] });
        if (destination.canceled || !destination.filePath) return { cancelled: true };
        await copyFile(artifact.outputPath, destination.filePath); return { saved: true };
      }
      return publicValue(await request(method, input));
    });
    const appConfig=new AppConfig(join(app.getPath('userData'),'config.env'));
    async function openConfig(){await appConfig.ensure();const error=await shell.openPath(appConfig.path);if(error){await new Promise((resolve,reject)=>{const child=spawn('/usr/bin/open',['-a','TextEdit',appConfig.path],{stdio:'ignore'});child.once('error',reject);child.once('close',code=>code===0?resolve():reject(Error('CONFIG_OPEN_FAILED')));});}}
    Menu.setApplicationMenu(Menu.buildFromTemplate([{role:'appMenu'},{label:'File',submenu:[{label:'เปิด config.env',click:()=>void openConfig().catch(()=>dialog.showErrorBox('config.env','เปิดไฟล์ไม่สำเร็จ'))},{type:'separator'},{role:'close'}]},{role:'editMenu'},{role:'viewMenu'},{role:'windowMenu'}]));
    let configQueue=Promise.resolve();
    const configOperation=operation=>{const next=configQueue.catch(()=>{}).then(operation);configQueue=next;return next;};
    async function reloadConfig(){const c=await appConfig.read();await request('videoConfigure',{openai:c.env.OPENAI_API_KEY||'',meta:c.env.META_API_KEY||'',openrouter:c.env.OPENROUTER_API_KEY||'',eleven:c.env.ELEVENLABS_API_KEY||'',voiceId:c.env.STUDIO_SPEECH_VOICE_ID||'JBFqnCBsd6RMkjVDRZzb',speechModel:c.env.STUDIO_SPEECH_MODEL||'eleven_v3',language:c.env.STUDIO_SPEECH_LANGUAGE||'th',models:c.catalog.providers.flatMap(p=>p.models.filter(m=>m.enabled).map(m=>({provider:p.id,model:m.id}))) });return c;}
    const projectFolders = new ProjectFolders(join(app.getPath('userData'), 'folder-projects.json'));
    let choosingFolder = false;
    let projectFolderSelection;
    let rootQueue = Promise.resolve();
    const openWorkspaceRoot = path => { const operation = rootQueue.catch(() => {}).then(() => workspaceFiles.openRoot(path)); rootQueue = operation; return operation; };
    async function videoFileReferences(id,projectId){
      const a=await request('videoArtifact',{id,projectId});
      const refs=[];
      for(const path of [a.outputPath]){
        try{refs.push(await chatFiles.register(path,a.outputRoot,projectId));}catch(error){if(path===a.outputPath)throw error;}
      }
      return refs;
    }
    ipcMain.handle('studio:files', async (event, method, input) => {
      if (!window || event.sender !== window.webContents || !trustedSender(event.senderFrame?.url,event.senderFrame===event.sender.mainFrame)) return {ok:false,error:'UNAUTHORIZED_FILE_ACCESS'};
      try {
        if(method==='storeChatFile'){
          if(input?.projectId&&!(await projectFolders.list()).some(p=>p.id===input.projectId))throw Error('INVALID_PROJECT');
          return {ok:true,value:await chatFiles.store(input)};
        }
        if(method==='chatFile')return {ok:true,value:await chatFiles.preview(input)};
        if(method==='configCatalog')return {ok:true,value:await configOperation(async()=>(await reloadConfig()).catalog)};
        if(method==='configOpen'){await openConfig();return {ok:true,value:{opened:true}};}
        if(method==='configProvider')return {ok:true,value:await configOperation(async()=>{await appConfig.saveProvider(input);return (await reloadConfig()).catalog;})};
        if(method==='configReasoning')return {ok:true,value:await configOperation(async()=>{await appConfig.reasoning(input?.effort);return (await reloadConfig()).catalog;})};
        if(method==='configToggle')return {ok:true,value:await configOperation(async()=>{await appConfig.toggle(input?.provider,input?.model,input?.enabled);return (await reloadConfig()).catalog;})};
        if(method==='videoStatus'){await configOperation(reloadConfig);return {ok:true,value:await request('videoStatus')};}
        if(method==='videoCancel')return {ok:true,value:await request('videoCancel',{requestId:input?.requestId})};
        if(method==='videoKeys'){
          const picked=await dialog.showOpenDialog(window,{title:'โหลดคีย์ AI เขียนฉากและเสียงจากไฟล์ .env',properties:['openFile']});
          if(picked.canceled||!picked.filePaths[0])return {ok:true,value:null};
          if((await stat(picked.filePaths[0])).size>32768)throw Error('INVALID_CONFIG');
          return {ok:true,value:await configOperation(async()=>{await appConfig.import(await readFile(picked.filePaths[0],'utf8'));await reloadConfig();return await request('videoStatus');})};
        }
        if(method==='videoProduce'){
          if((input?.projectId!==undefined&&typeof input.projectId!=='string')||typeof input?.sessionId!=='string'||typeof input?.requestId!=='string'||typeof input?.text!=='string'||input.text.length>8000)throw Error('INVALID_REQUEST');
          const media=await chatFiles.agentInputs(input.attachments||[],input.projectId,async bytes=>{let image=nativeImage.createFromBuffer(bytes);if(image.isEmpty())throw Error('INVALID_IMAGE');for(const size of [1280,960,640,400]){const dimensions=image.getSize(),ratio=Math.min(1,size/Math.max(dimensions.width,dimensions.height));const scaled=image.resize({width:Math.max(1,Math.round(dimensions.width*ratio)),height:Math.max(1,Math.round(dimensions.height*ratio))});const png=scaled.toPNG();if(png.length<=250000)return 'data:image/png;base64,'+png.toString('base64');const jpeg=scaled.toJPEG(75);if(jpeg.length<=250000)return 'data:image/jpeg;base64,'+jpeg.toString('base64');image=scaled;}throw Error('INVALID_IMAGE');});
          const c=await configOperation(reloadConfig);
          const provider=input.provider||c.catalog.defaultProvider,model=input.model||c.catalog.defaultModel;
          if(!c.catalog.providers.some(p=>p.id===provider&&p.configured&&p.models.some(m=>m.id===model&&m.enabled)))throw Error('MODEL_NOT_AVAILABLE');
          let project=(await projectFolders.list()).find(p=>p.id===input.projectId);
          if(input.projectId&&!project)throw Error('INVALID_PROJECT');
          if(!project){const sourcePath=join(app.getPath('userData'),'workspace');await mkdir(sourcePath,{recursive:true});project={id:'00000000-0000-4000-8000-000000000001',sourcePath,outputPath:join(sourcePath,'output')};}
          const result=await request('videoProduce',{projectId:project.id,sessionId:input.sessionId,requestId:input.requestId,text:input.text,provider,model,reasoning:provider==='meta'?'auto':c.catalog.reasoning||'auto',media,source:project.sourcePath,outputRoot:project.outputPath});
          if(result.artifact)result.artifact.files=await videoFileReferences(result.artifact.id,project.id);
          if(result.previews)result.files=await Promise.all(result.previews.map(path=>chatFiles.register(path,project.outputPath,project.id)));
          delete result.previews;
          result.projectId=project.id;
          return {ok:true,value:publicValue(result)};
        }
        if(method==='videoSave'){
          const a=await request('videoArtifact',{id:input?.id,projectId:input?.projectId});
          if((await stat(a.outputPath)).size>300*1024*1024)throw Error('ARTIFACT_TOO_LARGE');
          const picked=await dialog.showSaveDialog(window,{defaultPath:'me-studio.mp4',filters:[{name:'MP4',extensions:['mp4']}]});if(picked.canceled||!picked.filePath)return {ok:true,value:{saved:false}};await copyFile(a.outputPath,picked.filePath);return {ok:true,value:{saved:true}};
        }
        if(method==='videoArtifact'){
          const a=await request('videoArtifact',{id:input?.id,projectId:input?.projectId});
          return {ok:true,value:{...publicValue({id:a.id,title:a.title,outputPath:a.outputPath}),files:await videoFileReferences(a.id,input.projectId)}};
        }
        if (method === 'projects') return {ok:true,value:await projectFolders.list()};
        if (method === 'activate') {
          if (!input || typeof input.id !== 'string' || !/^[a-f0-9-]{36}$/.test(input.id)) throw new Error('INVALID_PROJECT');
          return {ok:true,value:await openWorkspaceRoot(await projectFolders.pathFor(input.id))};
        }
        if (method === 'createProject') {
          if (typeof input?.name !== 'string' || !input.name.trim() || input.name.length > 80 || typeof input?.selectionId !== 'string' || input.selectionId !== projectFolderSelection?.id) throw new Error('INVALID_PROJECT');
          const project = await projectFolders.create(input.name, projectFolderSelection.path);
          projectFolderSelection = undefined;
          return {ok:true,value:project};
        }
        if (method === 'pickProjectFolder' || method === 'relinkProject' || method === 'setProjectOutput') {
          if (choosingFolder) return {ok:false,error:'FOLDER_BUSY'};
          if (method !== 'pickProjectFolder' && (typeof input?.id !== 'string' || !/^[a-f0-9-]{36}$/.test(input.id))) throw new Error('INVALID_PROJECT');
          if(method !== 'pickProjectFolder')await projectFolders.pathFor(input.id);
          choosingFolder = true;
          try {
            const picked = await dialog.showOpenDialog(window, {title:'เลือกโฟลเดอร์ Project',buttonLabel:'เลือกโฟลเดอร์',properties:['openDirectory']});
            if (picked.canceled || !picked.filePaths[0]) return {ok:true,value:null};
            if (method === 'setProjectOutput') return {ok:true,value:await projectFolders.setOutput(input.id,picked.filePaths[0])};
            if (method === 'relinkProject') return {ok:true,value:await projectFolders.relink(input.id,picked.filePaths[0])};
            projectFolderSelection = { id:randomUUID(), path:picked.filePaths[0] };
            return {ok:true,value:{id:projectFolderSelection.id,name:basename(picked.filePaths[0])}};
          } finally { choosingFolder = false; }
        }
        if (method === 'choose') {
          if(choosingFolder)return {ok:false,error:'FOLDER_BUSY'};
          choosingFolder=true;
          try {
            const picked=await dialog.showOpenDialog(window,{title:'เลือกโฟลเดอร์ไฟล์',buttonLabel:'เลือกโฟลเดอร์',properties:['openDirectory']});
            return {ok:true,value:picked.canceled||!picked.filePaths[0]?null:await openWorkspaceRoot(picked.filePaths[0])};
          } finally {choosingFolder=false;}
        }
        if (!['list','open'].includes(method)||!input||typeof input.id!=='string'||!/^[a-f0-9-]{36}$/.test(input.id)) throw new Error('INVALID_FILE');
        return {ok:true,value:method==='list'?await workspaceFiles.list(input.id):await workspaceFiles.preview(input.id)};
      } catch(error) {
        const safe=['INVALID_FILE','INVALID_FOLDER','FILE_OUTSIDE_FOLDER','FILE_TOO_LARGE','FOLDER_LIMIT','INVALID_PROJECT','INVALID_REGISTRY','DUPLICATE_FOLDER','INVALID_CONFIG','INVALID_DEFAULT_MODEL','CONFIG_OPEN_FAILED','MODEL_NOT_AVAILABLE','ATTACHMENT_LIMIT','INVALID_IMAGE'];
        return {ok:false,error:safe.includes(error.message)?error.message:'FILE_READ_FAILED'};
      }
    });
    window = new BrowserWindow({ width: 1440, height: 940, minWidth: 980, minHeight: 720, title: 'me studio', backgroundColor: '#00000000', titleBarStyle: 'hiddenInset', vibrancy: 'sidebar', visualEffectState: 'active',
      webPreferences: { preload: join(location, 'preload.cjs'), nodeIntegration: false, contextIsolation: true, sandbox: true, partition: 'persist:me-studio-v1' },
    });
    window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    window.webContents.on('will-navigate', (event, url) => { if (new URL(url).origin !== APP_ORIGIN) event.preventDefault(); });
    window.webContents.session.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
    await window.loadURL(`${runtime.origin}/desktop`);
    runtime.child.once('exit', () => { if (!quitting) { dialog.showErrorBox('me studio', 'Local UI runtime หยุดทำงาน กรุณาเปิดแอปใหม่'); app.quit(); } });
  }).catch(async () => { dialog.showErrorBox('เปิด me studio ไม่สำเร็จ', 'ไม่สามารถเริ่ม local runtime ได้ อาจมีแอปเปิดอยู่หรือ port 18147 ถูกใช้งาน'); await runtime?.stop(); app.exit(1); });
  app.on('window-all-closed', () => app.quit());
  app.on('before-quit', event => {
    if (quitting) return;
    event.preventDefault();
    void (async () => {
      const state = worker?.connected ? await request('busy', {}).catch(() => ({ busy: false })) : { busy: false };
      if (state.busy) {
        const answer = await dialog.showMessageBox(window, { type: 'question', message: 'มีงานกำลังทำอยู่', detail: 'ออกจากแอปจะยกเลิกงานที่กำลังทำ', buttons: ['ทำงานต่อ', 'ยกเลิกงานและออก'], defaultId: 0, cancelId: 0 });
        if (answer.response === 0) return;
        await request('cancel', {}).catch(() => {}); await request('cancelChat', {}).catch(() => {});await request('videoShutdown', {}).catch(() => {});
      }
      quitting = true;
      if (worker?.connected) worker.disconnect();
      worker?.kill('SIGTERM'); await runtime?.stop(); app.quit();
    })();
  });
}
