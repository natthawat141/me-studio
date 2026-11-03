import { z } from 'zod';

export const chatPrototypeKey = 'me-studio.chat-ui.v1';
export const providerSchema = z.object({
  id: z.string().max(80), name: z.string().max(80), endpoint: z.string().max(300),
  modelId: z.string().max(160), modelLabel: z.string().max(80),
}).strict();
export type ChatProvider = z.infer<typeof providerSchema>;
const artifactSchema = z.object({
  id: z.string(), title: z.string().max(100), kind: z.enum(['video', 'image']),
  src: z.string().refine(s=>['/demos/greeting.mp4','/demos/storyboard/scene-1.jpg'].includes(s)||/^studio-media:\/\/[a-f0-9-]{36}\/video\.mp4$/.test(s)),
  nativeProjectId:z.string().uuid().optional(),
  poster: z.enum(['/demos/storyboard/scene-1.jpg','']),
}).strict();
export type ChatArtifact = z.infer<typeof artifactSchema>;
const messageSchema = z.object({
  id: z.string(), role: z.enum(['user', 'assistant']), text: z.string().max(8000),
  attachments: z.array(z.string().max(250)).max(10).optional(),
  sample: z.boolean().optional(), artifacts: z.array(artifactSchema).max(10).optional(),
}).strict();
export type ChatMessage = z.infer<typeof messageSchema>;
const threadSchema = z.object({
  id: z.string(), projectId: z.string().optional(), title: z.string().max(80), draft: z.string().max(8000),
  messages: z.array(messageSchema), updatedAt: z.number(),
}).strict();
export type ChatThread = z.infer<typeof threadSchema>;
export const prototypeSchema = z.object({
  threads: z.array(threadSchema).min(1), providers: z.array(providerSchema).min(1).max(20),
  selectedProvider: z.string(),
  preferences: z.object({ sidebarOpen: z.boolean(), reduceTransparency: z.boolean(), compact: z.boolean(), theme: z.enum(['light', 'dark', 'system']).default('light') }).strict(),
}).strict();
export type ChatPrototypeState = z.infer<typeof prototypeSchema>;
export const emptyThread = (id: string): ChatThread => ({ id, title: 'แชตใหม่', draft: '', messages: [], updatedAt: 0 });
export const initialChatState: ChatPrototypeState = {
  threads: [emptyThread('new')], selectedProvider: 'openrouter',
  providers: [
    { id: 'openrouter', name: 'OpenRouter', endpoint: 'https://openrouter.ai/api/v1', modelId: '', modelLabel: '' },
    { id: 'openai', name: 'OpenAI', endpoint: 'https://api.openai.com/v1', modelId: '', modelLabel: '' },
    { id: 'meta', name: 'Meta', endpoint: '', modelId: '', modelLabel: '' },
    { id: 'custom', name: 'กำหนดเอง', endpoint: '', modelId: '', modelLabel: '' },
  ],
  preferences: { sidebarOpen: true, reduceTransparency: false, compact: false, theme: 'light' },
};
export function sampleReply(): ChatMessage {
  return {
    id: crypto.randomUUID(), role: 'assistant', sample: true,
    text: 'นี่คือตัวอย่างการแสดงผลงานในแชต คุณสามารถเปิดดูวิดีโอหรือภาพ แล้วกลับมาคุยต่อได้',
    artifacts: [
      { id: crypto.randomUUID(), title: 'วิดีโอตัวอย่าง', kind: 'video', src: '/demos/greeting.mp4', poster: '/demos/storyboard/scene-1.jpg' },
      { id: crypto.randomUUID(), title: 'ภาพตัวอย่าง', kind: 'image', src: '/demos/storyboard/scene-1.jpg', poster: '/demos/storyboard/scene-1.jpg' },
    ],
  };
}
