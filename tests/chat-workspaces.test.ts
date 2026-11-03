import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyThread } from '../src/lib/chat-prototype';
import { chatWorkspaces, chatWorkspaceId, defaultWorkspaceId } from '../src/lib/chat-workspaces';

test('default workspace groups old chats without rewriting native scope or losing unavailable Projects', () => {
  const old = { ...emptyThread('old-session'), messages: [{ id: 'm', role: 'user' as const, text: 'keep me' }] };
  const missing = { ...emptyThread('missing-session'), projectId: 'missing-project' };
  const chats = [old, missing, { ...emptyThread('known-session'), projectId: 'a' }];
  const snapshot = structuredClone(chats);
  const groups = chatWorkspaces([{ id: 'a', name: 'A' }], chats);
  assert.equal(groups[0].id, defaultWorkspaceId);
  assert.equal(chatWorkspaceId(old.projectId), defaultWorkspaceId);
  assert.equal(groups.filter(p => p.kind === 'unavailable').length, 1);
  assert.equal(groups.find(p => p.id === 'a')?.kind, 'folder');
  assert.deepEqual(chats, snapshot);
  assert.equal(old.projectId, undefined);
});
