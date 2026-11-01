import { agentSettingsSchema, type AgentSettings } from "./agent-settings";
import { z } from "zod";
/** Proposed interfaces only. No endpoint or authentication provider is implemented. */
/** Provider model IDs are discovered/configured; do not invent versions. */
export type SpeechModel = string;
export interface StudioProfile {
  displayName: string;
  email: string;
}
export interface GenerationRequest {
  projectId: string;
  prompt: string;
  attachmentIds: string[];
  speech: {
    provider: "elevenlabs";
    modelId: SpeechModel;
    languageCode: "th";
    voiceId?: string;
  };
}
export type GenerationEvent =
  | { type: "status"; message: string }
  | { type: "video_ready"; assetId: string }
  | { type: "error"; message: string };
/** Credentials belong in a server-side secret store. Never include API keys in GenerationRequest or logs. */

/** Proposed chat contract; no provider request is made by the current prototype. */
export interface ChatModelPreference {
  provider: string;
  modelId: string;
}
export interface ChatTurnRequest {
  projectId: string;
  message: string;
  attachmentIds: string[];
  model: ChatModelPreference | null;
  agentSettings?: AgentSettings;
}
export type ChatTurnEvent =
  | { type: "text_delta"; text: string }
  | { type: "component"; component: import("./chat-components").ChatComponent }
  | { type: "error"; message: string };

export const chatTurnRequestSchema = z.object({
  projectId: z.string().min(1).max(200),
  message: z.string().min(1).max(20000),
  attachmentIds: z.array(z.string().min(1).max(200)).max(20),
  model: z.object({provider:z.string().min(1).max(100),modelId:z.string().min(1).max(200)}).strict().nullable(),
  agentSettings: agentSettingsSchema.optional(),
}).strict();
