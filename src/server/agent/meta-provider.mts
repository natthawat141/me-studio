import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { collapseSystemMessages, getCurrentTools, getSystemMessageText, createAssistantMessageEventStream, type AssistantMessage, type Model } from '@earendil-works/pi-ai';
import type { StreamFn } from '@earendil-works/pi-agent-core';
import { z } from 'zod';

export const META_MODELS = ['muse-wonder-1.0', 'muse-spark-1.3', 'muse-spark-1.3-contributor'] as const;
type Options = { apiKey: string; modelId: string; fetch?: typeof fetch };

/** Trusted desktop/server transport. No arbitrary endpoint, automatic retry or credential persistence. */
export function createMetaProvider(options: Options): { model: Model<'openai-completions'>; stream: StreamFn } {
  if (!META_MODELS.includes(options.modelId as typeof META_MODELS[number])) throw new Error('MODEL_NOT_ALLOWED');
  if (!options.apiKey.trim() || options.apiKey.length > 4096) throw new Error('META_KEY_REQUIRED');
  const client = new OpenAI({ apiKey: options.apiKey, baseURL: 'https://api.meta.ai/v1', maxRetries: 0, timeout: 120_000, ...(options.fetch ? { fetch: options.fetch } : {}) });
  const model: Model<'openai-completions'> = { id: options.modelId, name: options.modelId, api: 'openai-completions', provider: 'meta', baseUrl: 'https://api.meta.ai/v1', input: ['text'], reasoning: false, contextWindow: 1_048_576, maxTokens: 2048, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 } };
  const stream: StreamFn = (_model, context, settings) => {
    const events = createAssistantMessageEventStream();
    const message: AssistantMessage = { role: 'assistant', content: [], api: model.api, provider: model.provider, model: model.id, stopReason: 'stop', timestamp: Date.now(), usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, totalTokens: 0, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } } };
    void (async () => {
      settings?.signal?.throwIfAborted();
      const normalized = collapseSystemMessages(context);
      const tools = getCurrentTools(normalized.messages);
      const messages: ChatCompletionMessageParam[] = normalized.messages.map(item => {
        if (item.role === 'system') return { role: 'system', content: getSystemMessageText(item) };
        if (item.role === 'user') return { role: 'user', content: typeof item.content === 'string' ? item.content : item.content.filter(part => part.type === 'text').map(part => part.text).join('\n') };
        if (item.role === 'toolResult') return { role: 'tool', tool_call_id: item.toolCallId, content: item.content.filter(part => part.type === 'text').map(part => part.text).join('\n') };
        return { role: 'assistant', content: item.content.filter(part => part.type === 'text').map(part => part.text).join('') || null,
          ...(item.content.some(part => part.type === 'toolCall') ? { tool_calls: item.content.filter(part => part.type === 'toolCall').map(part => ({ id: part.id, type: 'function' as const, function: { name: part.name, arguments: JSON.stringify(part.arguments) } })) } : {}) };
      });
      const completion = await client.chat.completions.create({ model: model.id, messages, max_tokens: Math.min(settings?.maxTokens ?? 2048, 8192), stream: false,
        ...(tools.length ? { tools: tools.map(tool => ({ type: 'function' as const, function: { name: tool.name, description: tool.description, parameters: z.record(z.string(), z.json()).parse(JSON.parse(JSON.stringify(tool.parameters))) } })) } : {}),
      }, { signal: settings?.signal });
      const choice = completion.choices[0];
      if (!choice) throw new Error('EMPTY_RESPONSE');
      if (choice.message.content) message.content.push({ type: 'text', text: choice.message.content });
      for (const call of choice.message.tool_calls ?? []) {
        if (call.type !== 'function' || call.function.arguments.length > 32_000) throw new Error('INVALID_TOOL');
        const args: unknown = JSON.parse(call.function.arguments);
        if (!args || typeof args !== 'object' || Array.isArray(args)) throw new Error('INVALID_TOOL');
        message.content.push({ type: 'toolCall', id: call.id, name: call.function.name, arguments: z.record(z.string(), z.json()).parse(args) });
      }
      message.stopReason = choice.finish_reason === 'length' ? 'length' : message.content.some(part => part.type === 'toolCall') ? 'toolUse' : 'stop';
      message.usage.input = completion.usage?.prompt_tokens ?? 0; message.usage.output = completion.usage?.completion_tokens ?? 0; message.usage.totalTokens = completion.usage?.total_tokens ?? 0;
      events.push({ type: 'start', partial: message });
      for (const [contentIndex, part] of message.content.entries()) if (part.type === 'text') events.push({ type: 'text_delta', contentIndex, delta: part.text, partial: message });
      events.push({ type: 'done', reason: message.stopReason, message }); events.end(message);
    })().catch(() => {
      message.content = []; message.stopReason = settings?.signal?.aborted ? 'aborted' : 'error'; message.errorMessage = 'META_REQUEST_FAILED';
      events.push({ type: 'error', reason: message.stopReason, error: message }); events.end(message);
    });
    return events;
  };
  return { model, stream };
}
