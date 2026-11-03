export type FilePreviewKind = 'video' | 'audio' | 'image' | 'text' | 'unsupported';
export type WorkspaceEntry = { id: string; name: string; relativePath: string; kind: 'directory' | 'file'; previewKind: FilePreviewKind };
export type WorkspaceListing = { directory: WorkspaceEntry; entries: WorkspaceEntry[]; truncated: boolean };
export type WorkspacePreview = { entry: WorkspaceEntry; kind: FilePreviewKind; bytes: number; src?: string; text?: string };
export type FolderProject = {id:string;name:string;folderName?:string;sourcePath?:string;outputPath?:string};
export interface WorkspaceFilesBridge {
  videoStatus?():Promise<{configured:boolean;busy:boolean}>;
  loadVideoKeys?():Promise<{configured:boolean}|null>;
  produceVideo?(input:{projectId:string;sessionId:string;requestId:string;text:string}):Promise<{text:string;artifact?:{id:string;title:string;url:string;hasVoice:boolean}}>;
  cancelVideo?():Promise<unknown>;
  saveVideo?(input:{id:string;projectId:string}):Promise<{saved:boolean}>;
  videoArtifact?(input:{id:string;projectId:string}):Promise<{id:string;title:string;url:string}>;
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
