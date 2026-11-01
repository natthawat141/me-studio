import 'server-only';
import { buildCatalog } from '@/lib/provider-config';

export function getProviderCatalog() {
  return buildCatalog({
    STUDIO_MODE: process.env.STUDIO_MODE,
    STUDIO_CHAT_MODELS: process.env.STUDIO_CHAT_MODELS,
    STUDIO_META_MODELS: process.env.STUDIO_META_MODELS,
    META_API_KEY: process.env.META_API_KEY,
    STUDIO_SPEECH_MODELS: process.env.STUDIO_SPEECH_MODELS,
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
    ELEVENLABS_API_KEY: process.env.ELEVENLABS_API_KEY,
  });
}
