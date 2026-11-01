# Backend readiness and implementation order

## Readiness
Ready to start backend development; not ready to launch SaaS. Foundation now has safe config validation, runtime health/catalog routes, typed mock chat input and regression checks. No real provider requests, database, session or render jobs exist.

## Milestone 1 — identity and persistent owned projects
Decision needed: auth vendor and deployment target. Recommendation: modular Next.js API, Postgres metadata and object storage; no vendor provisioned yet.
1. Record auth/deployment ADR and local env/setup.
2. Define database schema/migrations for users, workspaces/memberships, projects, conversations and messages. Every owned entity carries workspaceId.
3. Implement session verification and policy service; test unauthenticated and cross-workspace access.
4. Implement project/message repository + revision-aware updates; test concurrent writes.
5. Add project APIs and frontend service adapter. Explicitly migrate/export old browser records; no silent import or replacement.
Exit: two accounts cannot access each other's records; refresh retains data; stale updates return structured conflict.

## Milestone 2 — assets and real chat
1. Owned upload/download flow with type/size/quota validation.
2. Provider service with fixed OpenRouter endpoints, approved model catalog, request validation, timeout/cancel and sanitized errors.
3. Authenticated streaming chat with server-loaded history, verified asset IDs and usage budgets; idempotent turn submission.
4. UI reads server model catalog. Persist exact model/provider per generation, not just mutable user defaults.
Exit: real model response with disconnect/retry/cancel tests; model not on allowlist cannot be invoked; no secret in client/API/logs.

## Milestone 3 — voice and production planning
1. ElevenLabs model/voice discovery, language/capability validation and authorized previews.
2. Versioned storyboard editing and exact generation input snapshot.
3. Quote + expiry + approval bound to snapshot; atomic reservation/ledger and idempotency.
Exit: changed storyboard invalidates old quote; repeated approval cannot charge twice.

## Milestone 4 — jobs and real video
Durable queue/outbox + sandbox worker + assets/fonts/audio composition. Worker callbacks authenticate; jobs retry with attempt limits, can cancel and recover after reconnect. Validate/render/publish immutable artifact versions.
Exit: one brief produces a new real playable MP4 and a revision preserves previous outputs. Failure/cancel settles reserved usage correctly.

## UI cleanup track
Before judging final UX: visually verify the shared app navigation and initial library border reduction; continue consolidated scoped CSS, error/conflict recovery and HTML artifact view design. The right workspace supports the explicitly requested project Agent settings mode; video mode remains dedicated to video. HTML rendering is an isolated worker concern, not a chat component executing arbitrary code.

## Owner setup and open source
Initial setup: .env.local + operator model allowlist; current UI adds a local model preference, not server permission or credentials. Later owner/admin settings require authenticated authorization, encrypted secret storage, validation/test connection and deletion. Additional providers require a server adapter contract with tests, not an arbitrary public URL proxy.
Public source visibility does not grant an open-source license. Select a project license and complete dependency/reference review before advertising the project as open source. Private reference source is not part of this repository.

Detailed first implementation slice: [owned projects plan](plans/2026-11-01-first-backend-slice.md). The authorization rules have isolated tests but are not yet enforced by real endpoints.
