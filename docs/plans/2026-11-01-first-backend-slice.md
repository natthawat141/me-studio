# First backend slice — owned projects

Status: in progress. The pure authorization policy and regression tests exist; no real identity, database or protected endpoint has been implemented.

## Goal
An authenticated account can create, list, open, rename and archive projects within a workspace, with changes surviving refresh and remaining inaccessible to other workspaces. Existing local projects are not automatically imported or deleted.

## Proposed components
- Next.js App Router route handlers authenticate via a server-side session adapter, not a caller-supplied user/role.
- PostgreSQL stores workspaces, memberships and projects; deployment may use managed or self-managed PostgreSQL.
- A service loads actor/membership/project from trusted sources and calls `src/server/authorization/policy.ts` before a repository mutation.
- Writes use a revision field and conditional SQL update in a transaction. Conflict returns 409 without changing data.
- UI uses a project service adapter, with demo/local and authenticated/backend modes explicitly separated; migration/export is an explicit later operation.

## Ordered work
1. Record database and auth deployment decisions. Verify supported versions and setup from primary documentation, pin dependencies, define secret handling and local prerequisites.
2. Generate and review schema/migrations for users or identity mapping, workspaces, memberships and projects. Run migrations against a disposable real Postgres in integration tests. Never point test migration commands at existing/user databases.
3. Integrate and verify real sessions: expiry/revocation, sign-in/out, session cookie settings and failure behavior. Do not trust browser-supplied membership or workspace ownership.
4. Implement transactional membership/project repositories, revision-aware updates and service authorization. Tests cover missing/foreign membership, inactive members, roles and stale writes.
5. Add authenticated CRUD handlers with schema validation, safe error responses and request IDs. Verify cross-workspace HTTP access and concurrent update behavior. Existing health endpoint remains liveness-only.
6. Wire an explicit backend mode into the frontend with loading, session expiry, save/conflict and failure states. Existing IndexedDB/localStorage data remains untouched until a separately tested import/export flow is built.
7. Run unit, disposable-database integration, HTTP, browser flow, lint and production build checks. Update README/status and record remaining SaaS blockers.

## Non-goals for this slice
Paid AI calls, voice generation, credits, quote/approval, HTML execution, renderer, shared real-time collaboration, production deployment and migration of existing browser projects.
