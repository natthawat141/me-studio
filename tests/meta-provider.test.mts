import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMetaProvider } from '../src/server/agent/meta-provider.mjs';
import { normalizeContext, Type } from '@earendil-works/pi-ai';

test('Meta SDK targets the fixed endpoint and returns typed text/tool results without retries', async () => {
  let calls = 0;
  const provider = createMetaProvider({ apiKey: 'synthetic-test-key', modelId: 'muse-wonder-1.0', fetch: async (request, init) => {
    calls++;
    assert.equal(String(request), 'https://api.meta.ai/v1/chat/completions');
    const body = JSON.parse(String(init?.body));
    assert.equal(body.model, 'muse-wonder-1.0');
    assert.equal(body.max_tokens, 64);
    assert.equal(body.tools[0].function.name, 'update_scene');
    assert.match(body.messages[0].content, /Project memory/);
    return new Response(JSON.stringify({ id: 'fixture', object: 'chat.completion', created: 0, model: body.model, choices: [{ index: 0, finish_reason: 'tool_calls', message: { role: 'assistant', content: 'กำลังแก้ฉาก', tool_calls: [{ id: 'call_1', type: 'function', function: { name: 'update_scene', arguments: '{"reply":"สวัสดี"}' } }] } }], usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 } }), { headers: { 'content-type': 'application/json' } });
  } });
  const context = normalizeContext({ systemPrompt: 'Project memory: Milo', messages: [{ role: 'user', content: 'แก้ฉาก', timestamp: 0 }], tools: [{ name: 'update_scene', description: 'Edit scene', parameters: Type.Object({ reply: Type.String() }) }] });
  const result = await (await provider.stream(provider.model, context, { maxTokens: 64 })).result();
  assert.equal(calls, 1); assert.equal(result.stopReason, 'toolUse'); assert.equal(result.usage.totalTokens, 15);
  assert.ok(result.content.some(part => part.type === 'toolCall' && part.name === 'update_scene'));
  assert.throws(() => createMetaProvider({ apiKey: 'x', modelId: 'arbitrary-model' }), /MODEL_NOT_ALLOWED/);
});

test('Meta failures are bounded/sanitized and pre-cancelled requests make no HTTP calls', async () => {
  let calls = 0;
  const provider = createMetaProvider({ apiKey: 'synthetic-private-key', modelId: 'muse-wonder-1.0', fetch: async () => { calls++; return new Response('synthetic-private-key raw provider failure', { status: 401 }); } });
  const context = normalizeContext({ systemPrompt: 'Test', messages: [] });
  const result = await (await provider.stream(provider.model, context)).result();
  assert.equal(result.errorMessage, 'META_REQUEST_FAILED'); assert.equal(calls, 1);
  const cancelled = await (await provider.stream(provider.model, context, { signal: AbortSignal.abort() })).result();
  assert.equal(cancelled.stopReason, 'aborted'); assert.equal(calls, 1);
});

test('requested Contributor route preserves the exact model ID with a mocked transport', async () => {
  const provider = createMetaProvider({ apiKey: 'synthetic-key', modelId: 'muse-spark-1.3-contributor', fetch: async (_request, init) => {
    const body = JSON.parse(String(init?.body));
    assert.equal(body.model, 'muse-spark-1.3-contributor');
    return new Response(JSON.stringify({id:'fixture',object:'chat.completion',created:0,model:body.model,choices:[{index:0,finish_reason:'stop',message:{role:'assistant',content:'Fixture reply'}}],usage:{prompt_tokens:1,completion_tokens:1,total_tokens:2}}),{headers:{'content-type':'application/json'}});
  } });
  const result = await (await provider.stream(provider.model, normalizeContext({systemPrompt:'Fixture',messages:[]}))).result();
  assert.equal(result.stopReason, 'stop');
  assert.equal(result.model, 'muse-spark-1.3-contributor');
});
