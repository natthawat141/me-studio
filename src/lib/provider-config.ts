import { z } from 'zod';

const modelSchema = z.object({
  id: z.string().trim().min(1).max(200),
  label: z.string().trim().min(1).max(100),
  family: z.string().trim().min(1).max(60).optional(),
}).strict();
const modelsSchema = z.array(modelSchema).max(100).refine(
  (items) => new Set(items.map((item) => item.id)).size === items.length,
  'Duplicate model IDs',
);
export type ProviderCatalog = {
  mode: 'demo' | 'saas' | 'self-hosted';
  liveChatEnabled: false;
  providers: { id: 'openrouter' | 'openai' | 'meta' | 'elevenlabs'; label: string; capability: 'chat' | 'speech'; credentialConfigured: boolean }[];
  models: { provider: 'openrouter' | 'openai' | 'meta'; modelId: string; label: string; family?: string }[];
  speechModels: { provider: 'elevenlabs'; modelId: string; label: string }[];
  speechVoice?: { provider: 'elevenlabs'; voiceId: string; label: string };
  defaultChatModel?: { provider: 'openrouter' | 'openai' | 'meta'; modelId: string };
};
export const catalogSchema: z.ZodType<ProviderCatalog> = z.object({
  mode: z.enum(['demo', 'saas', 'self-hosted']),
  liveChatEnabled: z.literal(false),
  providers: z.array(z.object({ id:z.enum(['openrouter','openai','meta','elevenlabs']), label:z.string(), capability:z.enum(['chat','speech']), credentialConfigured:z.boolean() }).strict()),
  models: z.array(z.object({provider:z.enum(['openrouter','openai','meta']),modelId:z.string().min(1),label:z.string(),family:z.string().optional()}).strict()),
  speechModels: z.array(z.object({provider:z.literal('elevenlabs'),modelId:z.string().min(1),label:z.string()}).strict()),
  speechVoice: z.object({provider:z.literal('elevenlabs'),voiceId:z.string().min(1).max(200),label:z.string().min(1).max(100)}).strict().optional(),
  defaultChatModel: z.object({provider:z.enum(['openrouter','openai','meta']),modelId:z.string().min(1).max(200)}).strict().optional(),
}).strict();

/** Safe projection only. Never return credentials, env names or arbitrary endpoint URLs. */
export function buildCatalog(env: Record<string, string | undefined>): ProviderCatalog {
  const mode = z.enum(['demo','saas','self-hosted']).parse(env.STUDIO_MODE ?? 'demo');
  const chatModels = modelsSchema.parse(JSON.parse(env.STUDIO_CHAT_MODELS ?? '[]'));
  const openaiModels = modelsSchema.parse(JSON.parse(env.STUDIO_OPENAI_MODELS ?? '[]'));
  const metaModels = modelsSchema.parse(JSON.parse(env.STUDIO_META_MODELS ?? '[]'));
  const speechModels = modelsSchema.parse(JSON.parse(env.STUDIO_SPEECH_MODELS ?? '[]'));
  const voiceId = z.string().trim().max(200).parse(env.STUDIO_SPEECH_VOICE_ID ?? '');
  const voiceLabel = z.string().trim().max(100).parse(env.STUDIO_SPEECH_VOICE_LABEL ?? '');
  const models: ProviderCatalog['models'] = [
    ...chatModels.map(({id, ...model}) => ({provider:'openrouter' as const,modelId:id,...model})),
    ...metaModels.map(({id, ...model}) => ({provider:'meta' as const,modelId:id,...model})),
    ...openaiModels.map(({id, ...model}) => ({provider:'openai' as const,modelId:id,...model})),
  ];
  const defaultProvider = env.STUDIO_DEFAULT_CHAT_PROVIDER?.trim();
  const defaultModelId = env.STUDIO_DEFAULT_CHAT_MODEL?.trim();
  const selected = models.find(m => m.provider === defaultProvider && m.modelId === defaultModelId);
  if ((defaultProvider || defaultModelId) && !selected) throw new Error('INVALID_DEFAULT_CHAT_MODEL');
  return {
    mode, liveChatEnabled: false,
    providers: [
      {id:'openrouter',label:'OpenRouter',capability:'chat',credentialConfigured:Boolean(env.OPENROUTER_API_KEY?.trim())},
      {id:'meta',label:'Meta Model API',capability:'chat',credentialConfigured:Boolean(env.META_API_KEY?.trim())},
      {id:'elevenlabs',label:'ElevenLabs',capability:'speech',credentialConfigured:Boolean(env.ELEVENLABS_API_KEY?.trim())},
      {id:'openai',label:'OpenAI',capability:'chat',credentialConfigured:Boolean(env.OPENAI_API_KEY?.trim())},
    ],
    models,
    speechModels: speechModels.map(({id,label}) => ({provider:'elevenlabs',modelId:id,label})),
    ...(voiceId ? {speechVoice:{provider:'elevenlabs' as const,voiceId,label:voiceLabel || voiceId}} : {}),
    ...(selected ? {defaultChatModel:{provider:selected.provider,modelId:selected.modelId}} : {}),
  };
}
