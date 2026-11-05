# me studio — product contract

## Outcome
Thai-first AI cartoon studio: a user supplies a brief, reviews a storyboard and estimate, approves generation, then watches and revises a versioned video. Users do not install agent skills themselves.

Current priority (2026-11-03): a chat-first Mac desktop frontend for hackathon validation. Home → conversation → click a labelled artifact → optional right preview. Folder Projects group chats and a user-selected local directory; no manual scene form is required. Familiar chat layout, white content, light translucent sidebar and Prompt Kit composer; see [current frontend plan](docs/plans/2026-11-03-chat-first-frontend.md). Native video chat now uses a Python agent loop; see docs/python-agent-runtime.md. Hosted SaaS criteria below remain future targets.

The `/desktop` screen preserves unconfigured sample chat separately from explicitly connected native Project sessions. Settings allow a local credential file to connect OpenAI and optional ElevenLabs; other provider forms remain metadata. Draft/history/preferences use the separate `me-studio.chat-ui.v1` key. Native attachments retain actual bytes through scoped local file IDs. Existing browser/native projects are preserved; the legacy `/` studio remains separate.

The active video harness is Python plus a trusted Node bridge and scoped SQLite foundation. Pi remains only for the separate legacy Meta path. This is not a public service or general code-execution agent. See docs/python-agent-runtime.md and docs/agent-harness.md.

## Canonical workflow
Brief → script/storyboard revision → voice/output settings → server quote → explicit approval → queued/running job → video artifact → revision/new version.
- Project groups conversations, assets, storyboards and generations. It is not a single video.
- Conversation has messages; each generation captures an immutable input/model/storyboard version.
- User-uploaded media, bundled examples and generated output have distinct provenance.
- Quotes expire; approval authorizes one quote/version. A changed brief needs a new quote. The server owns reservations, debits and refunds; retry never double-charges.
- Provider means the service receiving the request; model means its model ID. Meta Model API is a distinct provider for Muse models; Llama is a model family. Configuration supports Meta directly and OpenRouter, with provider-specific IDs. See docs/model-research-2026-11-01.md; direct inference is not implemented.
- Voice identity, speech model and chat model are separate settings. Provider catalogs and language support are discovered/validated; never invent model versions.

## Preview decision
Desktop sidebar interaction update (2026-11-03): Project headers are disclosure controls, not conversation navigation. The write action starts/resumes a Project draft, persisted separately from sent threads. Empty folders display “ไม่มีแชต”; only sending creates a history row. Legacy unsent threads migrate to drafts without changing their IDs/text or removing data. Search can recover saved drafts. Browsing/collapsing folders preserves the active transcript and player; disclosure state and sidebar scroll persist. All desktop chats are grouped, with existing general chats shown in Default workspace without rewriting native scope or moving files. The fixed shell/composer stays mounted while only the new transcript fades in; switching restores its scroll position. Open artifact panels remain until explicitly closed. Directory Projects are still required for connected video production.

For `/desktop`, the right preview starts closed; an explicit artifact click or the Files button opens it. Sample artifacts remain labelled examples. The native Mac app lets users choose a local folder, browse/filter its files and play existing video/audio or preview images/text beside chat. Folder Projects retain their identity and associated chats across app restarts; users can select a new folder if the original moves. HTML/Python are read-only source text; arbitrary HTML execution remains unavailable; supported native generation uses a trusted compiler. The ordinary web prototype requires the desktop bridge for folder Projects. AI configuration lives in the category-based Settings dialog. Existing-file previews and generated native artifacts share the local player.

Legacy `/` retains the project Agent settings gear and project video panel; these older controls are not the accepted desktop V1 UX. Do not execute generated HTML in the application DOM. HTML preview and MP4 rendering have independent acceptance criteria.

## Deployment modes
- SaaS: service-owned provider keys; authenticated tenants, server-side permissions, per-user budgets and usage ledger. Users select operator-approved models.
- Self-hosted: same domain/API; operator supplies environment secrets and permitted model IDs. Future authenticated owner UI can manage encrypted credentials. Editing preferences is not connecting a provider.
- Demo: no provider requests or real billing; examples labelled, cancellation and local persistence still work.

## Current status
Implemented: chat-first desktop, folder Projects, persisted attachments, inline media/native file preview, explicitly connected Python video harness with scoped SQLite memory and Project skills, HTML-to-MP4/voice/trim tools and versioned local output. The reviewed-input CLI remains available. No tenant auth, hosted application database, credit accounting, durable queue or arbitrary generated-code sandbox. Native Python orchestration is verified offline; account entitlement/live inference after migration is a separate check. See docs/video-harness.md for supported scene limits.

## MVP release criteria
A new account can create an owned project, obtain a reviewed storyboard/quote, approve exactly once, receive a real video, revise it without losing earlier versions, and recover from failed/cancelled jobs. Ownership must hold across every project/file/job endpoint. Self-host setup must work from documented env examples. See docs/ACCEPTANCE.md.

## Project Agent settings
Optional validated settings on each Project: confirmation policy (always or paid-only), chat-model override, image/video aspect ratios and output counts. Legacy projects use safe defaults without forced migration. Controls save on change; failures do not replace the prior settings. Chat requests include a settings snapshot. Paid-only means free work can skip an extra confirmation; it does not authorize charging and does not bypass server quotes/approvals. Image/video model selection remains unavailable until actual service capabilities are integrated.

Desktop Project directory settings persist the chosen source and output directories through native pickers. Source controls the current read-only Files tree. Configured native generation writes immutable versions under the selected output directory; unconfigured sample chat does not write there.

File reveal/save actions resolve opaque preview grants in main and recheck canonical paths before calling Finder or copying. Renderer requests cannot provide source/destination paths. The native destination-folder picker grants a destination for one copy; writes are exclusive and size bounded. The worker receives the host Downloads directory as a startup argument; `save_file_to_downloads` resolves a generated ID in the current conversation and writes a numbered copy there without overwriting. Exported copies join that conversation's generated registry; they are not automatically embedded as a second video.

## Video harness V1 (current; supersedes early frontend-only scope above)

Desktop is a conversational creative agent with optional directory Projects. Local config.env selects OpenAI/OpenRouter models and ElevenLabs voice settings; model visibility is editable in Settings. Python can discuss a brief, present clickable choices, author original HTML/CSS/SVG animation, share real previews, restore per-chat versions and render MP4. Native unconfigured sends preserve the draft and request configuration. Browser-only previews remain labelled samples. See [video harness](docs/video-harness.md) for exact capability and verification boundaries.

The active model/tool loop is Python. Node still owns tools, memory, scopes and rendering; the app bundles the Python runtime. This is not a complete Python backend rewrite. Native media/file previews and persisted attachments are available. Live Pi evidence predates this migration; Python offline render checks do not prove live provider access.

Native agent-capable chat refreshes worker credential status before every text send. Cached UI state never selects sample mode. Disconnected, unavailable, wrong-provider or missing-Project states retain the draft and explain the required setup. Native attachments join the normal agent send; browser/read-only previews keep labelled examples. Settings show key-load success/failure inside the dialog. Loading a key is not verification of provider entitlement.

## Collaborative creation

User intent and references govern direction. Expertise helps explain choices and execute well; it must not impose a fixed cast, duration, style or universal approval sequence. Slash commands are optional discovery shortcuts. Skills are bundled creative capabilities with project-specific enable/disable preferences. Working HTML/JSON are internal unless requested. Native sends include bounded image inputs and plain text references for the selected model; vision support depends on that model. Audio/video remain view-only.

## Native creative configuration (2026-11-03)

AppConfig in Electron owns a fixed userData/config.env path and returns safe model metadata. Narrow IPC opens/reloads the config or toggles a model; production revalidates an enabled configured selection before passing provider/model/key privately to Python. Default workspace uses an app-owned output directory. The active production tool set excludes the legacy fixed-scene compiler and exposes declarative HTML/CSS/SVG previews, optional contextual choices, voice and rendering. Model-authored HTML never runs in the privileged app DOM; the host rejects active content and adds its own seek code for CSS animations. See video-harness.md for limits and remaining audio/video-analysis work.

## Deep Agents runtime update

The active Python video runtime now uses Deep Agents SDK with explicit LangChain model adapters. Node retains Project grants, credentials, SQLite and production tools. Real Project image assets, three-frame draft/MP4 inspection, up to three versioned render attempts/request, native request-scoped streaming/Stop and persisted reasoning effort are implemented. See [Python runtime guide](python-agent-runtime.md) for exact limits and trust boundaries. Verification and live-provider quality are separate claims. Research/Tavily and richer creative skill content remain subsequent work.

## Desktop 0.2: verified previews and stable Project state

The worker file-preview module resolves only host-owned roots, rejects symlinks/escapes, bounds source/raster bytes, and reuses html-authoring validation. Main keeps compiled HTML under a bounded ephemeral opaque studio-preview grant. The protocol adds sandbox + script-none CSP, and the iframe grants neither scripts nor same-origin. Local assets are inlined after validation; arbitrary HTML is never injected into the app DOM. Sources remain escaped in the Code view, and unsupported files return a preview error.

Production publishes host-resolved resultFiles; main persists ChatFiles IDs and removes host paths from renderer results. save_html_animation writes versioned design-N.html beside compiler-owned scene.html. capture_project_html creates a unique PNG without changing the active creative draft/voice. Request/session-scoped host activity supplies safe relative paths and operation states without forwarding arbitrary arguments.

ProjectEdits owns expiring, single-use native edit tokens and staged source/output selections. ProjectFolders applies a revision-checked atomic registry update. Main holds a Project lease across production setup and completion; directory mutation checks that lease inside the queued update. Before a source change, the worker copies validated known legacy state to userData/project-state/<projectId>/<sessionId>; subsequent runs use the same state location. Project skill preferences live one level above sessions; custom skill documents remain in the chosen source. Corrupt destination data and originals are preserved.
