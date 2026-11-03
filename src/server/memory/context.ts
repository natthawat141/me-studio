import { z } from 'zod';
import type { MemoryScope } from './contracts';
import type { StudioMemoryStore } from './store';

/** Bounded reference data only; never interpreted as a tool authorization or a system instruction. */
export function buildMemoryContext(store: StudioMemoryStore, scope: MemoryScope & { projectId: string }, maxChars = 6000): string {
  z.number().int().min(64).max(32_000).parse(maxChars);
  const result: { project: ReturnType<StudioMemoryStore['list']>; user: ReturnType<StudioMemoryStore['list']> } = { project: [], user: [] };
  for (const [kind, facts] of [
    ['project', store.list(scope, { limit: 100 })],
    ['user', store.list({ ownerId: scope.ownerId }, { limit: 100 })],
  ] as const) {
    for (const fact of facts) {
      result[kind].push(fact);
      if (JSON.stringify(result).length > maxChars) result[kind].pop();
    }
  }
  return JSON.stringify(result);
}

/** Drop whole old user turns instead of leaving orphan tool results in model context. No semantic summary is claimed. */
export function selectRecentTurns<T extends { role: string }>(messages: T[], maxChars: number): T[] {
  const groups: T[][] = [];
  for (const message of messages) {
    if (message.role === 'user') groups.push([]);
    if (groups.length) groups[groups.length - 1].push(message);
  }
  const selected: T[][] = [];
  let length = 0;
  for (let index = groups.length - 1; index >= 0; index--) {
    const size = JSON.stringify(groups[index]).length;
    if (length + size > Math.max(0, maxChars)) break;
    selected.unshift(groups[index]); length += size;
  }
  return selected.flat();
}
