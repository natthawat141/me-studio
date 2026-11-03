import {
  createAssistantMessageEventStream, fauxAssistantMessage, fauxProvider, fauxToolCall,
  type AssistantMessage, type SimpleStreamOptions, type TranscriptContext,
} from '@earendil-works/pi-ai';
import type { StreamFn } from '@earendil-works/pi-agent-core';

export { fauxAssistantMessage as reply, fauxToolCall as call };
export const offlineModel = fauxProvider({ models: [{ id: 'me-studio-offline-fixture', contextWindow: 32000, maxTokens: 2048 }] }).getModel();
type Step = AssistantMessage | ((context: TranscriptContext, options?: SimpleStreamOptions) => AssistantMessage | Promise<AssistantMessage>);

/** Offline test/demo transport only. Never imported by the application harness or used for inference/HTTP. */
export function scriptedStream(steps: Step[]): StreamFn {
  let index = 0;
  return (_model, context, options) => {
    const stream = createAssistantMessageEventStream();
    const step = steps[index++];
    void Promise.resolve().then(async () => {
      if (!step) throw new Error('Scripted response sequence exhausted');
      const message = typeof step === 'function' ? await step(context, options) : step;
      stream.push({ type: 'start', partial: message });
      for (const [contentIndex, content] of message.content.entries()) {
        if (content.type === 'text') stream.push({ type: 'text_delta', contentIndex, delta: content.text, partial: message });
      }
      if (message.stopReason === 'error' || message.stopReason === 'aborted') {
        stream.push({ type: 'error', reason: message.stopReason, error: message });
      } else {
        stream.push({ type: 'done', reason: message.stopReason === 'toolUse' ? 'toolUse' : 'stop', message });
      }
      stream.end(message);
    }).catch(() => {
      const error = fauxAssistantMessage([], { stopReason: 'error', errorMessage: 'Scripted fixture failed' });
      stream.push({ type: 'error', reason: 'error', error }); stream.end(error);
    });
    return stream;
  };
}
