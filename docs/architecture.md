# Architecture and backend boundary

## Decision
Start with a modular monolith: Next.js HTTP handlers → server services → repositories/providers. Keep video execution in a separate sandboxed worker, not in a request handler or browser. This avoids running several services before the domain is stable, while allowing workers to scale independently later.

Current code: src/app/api/health and src/app/api/catalog, src/server/config.ts, src/lib/provider-config.ts. No database/auth/provider inference runtime yet. UI/domain contracts must not import server modules. server-only guards configuration ownership; public catalog is an explicit projection without keys/env names/URLs.

## Target domain (planned)
User, Workspace, Membership(role), Project(workspaceId, revision), Conversation(projectId), Message(conversationId, asset references), Asset(workspaceId, provenance, storageKey, media type), StoryboardVersion, Generation(input snapshot, model/voice/output config), Quote(expiresAt, inputHash), Approval, Job(status, attempt), ArtifactVersion, UsageLedger(idempotency key).
Every server operation derives actor/workspace membership from verified session; client IDs are lookup keys, not authority. Asset access, signed URLs, downloads and worker callbacks require equivalent ownership checks.

## Data/storage
Postgres is the proposed transactional source of truth for SaaS metadata, jobs, quotes and ledger. Object storage holds binaries; queue/workers own execution. Choose auth provider and hosting in a recorded ADR before provisioning. Self-hosting uses the same API semantics; SQLite is not promised without a separate tested repository implementation.
Legacy localStorage/IndexedDB data remains on-device. Cloud migration must be explicit, exportable, resumable and preserve legacy IDs/provenance. Current revision checks detect stale snapshots but are not atomic across browser processes. Move local writes to one transactional IndexedDB repository before claiming multi-tab safety. IndexedDB blob deletion + localStorage changes are currently not a shared transaction.

## Providers
Current metadata registry: OpenRouter(chat), Meta Model API(chat) and ElevenLabs(speech). Muse models can be configured directly under Meta or through OpenRouter with route-specific IDs. Inference adapters are not implemented. Configured means a key exists, not that it is verified/entitled. Browser catalog contains only safe metadata and allowed models. Adding a model does not grant permission to call it.
Never accept arbitrary upstream URLs or env names from public requests. Additional transports require a reviewed server adapter. Credentials are resolved server-side per deployment/owner; UI may store only preferences. SaaS defaults to operator keys; tenant BYOK is a later encrypted vault feature.

## API stages
Implemented GET /api/health: process liveness only, not auth/database/provider readiness.
Implemented GET /api/catalog: configured modes and operator-approved model metadata; no upstream calls or secrets.
Planned authenticated endpoints: session; project CRUD with revisions; assets upload/complete/download; chat turns + resumable events; voices/models; quote; approval; generation; job status/cancel; artifact revisions.
Paid endpoints must not be published before auth, ownership, input validation, rate limiting, budget checks and idempotency. Separate transport status from upstream/model errors. Unknown failure → actionable safe message with request ID; never echo provider response bodies/credentials.

## Job invariants
Proposed: draft → quoted → approved → queued → running → succeeded/failed/cancelled. State transitions, timeout/retry limits and cancellation are server enforced. Quote/approval binds to exact inputs; credit reservation and job enqueue require transactional consistency/outbox. Render output is validated before publishing. Generated code runs in isolated execution with resource/time/network limits and no service credentials. HTML preview uses an isolated sandbox/origin; preview success does not imply render success.

## Sources checked 2026-11-01
- OpenRouter models: https://openrouter.ai/docs/api/api-reference/models/list-all-models-and-their-properties
- OpenRouter chat: https://openrouter.ai/docs/api/api-reference/chat/create-a-chat-completion
- ElevenLabs models: https://elevenlabs.io/docs/api-reference/models/list
Model availability and account access are changeable. Discover models/capabilities and validate selection at request time; do not derive support from marketing names.

Project Agent settings now persist as an optional validated Project field. The mock chat request carries an independent settings snapshot, with project chat override taking precedence over studio default. This is local preference behavior; backend capability, quote and approval validation remain required. The right workspace explicitly supports a settings mode alongside its video mode; HTML remains separate.

Backend stack recommendation and rationale: [ADR 0003](decisions/0003-backend-stack.md). A pure project/workspace authorization policy exists at `src/server/authorization/policy.ts`, with tests; it is not yet connected to authentication, database records or API handlers and does not by itself enforce access.
