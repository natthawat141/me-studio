import type { ChatThread } from './chat-prototype';
import type { FolderProject } from './workspace-files';

// A UI grouping key, never a native directory grant or backend Project ID.
export const defaultWorkspaceId = 'workspace:default';
export type ChatWorkspace = FolderProject & { kind: 'default' | 'folder' | 'unavailable' };
export const chatWorkspaceId = (projectId?: string) => projectId ?? defaultWorkspaceId;

/** Keep legacy unassigned chats and unavailable Projects visible without changing their IDs or file scopes. */
export function chatWorkspaces(projects: FolderProject[], chats: ChatThread[]): ChatWorkspace[] {
  const groups: ChatWorkspace[] = [{ id: defaultWorkspaceId, name: 'Default workspace', kind: 'default' }, ...projects.map(p => ({ ...p, kind: 'folder' as const }))];
  for (const chat of chats) {
    if (chat.projectId && !groups.some(p => p.id === chat.projectId)) groups.push({ id: chat.projectId, name: 'Project ที่ยังไม่เชื่อมต่อ', kind: 'unavailable' });
  }
  return groups;
}
