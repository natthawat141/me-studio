# ADR 0005 — Reuse Pi core; own scoped local memory

Status: implemented internal foundation with offline verification; not connected to studio/live providers. Reviewed 2026-11-02.

## User intent

Reuse open-source harness code, keep necessary features and add application memory. Before this change only mock chat, project Agent settings and the reviewed-input renderer existed.

## Decision

Use the pinned published `@earendil-works/pi-agent-core` and `@earendil-works/pi-ai` 1.4.0 packages, rather than copying an entire repository. Pi provides the loop, structured tool execution and events. me studio owns owner/project/session boundaries, approved tools, persistent facts/transcripts/runs, idempotent request handling and bounded context/calls.

The published 1.4.0 artifact uses `typebox` 1.3.27. Upstream main already references `@earendil-works/pi-schema`, but that package returned npm 404 during review. Code follows the installed declarations and README, not main-only examples. Node >=22.19.0 is required by the packages. Preserve the lockfile and THIRD_PARTY_NOTICES.md.

Memory uses Node's built-in SQLite on disk. On the verified Node 22.22.3 runtime, node:sqlite emits an ExperimentalWarning. No native SQLite npm binding or external database server is installed. The default demo writes to a unique ignored .studio/agent-demo/<uuid>/memory.sqlite; application storage is supplied by trusted host code. Application-level identity/schema markers prevent initialization over unknown databases.

## Alternatives

- LangGraph.js provides state/checkpoint persistence and memory support, with a SQLite checkpointer available. Appropriate if explicit graph execution/checkpoint recovery becomes central. Not selected for the current small loop because it introduces graph/persistence abstractions in addition to the product's current jobs.
- Hermes Agent is a broader Python agent/runtime with tools/skills/memory and an MIT license. Useful reference for a full personal assistant, but importing the complete runtime would add Python packaging and capabilities beyond this Node-local slice. No Hermes code was copied.
- A custom loop would avoid an external runtime but repeat orchestration/stream/tool mechanics. Not selected; custom code is restricted to product policy/storage/tool adapters.

These fit judgments are engineering decisions, not comparative performance benchmarks.

## Memory and authorization

User facts are scoped to owner; project facts to owner+project; transcript/run records to owner+project+session. All scopes come from internal trusted caller context. They are not authentication and do not yet enforce any HTTP endpoint. Agent memory tools capture the project scope and cannot select another owner/project in arguments. User-wide preferences are host-managed, not agent-written.

Mutation tools require host grants. A remembered value must appear verbatim in the current user text, and is stored with source/run reference and revision. This is a grounding check, not a semantic fact verifier. Stale updates fail. Forgetting removes the saved value/source reference and preserves a revision tombstone, preventing stale recreation. The chat archive is separate; forgetting a memory does not erase historical messages or guarantee model unlearning.

Context includes bounded reference JSON and complete recent turns. Older turns stay archived; no semantic summarizer, embeddings or vector DB are implemented. Memory never grants provider/tool permissions or becomes executable code.

## Scope and deferred boundaries

Implemented: injectable provider stream, sequential tool loop, safe event projection, scoped memory read/write/forget, persisted transcripts/run status, duplicate request replay, input/context/model/tool limits and cooperative cancellation. All tests and demonstration use an offline scripted stream and real Pi/SQLite. No real model inference or billed usage is claimed.

Deferred: protected local API/session, provider selection/access and monetary budgets, studio UI integration, file/scene/voice/render tools, sandbox choice, auto-summary/semantic search and in-flight crash recovery. A crashed running session is not automatically resumed or retried. Successful turns can be loaded in a new process; failed/incomplete tool chains are not replayed into future model context.

The model and stream must be supplied by trusted server code. Do not bind base URLs, credentials, owner IDs or approvedTools directly from an HTTP body. Do not expose a paid endpoint until the existing auth/ownership/approval/budget rules are implemented. Extra tools are host implementations and require host approval. No shell, arbitrary Python or automatic execution of generated HTML is registered.

## Sources checked

- https://github.com/earendil-works/pi/tree/main/packages/agent — core design/docs; installed 1.4.0 declarations are the interface used.
- https://registry.npmjs.org/@earendil-works/pi-agent-core/1.4.0 — exact published version/dependencies/Node floor/MIT metadata, checked using npm view and installed package.json.
- https://registry.npmjs.org/@earendil-works/pi-ai/1.4.0 — exact published provider layer dependencies; provider implementations are lazy, but transitive SDK packages are still installed.
- https://github.com/earendil-works/pi/blob/main/LICENSE — retained upstream MIT notice.
- https://github.com/langchain-ai/langgraphjs and https://docs.langchain.com/oss/javascript/langgraph/add-memory — memory/persistence alternative.
- https://github.com/NousResearch/hermes-agent and its LICENSE — broader alternative and license.
- Installed @types/node 22.19.19 SQLite declarations and actual Node 22.22.3 execution — built-in database API and experimental warning. No blanket stability claim.
