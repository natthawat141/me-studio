# Minimal agent harness and local memory implementation plan

> **For agentic workers:** Implement natively in this chat, with test-first storage/runtime checks. Preserve the existing renderer changes. No live provider calls, public paid endpoints or UI claims.

**Goal:** Reuse a maintained open-source agent loop and add durable, scoped me studio memory, without rebuilding a coding assistant or adding a separate service.

**Architecture:** Pin Pi agent-core 1.4.0 behind an internal server entry. Host code supplies the provider stream/model and approved tools; the core never discovers credentials or invokes a provider by default. SQLite on disk stores user/project facts, transcripts and run metadata. Current renderer and studio mock remain separate until local-session/API integration.

**Tech stack:** TypeScript, Pi agent-core/pi-ai 1.4.0, TypeBox 1.3.27 (published artifact uses TypeBox), existing Zod, Node >=22.19 with built-in node:sqlite. No native SQLite npm module. Node 22 SQLite is experimental and this limitation is explicit.

**Spec:** User requested open-source harness reuse, only necessary features and application memory. ADR 0005 records evaluated alternatives, sources/license, scope and deferred work.

## Global constraints

- No changes to app UI, browser projects or mock/live catalog in this slice.
- No live model or paid operation; provider/model are injected internal interfaces, not accepted from a public request.
- Memory is scoped by trusted owner/project/session identities. Stored data never authorizes tools or provider access.
- Memory writes/deletes from the agent require host-granted permissions. Remembered values must be grounded in the current user's text; user-wide preferences are managed by host code, not an agent-selected owner/scope.
- Keep bounded model/tool calls, input/context size, cooperative cancellation and persisted terminal status. Duplicate request IDs cannot execute again; changed input with the same ID conflicts.
- Do not give the agent shell, Python, arbitrary filesystem or automatic HTML execution. Renderer remains reviewed-input only.
- Pin dependencies and retain upstream attribution/license. Inspect published types, not only upstream main.

## Review focus

1. Facts/transcripts must not leak across owners/projects; user preferences may cross only that owner's projects.
2. Stale revisions, forget/recreate and duplicate requests must not silently overwrite/reexecute work.
3. Context must stay bounded and preserve complete user/assistant/tool groups; older transcript is archived, not claimed as summarized.
4. Model/tool failure, cancelled requests and step limits must settle runs and not persist or emit raw provider error text.
5. Restarts retain facts/completed conversations; corrupt/unknown databases fail closed. In-flight crash recovery is not promised.

## Task 1 — durable application memory

Files: src/server/memory/{contracts,store,context}.ts, tests/agent-memory.test.ts.

- [x] Test then implement SQLite initialization/identity, scoped CRUD, revision checks and tombstoned forgetting.
- [x] Test disk reopen, two connections/stale writes, cross-owner/project isolation, bounded retrieval and unknown/corrupt database rejection.
- [x] Implement scoped run records, request hashing/idempotency, single active run per session and transcript persistence.

Interfaces: StudioMemoryStore.remember/list/forget/getRevision; buildMemoryContext; beginRun/saveMessage/finishRun/getRun/readTranscript. Scope and session come from trusted caller context; this is not authentication.

## Task 2 — reuse Pi as an internal harness

Files: src/server/agent/{runtime,memory-tools,index}.mts, tests/agent-harness.test.mts, scripts/local/offline-provider.mts. Pi's published packages are ESM-only; .mts avoids changing the module mode of the existing application/tests.

- [x] Exercise actual Pi loop against an offline scripted stream; test tool execution, remembered fact retrieval after restart and transcript restoration.
- [x] Add model/tool/context/input limits, host-approved mutation tools, safe event/error projections, cancellation and durable result replay.
- [x] Test unauthorized/ungrounded writes, repeated request IDs, changed input, active-session conflicts, tool errors and endless tool loops.

Interfaces: createStudioHarness({store, session, model, stream, limits?}).run({requestId,text,approvedTools?,signal?,onEvent?}). No default provider stream, no credentials, no HTTP endpoint.

## Task 3 — reproducible offline demonstration and documentation

Files: scripts/local/agent-demo.mts, docs/agent-harness.md, THIRD_PARTY_NOTICES.md, ADR 0005, README/PRODUCT/architecture status.

- [x] Demonstrate Pi tool call → scoped memory write → close/reopen store → recall in a new session; label stream as scripted and not real AI.
- [x] Verify npm test, lint and build; compare npm audit with baseline rather than upgrading unrelated dependencies.
- [x] Record real implemented scope and remaining live-provider/UI/render-tool boundaries. No commit/push/deploy in this request.

## Decisions and evidence

2026-11-02: no harness/memory existed; only mock chat, project Agent settings and reviewed-input renderer. Selected Pi core as a small TypeScript loop rather than importing the complete Hermes Python runtime or adding LangGraph graph/checkpoint abstractions now. Sources and installed artifact versions are in ADR 0005. npm package Pi 1.4.0 depends on TypeBox, whereas upstream main already references a not-yet-published pi-schema package; implementation follows the pinned installed artifact. Tests/providers will be offline. Built-in SQLite is present (3.51.3) on Node 22.22.3 and emits the expected experimental warning.

Verification: 43 tests passed (8 memory + 9 harness + 26 prior), lint and Next.js production build passed. npm run agent:demo completed using real Pi/SQLite with scripted responses; retained demo database .studio/agent-demo/af0ecc12-4ce9-44c1-8f6d-6be2ab8b2e2d/memory.sqlite. local:doctor passed after raising the declared Node minimum to 22.19.0. npm audit baseline/current both reported 21 existing items (2 low/19 moderate), no newly affected packages; no unrelated audit fixes applied. No UI/public routes/live provider calls were changed. In-flight crash recovery, protected API integration and real inference remain open.
