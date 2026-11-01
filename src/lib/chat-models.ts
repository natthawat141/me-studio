import recommendations from '@/data/model-recommendations.json';
export type ChatModel = { provider: string; modelId: string };
export const chatModelStorageKey = "me-studio.chat-model.v1";

/** Provider identity is part of a selection; model names/IDs can overlap. */
export function chatModelKey(model: ChatModel) { return model.modelId ? `${model.provider}:${model.modelId}` : ''; }

export function chatModelLabel(model: ChatModel) {
  return recommendations.models.find((item)=>chatModelKey(item)===chatModelKey(model))?.label ?? model.modelId;
}
