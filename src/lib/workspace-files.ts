import type {NativeCatalog,NativeSelection,ProviderConnection} from './native-models';
export type FilePreviewKind = 'video' | 'audio' | 'image' | 'text' | 'unsupported';
export type WorkspaceEntry = { id: string; name: string; relativePath: string; kind: 'directory' | 'file'; previewKind: FilePreviewKind };
export type WorkspaceListing = { directory: WorkspaceEntry; entries: WorkspaceEntry[]; truncated: boolean };
export type WorkspacePreview = { entry: WorkspaceEntry; kind: FilePreviewKind; bytes: number; src?: string; text?: string };
export type FolderProject = {id:string;name:string;folderName?:string;sourcePath?:string;outputPath?:string};
export type ChatFileRef = {id:string;projectId?:string;name:string;relativePath:string;kind:'video'|'audio'|'image'|'text'};
export type ProductionEvent={kind:'production';sessionId:string;requestId:string;type:string;text?:string;name?:string;stage?:string};
export interface WorkspaceFilesBridge {
  onProductionEvent?(callback:(event:ProductionEvent)=>void):()=>void;
  setReasoning?(input:{effort:import('./native-models').ReasoningEffort}):Promise<NativeCatalog>;
  saveProvider?(input:ProviderConnection):Promise<NativeCatalog>;
  configCatalog?():Promise<NativeCatalog>;
  openConfig?():Promise<{opened:boolean}>;
  toggleModel?(input:{provider:string;model:string;enabled:boolean}):Promise<NativeCatalog>;
  storeChatFile?(input:{name:string;data:ArrayBuffer;projectId?:string}):Promise<ChatFileRef>;
  chatFile?(input:{id:string;projectId?:string}):Promise<WorkspacePreview>;
  videoStatus?():Promise<{configured:boolean;busy:boolean}>;
  loadVideoKeys?():Promise<{configured:boolean}|null>;
  produceVideo?(input:{projectId?:string;sessionId:string;requestId:string;text:string;attachments?:{id:string}[];provider?:NativeSelection["provider"];model?:string}):Promise<{text:string;projectId?:string;files?:ChatFileRef[];choices?:{question:string;options:{label:string;description:string}[]};artifact?:{id:string;title:string;url:string;hasVoice:boolean;files?:ChatFileRef[]}}>;
  cancelVideo?(input?:{requestId:string}):Promise<unknown>;
  saveVideo?(input:{id:string;projectId:string}):Promise<{saved:boolean}>;
  videoArtifact?(input:{id:string;projectId:string}):Promise<{id:string;title:string;url:string;files?:ChatFileRef[]}>;
  projects():Promise<FolderProject[]>;
  pickProjectFolder():Promise<FolderProject|null>;
  createProject(input:{name:string;selectionId:string}):Promise<FolderProject>;
  setProjectOutput?(input:{id:string}):Promise<FolderProject|null>;
  relinkProject(input:{id:string}):Promise<FolderProject|null>;
  activateProject(input:{id:string}):Promise<WorkspaceListing>;
  chooseFolder(): Promise<WorkspaceListing | null>;
  listFolder(input: { id: string }): Promise<WorkspaceListing>;
  openFile(input: { id: string }): Promise<WorkspacePreview>;
}
declare global { interface Window { meStudioFiles?: WorkspaceFilesBridge } }
