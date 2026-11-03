// Sandboxed Electron preloads use CommonJS; ESM imports are unavailable here.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { contextBridge, ipcRenderer } = require('electron');
const methods = ['list', 'create', 'update', 'preview', 'render', 'cancel', 'artifacts', 'save', 'configureMeta', 'chat', 'cancelChat', 'newSession'];
const bridge = Object.fromEntries(methods.map(name => [name, input => ipcRenderer.invoke('studio:request', name, input)]));
bridge.onEvent = callback => {
  const listener = (_event, value) => callback(value);
  ipcRenderer.on('studio:event', listener);
  return () => ipcRenderer.removeListener('studio:event', listener);
};
contextBridge.exposeInMainWorld('meStudio', Object.freeze(bridge));
const fileRequest = (method,input) => ipcRenderer.invoke('studio:files',method,input).then(result => {
  if(!result.ok)throw new Error(result.error);
  return result.value;
});
contextBridge.exposeInMainWorld('meStudioFiles',Object.freeze({
  chooseFolder:()=>fileRequest('choose'),
  configCatalog:()=>fileRequest('configCatalog'),
  openConfig:()=>fileRequest('configOpen'),
  saveProvider:input=>fileRequest('configProvider',input),
  toggleModel:input=>fileRequest('configToggle',input),
  videoStatus:()=>fileRequest('videoStatus'),
  loadVideoKeys:()=>fileRequest('videoKeys'),
  produceVideo:input=>fileRequest('videoProduce',input),
  cancelVideo:()=>fileRequest('videoCancel'),
  saveVideo:input=>fileRequest('videoSave',input),
  videoArtifact:input=>fileRequest('videoArtifact',input),
  storeChatFile:input=>fileRequest('storeChatFile',input),
  chatFile:input=>fileRequest('chatFile',input),
  projects:()=>fileRequest('projects'),
  pickProjectFolder:()=>fileRequest('pickProjectFolder'),
  createProject:input=>fileRequest('createProject',input),
  setProjectOutput:input=>fileRequest('setProjectOutput',input),
  relinkProject:input=>fileRequest('relinkProject',input),
  activateProject:input=>fileRequest('activate',input),
  listFolder:input=>fileRequest('list',input),
  openFile:input=>fileRequest('open',input),
}));
