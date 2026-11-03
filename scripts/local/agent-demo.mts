import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { StudioMemoryStore } from '../../src/server/memory/store';
import { createStudioHarness } from '../../src/server/agent/runtime.mjs';
import { call, offlineModel, reply, scriptedStream } from './offline-provider.mjs';

// Own demo directory on every run: never overwrites application/user memory.
const path = resolve('.studio', 'agent-demo', randomUUID(), 'memory.sqlite');
const session = { ownerId: 'demo-owner', projectId: 'demo-series', sessionId: 'first-chat' };
let store = new StudioMemoryStore(path);
try {
  console.log('ทดสอบ harness ของ Pi + memory ในเครื่อง (provider จำลอง ไม่เรียก AI/API)\n');
  const first = createStudioHarness({ store, session, model: offlineModel, stream: scriptedStream([
    reply(call('remember_project_memory', { key: 'character.name', value: 'Milo', expectedRevision: 0 }), { stopReason: 'toolUse' }),
    reply('บันทึกชื่อตัวละคร Milo ไว้ในโปรเจกต์แล้ว'),
  ]) });
  const result = await first.run({ requestId: 'remember-character', text: 'จำไว้ว่าตัวละครชื่อ Milo', approvedTools: ['remember_project_memory'], onEvent: (event) => {
    if (event.type === 'tool_start') console.log(`เรียกเครื่องมือ: ${event.name}`);
  } });
  assert.equal(result.status, 'completed');
  assert.equal(store.list({ ownerId: session.ownerId, projectId: session.projectId })[0]?.value, 'Milo');
  console.log('บันทึก memory ลง SQLite สำเร็จ');
  store.close();
  store = new StudioMemoryStore(path);
  const resumed = createStudioHarness({ store, session: { ...session, sessionId: 'new-chat' }, model: offlineModel, stream: scriptedStream([
    (context) => reply(JSON.stringify(context).includes('Milo') ? 'Milo' : 'missing'),
  ]) });
  const recalled = await resumed.run({ requestId: 'recall-character', text: 'ตัวละครในโปรเจกต์นี้ชื่ออะไร' });
  assert.equal(recalled.result, 'Milo');
  console.log(`ปิดแล้วเปิด store ใหม่ เปลี่ยน session แล้วยังอ่านได้: ${recalled.result}`);
  const other = createStudioHarness({ store, session: { ...session, projectId: 'other-series' }, model: offlineModel, stream: scriptedStream([
    (context) => reply(JSON.stringify(context).includes('Milo') ? 'leaked' : 'isolated'),
  ]) });
  assert.equal((await other.run({ requestId: 'isolation', text: 'ตัวละครชื่ออะไร' })).result, 'isolated');
  console.log('โปรเจกต์อื่นไม่ได้รับความจำของโปรเจกต์นี้');
  console.log(`\nฐานข้อมูล demo: ${path}`);
  console.log('นี่คือการทดสอบ loop/tool/persistence จริงด้วยคำตอบที่เขียนไว้ล่วงหน้า ไม่ใช่ผลทดสอบโมเดลจริง');
} finally { store.close(); }
