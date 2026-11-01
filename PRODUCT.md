# me studio — product contract

## Outcome
Thai-first AI cartoon studio: a user supplies a brief, reviews a storyboard and estimate, approves generation, then watches and revises a versioned video. Users do not install agent skills themselves.

## Canonical workflow
Brief → script/storyboard revision → voice/output settings → server quote → explicit approval → queued/running job → video artifact → revision/new version.
- Project groups conversations, assets, storyboards and generations. It is not a single video.
- Conversation has messages; each generation captures an immutable input/model/storyboard version.
- User-uploaded media, bundled examples and generated output have distinct provenance.
- Quotes expire; approval authorizes one quote/version. A changed brief needs a new quote. The server owns reservations, debits and refunds; retry never double-charges.
- Provider means the service receiving the request; model means its model ID. Meta Model API is a distinct provider for Muse models; Llama is a model family. Configuration supports Meta directly and OpenRouter, with provider-specific IDs. See docs/model-research-2026-11-01.md; direct inference is not implemented.
- Voice identity, speech model and chat model are separate settings. Provider catalogs and language support are discovered/validated; never invent model versions.

## Preview decision
The desktop right workspace shows video or the explicitly requested project Agent settings panel. Gear replaces the composer paperclip; plus imports files. Settings may open without a video. Closing settings restores only a previously visible player and preserves its playback position. Video itself opens only when the selected project has an associated file, never a random example. HTML source/interactive preview is a proposed separate artifact view, not implemented. Do not execute generated HTML in application DOM. HTML preview and MP4 rendering have independent acceptance criteria.

## Deployment modes
- SaaS: service-owned provider keys; authenticated tenants, server-side permissions, per-user budgets and usage ledger. Users select operator-approved models.
- Self-hosted: same domain/API; operator supplies environment secrets and permitted model IDs. Future authenticated owner UI can manage encrypted credentials. Editing preferences is not connecting a provider.
- Demo: no provider requests or real billing; examples labelled, cancellation and local persistence still work.

## Current status
Implemented: local project/file operations, video playback, mock chat, configuration/catalog backend foundation. No live AI generation, tenant auth, server database, credit accounting, credential-management UI, HTML runtime or renderer. Do not describe this as SaaS-ready or “only needs an API key”.

## MVP release criteria
A new account can create an owned project, obtain a reviewed storyboard/quote, approve exactly once, receive a real video, revise it without losing earlier versions, and recover from failed/cancelled jobs. Ownership must hold across every project/file/job endpoint. Self-host setup must work from documented env examples. See docs/ACCEPTANCE.md.

## Project Agent settings
Optional validated settings on each Project: confirmation policy (always or paid-only), chat-model override, image/video aspect ratios and output counts. Legacy projects use safe defaults without forced migration. Controls save on change; failures do not replace the prior settings. Chat requests include a settings snapshot. Paid-only means free work can skip an extra confirmation; it does not authorize charging and does not bypass server quotes/approvals. Image/video model selection remains unavailable until actual service capabilities are integrated.
