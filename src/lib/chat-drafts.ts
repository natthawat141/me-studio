import { emptyThread, type ChatMessage, type ChatPrototypeState, type ChatThread } from './chat-prototype';

/** Preserve IDs, text and legacy drafts; only sent conversations belong in history. */
export function restoreChatDrafts(saved: ChatPrototypeState): ChatPrototypeState {
  const all = [...saved.threads, ...saved.drafts];
  if (new Set(all.map(t => t.id)).size !== all.length) throw new Error('DUPLICATE_CHAT_ID');
  return { ...saved, threads: all.filter(t => t.messages.length), drafts: all.filter(t => !t.messages.length) };
}

export function createChatDraft(projectId?: string): ChatThread {
  return { ...emptyThread(crypto.randomUUID()), ...(projectId ? { projectId } : {}) };
}

/** Promote a draft on its first sent message, retaining its native session/file identity. */
export function commitChatMessage(state: ChatPrototypeState, active: ChatThread, message: ChatMessage): ChatPrototypeState {
  const current = [...state.threads, ...state.drafts].find(t => t.id === active.id) ?? active;
  const next = { ...current, draft: '', title: current.messages.length ? current.title : message.text.trim().slice(0, 42) || message.files?.[0]?.name.slice(0, 80) || 'ไฟล์แนบ', updatedAt: Date.now(), messages: [...current.messages, message] };
  return {
    ...state,
    drafts: state.drafts.filter(t => t.id !== current.id),
    threads: state.threads.some(t => t.id === current.id) ? state.threads.map(t => t.id === current.id ? next : t) : [next, ...state.threads],
  };
}
