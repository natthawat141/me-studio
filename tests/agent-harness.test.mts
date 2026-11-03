import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createAssistantMessageEventStream } from '@earendil-works/pi-ai';
import { StudioMemoryStore } from '../src/server/memory/store';
import { createStudioHarness } from '../src/server/agent/runtime.mjs';
import { call, offlineModel, reply, scriptedStream } from '../scripts/local/offline-provider.mjs';

const session = { ownerId: 'alice', projectId: 'series-a', sessionId: 'chat-a' };
async function fixture(run: (store: StudioMemoryStore, path: string) => Promise<void>) {
  const root = await mkdtemp(join(tmpdir(), 'studio-harness-'));
  const path = join(root, 'memory.sqlite'); const store = new StudioMemoryStore(path);
  try { await run(store, path); } finally { store.close(); await rm(root, { recursive: true, force: true }); }
}

test('actual Pi loop executes memory tool and a new session recalls the fact after disk reopen', async () => fixture(async (store, path) => {
  const harness = createStudioHarness({ store, session, model: offlineModel, stream: scriptedStream([
    reply(call('remember_project_memory', { key: 'character.name', value: 'Milo', expectedRevision: 0 }, { id: 'remember-1' }), { stopReason: 'toolUse' }),
    reply('บันทึกชื่อ Milo แล้ว'),
  ]) });
  const result = await harness.run({ requestId: 'r1', text: 'จำไว้ว่าตัวละครชื่อ Milo', approvedTools: ['remember_project_memory'] });
  assert.equal(result.status, 'completed');
  assert.equal(result.usage.modelCalls, 2);
  assert.equal(store.list({ ownerId: 'alice', projectId: 'series-a' })[0].sourceRef, `run:${result.id}`);
  store.close();
  const reopened = new StudioMemoryStore(path);
  try {
    const recall = createStudioHarness({ store: reopened, session: { ...session, sessionId: 'chat-b' }, model: offlineModel, stream: scriptedStream([
      (context) => reply(JSON.stringify(context).includes('character.name') && JSON.stringify(context).includes('Milo') ? 'Milo' : 'missing'),
    ]) });
    assert.equal((await recall.run({ requestId: 'r2', text: 'ตัวละครชื่ออะไร' })).result, 'Milo');
    const other = createStudioHarness({ store: reopened, session: { ...session, ownerId: 'bob' }, model: offlineModel, stream: scriptedStream([
      (context) => reply(JSON.stringify(context).includes('Milo') ? 'leaked' : 'isolated'),
    ]) });
    assert.equal((await other.run({ requestId: 'r3', text: 'ตัวละครชื่ออะไร' })).result, 'isolated');
  } finally { reopened.close(); }
}));

test('completed conversation is restored and repeated request IDs do not call the model twice', async () => fixture(async (store) => {
  const first = createStudioHarness({ store, session, model: offlineModel, stream: scriptedStream([reply('first answer')]) });
  const original = await first.run({ requestId: 'r1', text: 'first question' });
  const repeated = await first.run({ requestId: 'r1', text: 'first question' });
  assert.equal(repeated.id, original.id);
  assert.equal(repeated.replayed, true);
  assert.equal(repeated.result, 'first answer');
  await assert.rejects(first.run({ requestId: 'r1', text: 'changed input' }), { code: 'REQUEST_CONFLICT' });
  const continued = createStudioHarness({ store, session, model: offlineModel, stream: scriptedStream([
    (context) => reply(context.messages.filter((message) => message.role === 'user').length === 2 ? 'restored' : 'missing'),
  ]) });
  assert.equal((await continued.run({ requestId: 'r2', text: 'second question' })).result, 'restored');
}));

test('unapproved mutations and ungrounded facts do not enter durable memory', async () => fixture(async (store) => {
  for (const [requestId, value, approvedTools] of [
    ['denied', 'Milo', []], ['invented', 'Invented', ['remember_project_memory']],
  ] as const) {
    const harness = createStudioHarness({ store, session, model: offlineModel, stream: scriptedStream([
      reply(call('remember_project_memory', { key: 'character.name', value, expectedRevision: 0 }), { stopReason: 'toolUse' }), reply('needs user input'),
    ]) });
    await harness.run({ requestId, text: 'จำไว้ว่าตัวละครชื่อ Milo', approvedTools: [...approvedTools] });
  }
  assert.deepEqual(store.list({ ownerId: 'alice', projectId: 'series-a' }), []);
  assert.ok(store.readTranscript(session).filter((message) => message.role === 'toolResult').every((message) => message.isError === true));
}));

test('endless tool requests stop at the host model-call budget and leave a terminal run', async () => fixture(async (store) => {
  let providerCalls = 0;
  const step = () => { providerCalls++; return reply(call('recall_project_memory', {}), { stopReason: 'toolUse' }); };
  const harness = createStudioHarness({ store, session, model: offlineModel, stream: scriptedStream([step, step, step]), limits: { maxModelCalls: 2 } });
  const result = await harness.run({ requestId: 'loop', text: 'ดูความจำ' });
  assert.equal(result.status, 'failed');
  assert.equal(result.errorCode, 'MODEL_CALL_LIMIT');
  assert.equal(providerCalls, 2);
  assert.equal(store.getRun(session, result.id)?.status, 'failed');
}));

test('over-budget tool batches are not executed', async () => fixture(async (store) => {
  const harness = createStudioHarness({ store, session, model: offlineModel, limits: { maxToolCalls: 1 }, stream: scriptedStream([
    reply([
      call('remember_project_memory', { key: 'character.name', value: 'Milo', expectedRevision: 0 }, { id: 'a' }),
      call('remember_project_memory', { key: 'style.color', value: 'blue', expectedRevision: 0 }, { id: 'b' }),
    ], { stopReason: 'toolUse' }),
  ]) });
  const result = await harness.run({ requestId: 'too-many-tools', text: 'Milo blue', approvedTools: ['remember_project_memory'] });
  assert.equal(result.errorCode, 'TOOL_CALL_LIMIT');
  assert.deepEqual(store.list({ ownerId: 'alice', projectId: 'series-a' }), []);
}));

test('provider errors are sanitized before persistence and result delivery', async () => fixture(async (store) => {
  const harness = createStudioHarness({ store, session, model: offlineModel, stream: async () => { throw new Error('Bearer synthetic-private-token'); } });
  const result = await harness.run({ requestId: 'failure', text: 'hello' });
  assert.equal(result.status, 'failed');
  assert.equal(result.errorCode, 'MODEL_ERROR');
  assert.doesNotMatch(JSON.stringify(result) + JSON.stringify(store.readTranscript(session)), /synthetic-private-token|Bearer/);
}));

test('cooperative cancellation settles the run and releases the session', async () => fixture(async (store) => {
  const controller = new AbortController();
  const harness = createStudioHarness({ store, session, model: offlineModel, stream: (_model, _context, options) => {
    const stream = createAssistantMessageEventStream();
    const finish = () => {
      const message = reply([], { stopReason: 'aborted', errorMessage: 'Cancelled fixture' });
      stream.push({ type: 'error', reason: 'aborted', error: message }); stream.end(message);
    };
    if (options?.signal?.aborted) finish(); else options?.signal?.addEventListener('abort', finish, { once: true });
    queueMicrotask(() => controller.abort());
    return stream;
  } });
  const result = await harness.run({ requestId: 'cancel', text: 'hello', signal: controller.signal });
  assert.equal(result.status, 'cancelled');
  assert.equal(store.getRun(session, result.id)?.status, 'cancelled');
  const next = createStudioHarness({ store, session, model: offlineModel, stream: scriptedStream([reply('next')]) });
  assert.equal((await next.run({ requestId: 'after-cancel', text: 'try again' })).status, 'completed');
}));

test('context budget is enforced before invoking the provider', async () => fixture(async (store) => {
  let providerCalled = false;
  const harness = createStudioHarness({ store, session, model: offlineModel, limits: { maxContextChars: 4096 }, stream: scriptedStream([
    () => { providerCalled = true; return reply('should not happen'); },
  ]) });
  const result = await harness.run({ requestId: 'large', text: 'x'.repeat(5000) });
  assert.equal(result.errorCode, 'CONTEXT_LIMIT');
  assert.equal(providerCalled, false);
}));

test('forgotten facts can be intentionally replaced in a new session using their tombstone revision', async () => fixture(async (store) => {
  const scope = { ownerId: 'alice', projectId: 'series-a' };
  store.remember(scope, { key: 'character.name', value: 'Milo', source: 'user', expectedRevision: 0 });
  const forgetting = createStudioHarness({ store, session, model: offlineModel, stream: scriptedStream([
    reply(call('forget_project_memory', { key: 'character.name', expectedRevision: 1 }), { stopReason: 'toolUse' }), reply('forgotten'),
  ]) });
  await forgetting.run({ requestId: 'forget', text: 'ลืมชื่อตัวละคร', approvedTools: ['forget_project_memory'] });
  assert.deepEqual(store.list(scope), []);
  const replacement = createStudioHarness({ store, session: { ...session, sessionId: 'new-chat' }, model: offlineModel, stream: scriptedStream([
    reply(call('recall_project_memory', { key: 'character.name' }), { stopReason: 'toolUse' }),
    (context) => {
      const message = [...context.messages].reverse().find((item) => item.role === 'toolResult');
      const content = message?.role === 'toolResult' ? message.content.find((item) => item.type === 'text') : undefined;
      const data = JSON.parse(content?.type === 'text' ? content.text : '{}');
      return reply(call('remember_project_memory', { key: 'character.name', value: 'Nova', expectedRevision: data.version?.revision ?? 0 }), { stopReason: 'toolUse' });
    },
    reply('saved'),
  ]) });
  await replacement.run({ requestId: 'replace', text: 'จำไว้ว่าตัวละครชื่อ Nova', approvedTools: ['remember_project_memory'] });
  assert.equal(store.list(scope)[0]?.value, 'Nova');
}));
