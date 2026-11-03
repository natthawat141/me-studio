import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initialChatState, emptyThread, prototypeSchema } from '../src/lib/chat-prototype';
import { commitChatMessage, createChatDraft, restoreChatDrafts } from '../src/lib/chat-drafts';

test('legacy empty conversations migrate to drafts without losing IDs, project or text', () => {
  const old = { ...structuredClone(initialChatState), threads: [{ ...emptyThread('legacy'), projectId: 'project-a', draft: 'เก็บร่างไว้' }] };
  const { drafts: unused, ...legacy } = old; void unused;
  const state = restoreChatDrafts(prototypeSchema.parse(legacy));
  assert.deepEqual(state.threads, []);
  assert.equal(state.drafts[0].id, 'legacy');
  assert.equal(state.drafts[0].projectId, 'project-a');
  assert.equal(state.drafts[0].draft, 'เก็บร่างไว้');
  assert.deepEqual(state.preferences.collapsedProjects, {});
});

test('first send promotes the draft once, retaining session and native file refs', () => {
  const draft = { ...createChatDraft('project-a'), draft: 'ทำคลิป' };
  const state = { ...structuredClone(initialChatState), drafts: [draft] };
  const file = { id: crypto.randomUUID(), name: 'poster.png', relativePath: 'poster.png', kind: 'image' as const };
  const sent = commitChatMessage(state, draft, { id: 'message-1', role: 'user', text: 'ทำคลิป', files: [file] });
  assert.equal(sent.drafts.length, 0);
  assert.equal(sent.threads[0].id, draft.id);
  assert.equal(sent.threads[0].projectId, draft.projectId);
  assert.deepEqual(sent.threads[0].messages[0].files, [file]);
  const next = commitChatMessage(sent, sent.threads[0], { id: 'message-2', role: 'user', text: 'แก้คลิป' });
  assert.equal(next.threads.length, 1);
  assert.equal(next.threads[0].messages.length, 2);
  assert.equal(state.drafts[0].draft, 'ทำคลิป');
});

test('corrupt duplicate identities fail closed; separate legacy drafts remain recoverable', () => {
  const draft = createChatDraft();
  assert.throws(() => restoreChatDrafts({ ...structuredClone(initialChatState), threads: [draft], drafts: [draft] }), /DUPLICATE_CHAT_ID/);
  const other = { ...createChatDraft(), draft: 'another saved draft' };
  const restored = restoreChatDrafts({ ...structuredClone(initialChatState), drafts: [draft, other] });
  assert.equal(restored.drafts.length, 2);
  assert.equal(restored.drafts[1].draft, other.draft);
});
