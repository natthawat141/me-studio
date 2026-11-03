import 'server-only';
import { buildCatalog } from '@/lib/provider-config';

export function getProviderCatalog() {
  return buildCatalog({
    STUDIO_MODE: process.env.STUDIO_MODE,
    STUDIO_CHAT_MODELS: process.env.STUDIO_CHAT_MODELS,
    STUDIO_OPENAI_MODELS: process.env.STUDIO_OPENAI_MODELS,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    STUDIO_DEFAULT_CHAT_PROVIDER: process.env.STUDIO_DEFAULT_CHAT_PROVIDER,
    STUDIO_DEFAULT_CHAT_MODEL: process.env.STUDIO_DEFAULT_CHAT_MODEL,
    STUDIO_META_MODELS: process.env.STUDIO_META_MODELS,
    META_API_KEY: process.env.META_API_KEY,
    STUDIO_SPEECH_MODELS: process.env.STUDIO_SPEECH_MODELS,
    STUDIO_SPEECH_VOICE_ID: process.env.STUDIO_SPEECH_VOICE_ID,
    STUDIO_SPEECH_VOICE_LABEL: process.env.STUDIO_SPEECH_VOICE_LABEL,
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
    ELEVENLABS_API_KEY: process.env.ELEVENLABS_API_KEY,
  });
}
