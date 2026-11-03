# me studio — product contract

## Outcome
Thai-first AI cartoon studio: a user supplies a brief, reviews a storyboard and estimate, approves generation, then watches and revises a versioned video. Users do not install agent skills themselves.

Current priority (2026-11-03): a chat-first Mac desktop frontend for hackathon validation. Home → conversation → click a labelled artifact → optional right preview. Folder Projects group chats and a user-selected local directory; no manual scene form is required. Familiar chat layout, white content, light translucent sidebar and Prompt Kit composer; see [current frontend plan](docs/plans/2026-11-03-chat-first-frontend.md). The harness/provider implementation is paused while UX is reviewed. Hosted SaaS criteria below remain future targets.

The `/desktop` screen uses scripted sample replies and bundled video/image artifacts. Its provider settings cover OpenRouter/OpenAI/Meta/custom display metadata; API-key entry is disabled and no provider request is made. Drafts/history/preferences use the separate `me-studio.chat-ui.v1` local storage key. Attachments remain in memory by chat until sent; only filenames are retained in sample messages. Existing browser-project storage and native projects are preserved, not migrated or loaded into this prototype. The legacy `/` project studio remains separate.

The subsequent open-source harness/memory request is implemented as an internal Pi core + scoped SQLite foundation, verified with offline scripted streams. It is not connected to studio chat, live providers or automatic generated-code execution. See docs/agent-harness.md and ADR 0005.

## Canonical workflow
Brief → script/storyboard revision → voice/output settings → server quote → explicit approval → queued/running job → video artifact → revision/new version.
- Project groups conversations, assets, storyboards and generations. It is not a single video.
- Conversation has messages; each generation captures an immutable input/model/storyboard version.
- User-uploaded media, bundled examples and generated output have distinct provenance.
- Quotes expire; approval authorizes one quote/version. A changed brief needs a new quote. The server owns reservations, debits and refunds; retry never double-charges.
- Provider means the service receiving the request; model means its model ID. Meta Model API is a distinct provider for Muse models; Llama is a model family. Configuration supports Meta directly and OpenRouter, with provider-specific IDs. See docs/model-research-2026-11-01.md; direct inference is not implemented.
- Voice identity, speech model and chat model are separate settings. Provider catalogs and language support are discovered/validated; never invent model versions.

## Preview decision
For `/desktop`, the right preview is closed on Home and after a sample reply; an explicit artifact click or the Files button opens it. Sample artifacts remain labelled examples. The native Mac app lets users choose a local folder, browse/filter its files and play existing video/audio or preview images/text beside chat. Folder Projects retain their identity and associated chats across app restarts; users can select a new folder if the original moves. HTML/Python are read-only source text; HTML runtime/real generation remain future work. The ordinary web prototype requires the desktop bridge for folder Projects. AI configuration lives in the category-based Settings dialog. These are existing-file previews, not new render/export operations.

Legacy `/` retains the project Agent settings gear and project video panel; these older controls are not the accepted desktop V1 UX. Do not execute generated HTML in the application DOM. HTML preview and MP4 rendering have independent acceptance criteria.

## Deployment modes
- SaaS: service-owned provider keys; authenticated tenants, server-side permissions, per-user budgets and usage ledger. Users select operator-approved models.
- Self-hosted: same domain/API; operator supplies environment secrets and permitted model IDs. Future authenticated owner UI can manage encrypted credentials. Editing preferences is not connecting a provider.
- Demo: no provider requests or real billing; examples labelled, cancellation and local persistence still work.

## Current status
Implemented: local browser project/file operations, video playback, mock chat, configuration/catalog backend foundation, a separate local CLI for reviewed seek-driven HTML/audio → validated MP4, and an internal Pi harness/scoped SQLite memory store verified offline. CLI jobs store input snapshots and unique output versions on disk and support progress/cancellation; they are not wired into studio UI or a durable queue. No live AI generation, tenant auth/application database, credit accounting, credential-management UI or in-app HTML runtime. Do not describe this as SaaS-ready or “only needs an API key”. The reviewed-input renderer is not an arbitrary-code sandbox.

## MVP release criteria
A new account can create an owned project, obtain a reviewed storyboard/quote, approve exactly once, receive a real video, revise it without losing earlier versions, and recover from failed/cancelled jobs. Ownership must hold across every project/file/job endpoint. Self-host setup must work from documented env examples. See docs/ACCEPTANCE.md.

## Project Agent settings
Optional validated settings on each Project: confirmation policy (always or paid-only), chat-model override, image/video aspect ratios and output counts. Legacy projects use safe defaults without forced migration. Controls save on change; failures do not replace the prior settings. Chat requests include a settings snapshot. Paid-only means free work can skip an extra confirmation; it does not authorize charging and does not bypass server quotes/approvals. Image/video model selection remains unavailable until actual service capabilities are integrated.

Desktop Project directory settings persist the chosen source and output directories through native pickers. Source controls the current read-only Files tree. Output is reserved configuration; the scripted chat does not generate or save files there yet.

## Video harness V1

Desktop can connect local OpenAI/ElevenLabs credentials through a native file picker and produce short structured Canvas cartoons in a folder Project. Pi calls storyboard/HTML compilation, voice, render and trim tools, with scoped memory and Project skills. Native artifacts can be reopened and exported. Unconfigured chat remains a labelled sample. See [video harness](docs/video-harness.md) for current limits and evidence.
