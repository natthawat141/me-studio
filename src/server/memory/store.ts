import { randomUUID } from 'node:crypto';
import { chmodSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { z } from 'zod';
import {
  MemoryError, memoryEntrySchema, memoryKeySchema, memoryScopeSchema, memoryWriteSchema,
  runInputSchema, runSchema, sessionScopeSchema, transcriptSchema, usageSchema,
  type MemoryScope, type MemoryWrite, type RunRecord, type RunUsage, type SessionScope, type TranscriptMessage,
} from './contracts';

const applicationId = 0x4d455354;
const memoryColumns = 'key, value, revision, source, source_ref AS sourceRef, updated_at AS updatedAt';
const runColumns = 'id, request_id AS requestId, input_hash AS inputHash, model, status, result, error_code AS errorCode, created_at AS createdAt, updated_at AS updatedAt, usage_json';
const emptyUsage: RunUsage = { modelCalls: 0, toolCalls: 0, inputTokens: 0, outputTokens: 0 };

/** Internal local repository. Callers must derive identities from trusted context; this does not authenticate requests. */
export class StudioMemoryStore {
  private readonly db: DatabaseSync;
  private closed = false;

  constructor(path: string) {
    if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
    this.db = new DatabaseSync(path);
    try {
      const identity = Number(this.db.prepare('PRAGMA application_id').get()?.application_id);
      const version = Number(this.db.prepare('PRAGMA user_version').get()?.user_version);
      const tables = this.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all();
      if ((identity !== 0 && identity !== applicationId) || version > 1 || (identity === 0 && tables.length > 0)) {
        throw new MemoryError('UNKNOWN_DATABASE', 'Unrecognized memory database; refusing to initialize');
      }
      this.db.exec('PRAGMA busy_timeout=5000; PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA foreign_keys=ON;');
      this.transaction(() => {
        this.db.exec(`
          CREATE TABLE IF NOT EXISTS memories (
            owner_id TEXT NOT NULL, scope_key TEXT NOT NULL, key TEXT NOT NULL,
            value TEXT, revision INTEGER NOT NULL, source TEXT NOT NULL, source_ref TEXT,
            deleted INTEGER NOT NULL DEFAULT 0, updated_at INTEGER NOT NULL,
            PRIMARY KEY(owner_id, scope_key, key)
          );
          CREATE TABLE IF NOT EXISTS agent_runs (
            id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, project_id TEXT NOT NULL, session_id TEXT NOT NULL,
            request_id TEXT NOT NULL, input_hash TEXT NOT NULL, model TEXT NOT NULL,
            status TEXT NOT NULL CHECK(status IN ('running','completed','failed','cancelled')),
            result TEXT, error_code TEXT, usage_json TEXT NOT NULL, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL,
            UNIQUE(owner_id, project_id, session_id, request_id)
          );
          CREATE UNIQUE INDEX IF NOT EXISTS one_active_agent_session
            ON agent_runs(owner_id,project_id,session_id) WHERE status='running';
          CREATE TABLE IF NOT EXISTS agent_messages (
            seq INTEGER PRIMARY KEY AUTOINCREMENT, run_id TEXT NOT NULL REFERENCES agent_runs(id),
            owner_id TEXT NOT NULL, project_id TEXT NOT NULL, session_id TEXT NOT NULL, message_json TEXT NOT NULL
          );
          CREATE INDEX IF NOT EXISTS session_message_lookup ON agent_messages(owner_id,project_id,session_id,seq);
          PRAGMA application_id=${applicationId}; PRAGMA user_version=1;
        `);
      });
      if (path !== ':memory:') chmodSync(path, 0o600);
    } catch (error) {
      this.db.close(); this.closed = true;
      throw error instanceof MemoryError ? error : new MemoryError('MEMORY_DATABASE_ERROR', 'Could not open memory database; original file was not replaced');
    }
  }

  close() { if (!this.closed) { this.db.close(); this.closed = true; } }

  private transaction<T>(operation: () => T): T {
    this.db.exec('BEGIN IMMEDIATE');
    try { const result = operation(); this.db.exec('COMMIT'); return result; }
    catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }

  getRevision(scope: MemoryScope, key: string): number {
    const parsed = memoryScopeSchema.parse(scope); memoryKeySchema.parse(key);
    return Number(this.db.prepare('SELECT revision FROM memories WHERE owner_id=? AND scope_key=? AND key=?')
      .get(parsed.ownerId, parsed.projectId ?? '', key)?.revision ?? 0);
  }

  remember(scope: MemoryScope, write: MemoryWrite) {
    const parsed = memoryScopeSchema.parse(scope);
    const input = memoryWriteSchema.parse(write);
    return this.transaction(() => {
      const revision = this.getRevision(parsed, input.key);
      if (revision !== input.expectedRevision) throw new MemoryError('MEMORY_CONFLICT');
      this.db.prepare(`INSERT INTO memories(owner_id,scope_key,key,value,revision,source,source_ref,deleted,updated_at)
        VALUES(?,?,?,?,?,?,?,0,?) ON CONFLICT(owner_id,scope_key,key) DO UPDATE SET
        value=excluded.value,revision=excluded.revision,source=excluded.source,source_ref=excluded.source_ref,deleted=0,updated_at=excluded.updated_at`)
        .run(parsed.ownerId, parsed.projectId ?? '', input.key, input.value, revision + 1, input.source, input.sourceRef ?? null, Date.now());
      return memoryEntrySchema.parse(this.db.prepare(`SELECT ${memoryColumns} FROM memories WHERE owner_id=? AND scope_key=? AND key=?`)
        .get(parsed.ownerId, parsed.projectId ?? '', input.key));
    });
  }

  list(scope: MemoryScope, { query = '', limit = 50 }: { query?: string; limit?: number } = {}) {
    const parsed = memoryScopeSchema.parse(scope);
    z.string().max(200).parse(query); z.number().int().min(1).max(100).parse(limit);
    return this.db.prepare(`SELECT ${memoryColumns} FROM memories WHERE owner_id=? AND scope_key=? AND deleted=0
      AND instr(lower(key || ' ' || value),lower(?))>0 ORDER BY updated_at DESC,key ASC LIMIT ?`)
      .all(parsed.ownerId, parsed.projectId ?? '', query, limit).map((row) => memoryEntrySchema.parse(row));
  }

  forget(scope: MemoryScope, key: string, expectedRevision: number): boolean {
    const parsed = memoryScopeSchema.parse(scope); memoryKeySchema.parse(key);
    z.number().int().nonnegative().parse(expectedRevision);
    return this.transaction(() => {
      const revision = this.getRevision(parsed, key);
      if (revision !== expectedRevision) throw new MemoryError('MEMORY_CONFLICT');
      if (revision === 0) return false;
      const result = this.db.prepare('UPDATE memories SET value=NULL,source_ref=NULL,deleted=1,revision=revision+1,updated_at=? WHERE owner_id=? AND scope_key=? AND key=? AND deleted=0')
        .run(Date.now(), parsed.ownerId, parsed.projectId ?? '', key);
      return Number(result.changes) > 0;
    });
  }

  private decodeRun(row: Record<string, unknown>): RunRecord {
    const { usage_json, ...rest } = row;
    return runSchema.parse({ ...rest, usage: JSON.parse(String(usage_json)) });
  }

  getRun(session: SessionScope, runId: string): RunRecord | null {
    const scope = sessionScopeSchema.parse(session);
    const row = this.db.prepare(`SELECT ${runColumns} FROM agent_runs WHERE id=? AND owner_id=? AND project_id=? AND session_id=?`)
      .get(runId, scope.ownerId, scope.projectId, scope.sessionId);
    return row ? this.decodeRun(row) : null;
  }

  beginRun(session: SessionScope, request: z.infer<typeof runInputSchema>) {
    const scope = sessionScopeSchema.parse(session); const input = runInputSchema.parse(request);
    return this.transaction(() => {
      const existing = this.db.prepare(`SELECT ${runColumns} FROM agent_runs WHERE owner_id=? AND project_id=? AND session_id=? AND request_id=?`)
        .get(scope.ownerId, scope.projectId, scope.sessionId, input.requestId);
      if (existing) {
        const run = this.decodeRun(existing);
        if (run.inputHash !== input.inputHash || run.model !== input.model) throw new MemoryError('REQUEST_CONFLICT');
        return { run, replayed: true };
      }
      if (this.db.prepare("SELECT id FROM agent_runs WHERE owner_id=? AND project_id=? AND session_id=? AND status='running'")
        .get(scope.ownerId, scope.projectId, scope.sessionId)) throw new MemoryError('SESSION_BUSY');
      const id = randomUUID(); const now = Date.now();
      this.db.prepare(`INSERT INTO agent_runs(id,owner_id,project_id,session_id,request_id,input_hash,model,status,usage_json,created_at,updated_at)
        VALUES(?,?,?,?,?,?,?,'running',?,?,?)`)
        .run(id, scope.ownerId, scope.projectId, scope.sessionId, input.requestId, input.inputHash, input.model, JSON.stringify(emptyUsage), now, now);
      return { run: this.getRun(scope, id)!, replayed: false };
    });
  }

  saveMessage(session: SessionScope, runId: string, message: TranscriptMessage) {
    const scope = sessionScopeSchema.parse(session);
    const parsed = transcriptSchema.parse(message); const json = JSON.stringify(parsed);
    if (json.length > 100_000) throw new MemoryError('MESSAGE_TOO_LARGE');
    this.transaction(() => {
      if (this.getRun(scope, runId)?.status !== 'running') throw new MemoryError('RUN_NOT_ACTIVE');
      this.db.prepare('INSERT INTO agent_messages(run_id,owner_id,project_id,session_id,message_json) VALUES(?,?,?,?,?)')
        .run(runId, scope.ownerId, scope.projectId, scope.sessionId, json);
    });
  }

  finishRun(session: SessionScope, runId: string, result: { status: 'completed' | 'failed' | 'cancelled'; result?: string; errorCode?: string; usage: RunUsage }) {
    const scope = sessionScopeSchema.parse(session);
    const input = z.object({ status: z.enum(['completed', 'failed', 'cancelled']), result: z.string().max(100_000).optional(), errorCode: z.string().max(80).optional(), usage: usageSchema }).strict().parse(result);
    this.transaction(() => {
      if (this.getRun(scope, runId)?.status !== 'running') throw new MemoryError('RUN_NOT_ACTIVE');
      this.db.prepare('UPDATE agent_runs SET status=?,result=?,error_code=?,usage_json=?,updated_at=? WHERE id=?')
        .run(input.status, input.result ?? null, input.errorCode ?? null, JSON.stringify(input.usage), Date.now(), runId);
    });
    return this.getRun(scope, runId)!;
  }

  readTranscript(session: SessionScope, { completedOnly = false, limit = 2000 }: { completedOnly?: boolean; limit?: number } = {}): TranscriptMessage[] {
    const scope = sessionScopeSchema.parse(session); z.number().int().min(1).max(5000).parse(limit);
    const rows = this.db.prepare(`SELECT message_json FROM (
      SELECT m.seq,m.message_json FROM agent_messages m JOIN agent_runs r ON r.id=m.run_id
      WHERE m.owner_id=? AND m.project_id=? AND m.session_id=? AND (?=0 OR r.status='completed') ORDER BY m.seq DESC LIMIT ?
    ) ORDER BY seq ASC`).all(scope.ownerId, scope.projectId, scope.sessionId, completedOnly ? 1 : 0, limit);
    return rows.map((row) => transcriptSchema.parse(JSON.parse(String(row.message_json))));
  }
}
