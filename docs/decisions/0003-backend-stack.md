# ADR 0003 — Backend stack direction

Status: proposed architecture; authorization policy first slice implemented. 2026-11-01.

## Context
me studio needs a hosted SaaS and a self-hostable edition, shared API/domain behavior, tenant isolation, provider adapters and long-running rendering. Current product is a Next.js/TypeScript prototype with mock chat and local browser storage. Avoid placing a video renderer in an HTTP request.

## Recommendation
- Next.js App Router route handlers for the initial HTTP API, with server services, repositories and authorization separated from UI. This is a modular monolith; route handlers are public endpoints and must enforce auth and ownership.
- PostgreSQL for users, memberships, projects, revisions, jobs, quotes and usage ledger. Managed Supabase PostgreSQL or self-managed PostgreSQL are deployment choices, not different domain models. Select hosting and identity after confirming operational preferences.
- Evaluate Better Auth as the leading self-hostable auth option with Postgres and Next.js. This is a proposal, not configured or security-validated. Compare with managed auth, migration/identity portability, session revocation, account recovery, social providers and SaaS operational responsibilities before finalizing.
- Evaluate Drizzle as the first migration/query option; select version and verify its actual migration workflow against a disposable Postgres database before committing a schema. ORM is not installed yet.
- Object storage with an S3-compatible API for uploaded assets and output; use local development storage or a compatible service behind a repository. Provider choice, signed URLs, backups and lifecycle policies remain open.
- A dedicated TypeScript job worker, persistent queue and separate sandboxed renderer using Playwright/Chromium + FFmpeg as a starting hypothesis. Queue choice (BullMQ + Redis versus a PostgreSQL-backed queue) follows a measured operational and transaction/outbox design; neither is installed. A container alone must not be assumed a sufficient security boundary for untrusted code. Choose isolation and egress controls deliberately.
- Adapter boundaries for OpenRouter, Meta Model API and ElevenLabs; never ship keys to clients. No paid provider endpoint before verified auth, project ownership, budgets and abuse controls.
- Docker Compose for local multi-service orchestration, proposed only. No service has been provisioned in this change.

## First implementation slice
The pure project/workspace authorization policy under `src/server/authorization/` is an executable rule and tests deny cross-workspace access. **It is not authentication or an enforced API**: future handlers must derive principal, memberships and project from verified session and server-side storage. Never accept a role/ownership assertion from a request body.

## Sources verified 2026-11-01
- Next.js BFF and public route handlers: https://nextjs.org/docs/app/guides/backend-for-frontend
- Better Auth PostgreSQL and Next.js installation: https://better-auth.com/docs/installation
- Drizzle migrations: https://orm.drizzle.team/docs/drizzle-kit-migrate
- BullMQ workers: https://docs.bullmq.io/guide/workers
- Docker Compose: https://docs.docker.com/compose/gettingstarted/

## Milestone gate
Verified session → actual DB-backed tenant membership and project CRUD with conflict-safe revisions → owned assets → budgeted authenticated provider calls → quote/approval → durable jobs and isolated render. No claim of SaaS readiness until full `docs/ACCEPTANCE.md` launch gates are met.
