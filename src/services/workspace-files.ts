import type { WorkspaceFilesBridge } from '@/lib/workspace-files';

export function workspaceFiles(): WorkspaceFilesBridge {
  if(typeof window==='undefined'||!window.meStudioFiles)throw new Error('DESKTOP_APP_REQUIRED');
  return window.meStudioFiles;
}
export function fileError(error: unknown): string {
  const message=error instanceof Error?error.message:'';
  if(message.includes('DESKTOP_APP_REQUIRED'))return 'เปิดแอป me studio บน Mac เพื่อเลือกโฟลเดอร์ในเครื่อง';
  if(message.includes('FILE_TOO_LARGE'))return 'ไฟล์ข้อความนี้ใหญ่เกิน 256 KB สำหรับพรีวิว';
  if(message.includes('FOLDER_LIMIT'))return 'มีไฟล์จำนวนมาก กรุณาเลือกโฟลเดอร์ย่อย';
  if(message.includes('FOLDER_BUSY'))return 'กำลังเลือกโฟลเดอร์อยู่';
  return 'เปิดไฟล์หรือโฟลเดอร์ไม่สำเร็จ ลองรีเฟรชหรือเลือกโฟลเดอร์ใหม่';
}
