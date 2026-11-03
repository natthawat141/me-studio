import { app, BrowserWindow, ipcMain, dialog, protocol, nativeTheme, session } from 'electron';
import { parseEnv } from 'node:util';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile, copyFile, mkdir, stat } from 'node:fs/promises';
import { startRuntime } from './runtime.mjs';
import { APP_ORIGIN, trustedSender, runtimeEnvironment } from './policy.mjs';
import { WorkspaceFiles } from './workspace-files.mjs';
import { ProjectFolders } from './project-folders.mjs';

protocol.registerSchemesAsPrivileged([{ scheme: 'studio-media', privileges: { standard: true, secure: true, stream: true, supportFetchAPI: true } }, {scheme:'studio-file',privileges:{standard:true,secure:true,stream:true,supportFetchAPI:true,corsEnabled:true}}]);
const location = dirname(fileURLToPath(import.meta.url));
const root = app.isPackaged ? join(process.resourcesPath, 'runtime') : join(location, '../.studio/desktop-build/runtime');
const files = new Map();
const workspaceFiles = new WorkspaceFiles();
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
    session.fromPartition('persist:me-studio-v1').protocol.handle('studio-file', request => workspaceFiles.serve(request));
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
    const projectFolders = new ProjectFolders(join(app.getPath('userData'), 'folder-projects.json'));
    let choosingFolder = false;
    let projectFolderSelection;
    let rootQueue = Promise.resolve();
    const openWorkspaceRoot = path => { const operation = rootQueue.catch(() => {}).then(() => workspaceFiles.openRoot(path)); rootQueue = operation; return operation; };
    ipcMain.handle('studio:files', async (event, method, input) => {
      if (!window || event.sender !== window.webContents || !trustedSender(event.senderFrame?.url,event.senderFrame===event.sender.mainFrame)) return {ok:false,error:'UNAUTHORIZED_FILE_ACCESS'};
      try {
        if(method==='videoStatus')return {ok:true,value:await request('videoStatus')};
        if(method==='videoCancel')return {ok:true,value:await request('videoCancel')};
        if(method==='videoKeys'){
          const picked=await dialog.showOpenDialog(window,{title:'โหลดคีย์ AI เขียนฉากและเสียงจากไฟล์ .env',properties:['openFile']});
          if(picked.canceled||!picked.filePaths[0])return {ok:true,value:null};
          if((await stat(picked.filePaths[0])).size>32768)throw Error('INVALID_CONFIG');
          const env=parseEnv(await readFile(picked.filePaths[0],'utf8'));
          return {ok:true,value:await request('videoConfigure',{openai:env.OPENAI_API_KEY||env.Openai_api||'',eleven:env.ELEVENLABS_API_KEY||env.elevenlabs})};
        }
        if(method==='videoProduce'){
          if(typeof input?.projectId!=='string'||typeof input?.sessionId!=='string'||typeof input?.requestId!=='string'||typeof input?.text!=='string'||input.text.length>8000)throw Error('INVALID_REQUEST');
          const project=(await projectFolders.list()).find(p=>p.id===input.projectId);if(!project)throw Error('INVALID_PROJECT');
          return {ok:true,value:publicValue(await request('videoProduce',{projectId:input.projectId,sessionId:input.sessionId,requestId:input.requestId,text:input.text,source:project.sourcePath,outputRoot:project.outputPath}))};
        }
        if(method==='videoSave'){
          const a=await request('videoArtifact',{id:input?.id,projectId:input?.projectId});
          if((await stat(a.outputPath)).size>300*1024*1024)throw Error('ARTIFACT_TOO_LARGE');
          const picked=await dialog.showSaveDialog(window,{defaultPath:'me-studio.mp4',filters:[{name:'MP4',extensions:['mp4']}]});if(picked.canceled||!picked.filePath)return {ok:true,value:{saved:false}};await copyFile(a.outputPath,picked.filePath);return {ok:true,value:{saved:true}};
        }
        if(method==='videoArtifact')return {ok:true,value:publicValue(await request('videoArtifact',{id:input?.id,projectId:input?.projectId}))};
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
        const safe=['INVALID_FILE','INVALID_FOLDER','FILE_OUTSIDE_FOLDER','FILE_TOO_LARGE','FOLDER_LIMIT','INVALID_PROJECT','INVALID_REGISTRY','DUPLICATE_FOLDER'];
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
        await request('cancel', {}).catch(() => {}); await request('cancelChat', {}).catch(() => {});await request('videoCancel', {}).catch(() => {});
      }
      quitting = true;
      if (worker?.connected) worker.disconnect();
      worker?.kill('SIGTERM'); await runtime?.stop(); app.quit();
    })();
  });
}
