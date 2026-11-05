import type { WorkspaceFilesBridge,ChatFileRef } from '@/lib/workspace-files';

export function workspaceFiles(): WorkspaceFilesBridge {
  if(typeof window==='undefined'||!window.meStudioFiles)throw new Error('DESKTOP_APP_REQUIRED');
  return window.meStudioFiles;
}
export async function resolveChatFile(file:ChatFileRef){const bridge=workspaceFiles();if(!bridge.chatFile)throw Error('DESKTOP_APP_REQUIRED');return bridge.chatFile({id:file.id,projectId:file.projectId});}
export async function revealWorkspaceFile(id:string){const bridge=workspaceFiles();if(!bridge.revealFile)throw Error('DESKTOP_APP_REQUIRED');return bridge.revealFile({id});}
export async function saveWorkspaceFileCopy(id:string,destination:'downloads'|'choose'='choose'){const bridge=workspaceFiles();if(!bridge.saveFileCopy)throw Error('DESKTOP_APP_REQUIRED');return bridge.saveFileCopy({id,destination});}
export async function resolveVideoArtifact(id:string,projectId:string){const bridge=workspaceFiles();if(!bridge.videoArtifact)throw Error('DESKTOP_APP_REQUIRED');return bridge.videoArtifact({id,projectId});}
export function fileError(error: unknown): string {
  const message=error instanceof Error?error.message:'';
  if(message.includes('DESKTOP_APP_REQUIRED'))return 'เปิดแอป me studio บน Mac เพื่อเลือกโฟลเดอร์ในเครื่อง';
  if(message.includes('FILE_TOO_LARGE'))return 'ไฟล์ข้อความนี้ใหญ่เกิน 256 KB สำหรับพรีวิว';
  if(message.includes('FOLDER_LIMIT'))return 'มีไฟล์จำนวนมาก กรุณาเลือกโฟลเดอร์ย่อย';
  if(message.includes('FOLDER_BUSY'))return 'กำลังเลือกโฟลเดอร์อยู่';
  return 'เปิดไฟล์หรือโฟลเดอร์ไม่สำเร็จ ลองรีเฟรชหรือเลือกโฟลเดอร์ใหม่';
}
