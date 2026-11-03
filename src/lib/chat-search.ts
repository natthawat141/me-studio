import type { ChatArtifact, ChatThread } from './chat-prototype';

export const searchCategories = [
  { id: 'all', label: 'ทั้งหมด' }, { id: 'action', label: 'คำสั่ง' },
  { id: 'chat', label: 'แชต' }, { id: 'file', label: 'ไฟล์' }, { id: 'text', label: 'ข้อความ' },
] as const;
export type SearchCategory = typeof searchCategories[number]['id'];
type Base = { id: string; title: string; detail: string };
export type SearchEntry = Base & (
  { kind: 'action'; action: 'new' | 'settings'; shortcut: string } |
  { kind: 'chat'; threadId: string } |
  { kind: 'file'; threadId: string; artifact: ChatArtifact } |
  { kind: 'text'; threadId: string; messageId: string }
);
export type SearchGroup = { id: string; title: string; entries: SearchEntry[] };

function excerpt(text: string, query: string) {
  const start = Math.max(0, text.toLocaleLowerCase().indexOf(query) - 22);
  return `${start ? '…' : ''}${text.slice(start, start + 100)}${text.length > start + 100 ? '…' : ''}`;
}

export function searchChats(threads: ChatThread[], value: string, category: SearchCategory): SearchGroup[] {
  const query = value.trim().toLocaleLowerCase();
  const match = (text: string) => text.toLocaleLowerCase().includes(query);
  const actions: SearchEntry[] = [
    { id: 'action-new', kind: 'action', action: 'new', title: 'แชตใหม่', detail: '', shortcut: '⌘ N' },
    { id: 'action-settings', kind: 'action', action: 'settings', title: 'ตั้งค่า', detail: '', shortcut: '⌘ ,' },
  ];
  const recent = threads.filter(t => t.draft || t.messages.length).toSorted((a, b) => b.updatedAt - a.updatedAt);
  const chats: SearchEntry[] = recent.filter(t => match(`${t.title} ${t.draft} ${t.messages.map(m => m.text).join(' ')}`)).map(t => ({ id: `chat-${t.id}`, kind: 'chat', threadId: t.id, title: t.title, detail: t.messages.length ? 'แชต' : 'ร่าง' }));
  const files: SearchEntry[] = recent.flatMap(t => t.messages.flatMap(m => (m.artifacts ?? []).filter(a => match(`${a.title} ${t.title} ${a.kind}`)).map(artifact => ({ id: `file-${artifact.id}`, kind: 'file' as const, title: artifact.title, detail: t.title, threadId: t.id, artifact }))));
  const texts: SearchEntry[] = query ? recent.flatMap(t => t.messages.filter(m => match(m.text)).map(m => ({ id: `text-${m.id}`, kind: 'text' as const, title: excerpt(m.text, query), detail: t.title, threadId: t.id, messageId: m.id }))) : [];
  const groups: SearchGroup[] = [
    { id: 'action', title: 'คำสั่งด่วน', entries: actions.filter(a => match(a.title)) },
    { id: 'chat', title: query ? 'แชต' : 'แชตล่าสุด', entries: chats },
    { id: 'file', title: 'ไฟล์ในแชต', entries: files },
    { id: 'text', title: 'ข้อความ', entries: texts },
  ];
  return groups.filter(g => (category === 'all' || category === g.id) && g.entries.length).map(g => ({ ...g, entries: g.entries.slice(0, category === 'all' ? (g.id === 'chat' ? 8 : 4) : 50) }));
}
