import { z } from 'zod';

const id = z.string().min(1).max(128).regex(/^[a-zA-Z0-9_-]+$/);
export const memoryScopeSchema = z.object({ ownerId: id, projectId: id.optional() }).strict();
export const sessionScopeSchema = z.object({ ownerId: id, projectId: id, sessionId: id }).strict();
export type MemoryScope = z.infer<typeof memoryScopeSchema>;
export type SessionScope = z.infer<typeof sessionScopeSchema>;
export const memoryKeySchema = z.string().min(1).max(80).regex(/^[\p{L}\p{N}_.-]+$/u)
  .refine((key) => !/secret|password|credential|api[_.-]?key|token/i.test(key), 'Credentials do not belong in memory');
export const memoryWriteSchema = z.object({
  key: memoryKeySchema,
  value: z.string().trim().min(1).max(4000).refine((value) => !/\bBearer\s+\S+|\bsk-[a-zA-Z0-9_-]{8,}/i.test(value), 'Credentials do not belong in memory'),
  expectedRevision: z.number().int().nonnegative(),
  source: z.enum(['user', 'agent']),
  sourceRef: z.string().min(1).max(200).optional(),
}).strict();
export type MemoryWrite = z.infer<typeof memoryWriteSchema>;
export const memoryEntrySchema = z.object({
  key: memoryKeySchema, value: z.string(), revision: z.number().int().positive(),
  source: z.enum(['user', 'agent']), sourceRef: z.string().nullable(), updatedAt: z.number(),
});
export type MemoryEntry = z.infer<typeof memoryEntrySchema>;
export const runInputSchema = z.object({ requestId: id, inputHash: z.string().min(1).max(256), model: z.string().min(1).max(240) }).strict();
export const usageSchema = z.object({
  modelCalls: z.number().int().nonnegative(), toolCalls: z.number().int().nonnegative(),
  inputTokens: z.number().nonnegative(), outputTokens: z.number().nonnegative(),
}).strict();
export type RunUsage = z.infer<typeof usageSchema>;
export const runSchema = z.object({
  id, requestId: id, inputHash: z.string(), model: z.string(),
  status: z.enum(['running', 'completed', 'failed', 'cancelled']),
  result: z.string().nullable(), errorCode: z.string().nullable(),
  createdAt: z.number(), updatedAt: z.number(), usage: usageSchema,
});
export type RunRecord = z.infer<typeof runSchema>;
export type TranscriptMessage = { role: 'user' | 'assistant' | 'toolResult'; content: string | unknown[]; timestamp: number; [key: string]: unknown };
export const transcriptSchema = z.object({
  role: z.enum(['user', 'assistant', 'toolResult']), content: z.union([z.string(), z.array(z.unknown())]), timestamp: z.number(),
}).passthrough();

export class MemoryError extends Error {
  constructor(public readonly code: string, message = code) { super(message); this.name = 'MemoryError'; }
}
