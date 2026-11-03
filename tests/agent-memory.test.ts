import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { StudioMemoryStore } from '../src/server/memory/store';
import { buildMemoryContext, selectRecentTurns } from '../src/server/memory/context';

const scope = { ownerId: 'alice', projectId: 'series-a' };
const session = { ...scope, sessionId: 'chat-a' };
const entry = { key: 'character.name', value: 'Milo', expectedRevision: 0, source: 'user' as const, sourceRef: 'message-1' };

async function withStore(run: (store: StudioMemoryStore, path: string) => Promise<void> | void) {
  const directory = await mkdtemp(join(tmpdir(), 'studio-memory-'));
  const path = join(directory, 'memory.sqlite');
  const store = new StudioMemoryStore(path);
  try { await run(store, path); } finally { store.close(); await rm(directory, { recursive: true, force: true }); }
}

test('facts and provenance survive closing and reopening the database', async () => withStore((store, path) => {
  store.remember(scope, entry);
  store.close();
  const reopened = new StudioMemoryStore(path);
  try {
    const facts = reopened.list(scope);
    assert.equal(facts.length, 1);
    assert.equal(facts[0].value, 'Milo');
    assert.equal(facts[0].sourceRef, 'message-1');
    assert.equal(facts[0].revision, 1);
  } finally { reopened.close(); }
}));

test('project facts never cross owner/project scopes and preferences remain owner-specific', async () => withStore((store) => {
  store.remember(scope, entry);
  store.remember({ ownerId: 'alice' }, { ...entry, key: 'language', value: 'ภาษาไทย' });
  assert.deepEqual(store.list({ ...scope, projectId: 'series-b' }), []);
  assert.deepEqual(store.list({ ...scope, ownerId: 'bob' }), []);
  const a = buildMemoryContext(store, scope, 4000);
  const b = buildMemoryContext(store, { ...scope, projectId: 'series-b' }, 4000);
  const stranger = buildMemoryContext(store, { ownerId: 'bob', projectId: 'series-a' }, 4000);
  assert.match(a, /Milo/);
  assert.match(b, /ภาษาไทย/);
  assert.doesNotMatch(b, /Milo/);
  assert.doesNotMatch(stranger, /Milo|ภาษาไทย/);
}));

test('stale writes from another connection fail and forgotten revisions cannot be recreated by stale callers', async () => withStore((store, path) => {
  const other = new StudioMemoryStore(path);
  try {
    store.remember(scope, entry);
    assert.throws(() => other.remember(scope, { ...entry, value: 'Changed' }), { code: 'MEMORY_CONFLICT' });
    assert.equal(store.forget(scope, 'character.name', 1), true);
    assert.deepEqual(other.list(scope), []);
    assert.equal(other.getRevision(scope, 'character.name'), 2);
    assert.throws(() => other.remember(scope, entry), { code: 'MEMORY_CONFLICT' });
    other.remember(scope, { ...entry, value: 'Nova', expectedRevision: 2 });
    assert.equal(store.list(scope)[0].revision, 3);
    assert.equal(store.list(scope)[0].value, 'Nova');
  } finally { other.close(); }
}));

test('memory validation rejects obvious credentials, invalid scope and oversized values', async () => withStore((store) => {
  assert.throws(() => store.remember({ ownerId: '../alice' }, entry));
  assert.throws(() => store.remember(scope, { ...entry, key: 'provider.api_key', value: 'synthetic' }));
  assert.throws(() => store.remember(scope, { ...entry, value: 'Bearer synthetic-private-token' }));
  assert.throws(() => store.remember(scope, { ...entry, value: 'x'.repeat(4001) }));
  assert.deepEqual(store.list(scope), []);
}));

test('context is bounded without truncating a fact and retrieval supports Thai substrings', async () => withStore((store) => {
  store.remember(scope, { ...entry, value: 'แมวสีฟ้า' });
  store.remember(scope, { ...entry, key: 'voice.description', value: 'เสียงบรรยายภาษาไทย'.repeat(30) });
  assert.equal(store.list(scope, { query: 'สีฟ้า' })[0].key, 'character.name');
  assert.equal(store.list(scope, { query: "%' OR 1=1 --" }).length, 0);
  const context = buildMemoryContext(store, scope, 500);
  assert.ok(context.length <= 500);
  const parsed = JSON.parse(context);
  assert.equal(parsed.project.length, 1);
  assert.equal(parsed.project[0].value, 'แมวสีฟ้า');
}));

test('unknown and corrupt SQLite files fail without replacing the original bytes', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'studio-bad-memory-'));
  try {
    const invalid = join(directory, 'corrupt.sqlite');
    await writeFile(invalid, 'not a database');
    assert.throws(() => new StudioMemoryStore(invalid));
    assert.equal(await readFile(invalid, 'utf8'), 'not a database');
    const unknown = join(directory, 'unknown.sqlite');
    const foreign = new DatabaseSync(unknown);
    foreign.exec('CREATE TABLE unrelated(value TEXT)');
    foreign.close();
    assert.throws(() => new StudioMemoryStore(unknown), /database/i);
    const original = new DatabaseSync(unknown);
    assert.ok(original.prepare("SELECT name FROM sqlite_master WHERE name='unrelated'").get());
    original.close();
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('requests are idempotent, changed input conflicts and sessions allow only one active run', async () => withStore((store) => {
  const first = store.beginRun(session, { requestId: 'r1', inputHash: 'hash-a', model: 'offline/test' });
  assert.equal(first.replayed, false);
  assert.equal(store.beginRun(session, { requestId: 'r1', inputHash: 'hash-a', model: 'offline/test' }).replayed, true);
  assert.throws(() => store.beginRun(session, { requestId: 'r1', inputHash: 'hash-b', model: 'offline/test' }), { code: 'REQUEST_CONFLICT' });
  assert.throws(() => store.beginRun(session, { requestId: 'r2', inputHash: 'hash-b', model: 'offline/test' }), { code: 'SESSION_BUSY' });
  store.saveMessage(session, first.run.id, { role: 'user', content: 'hello', timestamp: 1 });
  store.finishRun(session, first.run.id, { status: 'completed', result: 'hi', usage: { modelCalls: 1, toolCalls: 0, inputTokens: 1, outputTokens: 1 } });
  assert.equal(store.beginRun(session, { requestId: 'r1', inputHash: 'hash-a', model: 'offline/test' }).run.result, 'hi');
  assert.equal(store.readTranscript(session, { completedOnly: true }).length, 1);
  assert.deepEqual(store.readTranscript({ ...session, ownerId: 'bob' }), []);
}));

test('history trimming keeps a complete recent user/tool group', () => {
  const messages = [
    { role: 'user', content: 'old'.repeat(200), timestamp: 1 },
    { role: 'assistant', content: [{ type: 'text', text: 'old answer' }], timestamp: 2 },
    { role: 'user', content: 'new', timestamp: 3 },
    { role: 'assistant', content: [{ type: 'toolCall', id: 'c1', name: 'read', arguments: {} }], timestamp: 4 },
    { role: 'toolResult', toolName: 'read', toolCallId: 'c1', content: [{ type: 'text', text: 'ok' }], timestamp: 5 },
  ];
  const recent = selectRecentTurns(messages, 500);
  assert.equal(recent.length, 3);
  assert.equal(recent[0].role, 'user');
  assert.equal(recent[2].role, 'toolResult');
});
