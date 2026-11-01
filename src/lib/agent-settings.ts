import { z } from 'zod';
const count = z.union([z.literal(1),z.literal(2),z.literal(3),z.literal(4)]);
export const agentSettingsSchema = z.object({
  confirmation: z.enum(['always','paid-only']),
  chatModel: z.object({provider:z.string().min(1).max(100),modelId:z.string().min(1).max(200)}).strict().nullable(),
  image: z.object({aspectRatio:z.enum(['16:9','4:3','1:1','3:4','9:16']),count}).strict(),
  video: z.object({aspectRatio:z.enum(['16:9','9:16']),count}).strict(),
}).strict();
export type AgentSettings = z.infer<typeof agentSettingsSchema>;
export function getAgentSettings(value?: AgentSettings): AgentSettings {
  return agentSettingsSchema.parse(value ?? {
    confirmation:'always',chatModel:null,
    image:{aspectRatio:'16:9',count:1},video:{aspectRatio:'16:9',count:1},
  });
}
