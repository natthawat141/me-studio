# me studio

Thai-first cartoon studio. The current priority is a local-first hackathon prototype, with hosted SaaS a later direction. The native desktop supports explicitly connected Project video chat through a Python agent runtime and trusted local HTML/voice/render tools. Unconfigured sample chat remains separate. See [video harness](docs/video-harness.md) and [Python runtime](docs/python-agent-runtime.md) for setup and limits.

## Instructions for coding AI

Start with [AGENTS.md](AGENTS.md) and [the AI guide](docs/ai-guide.md). CLAUDE.md and GEMINI.md import the shared rules; GitHub Copilot has a thin repository wrapper. Scoped instructions live under [components](src/components/AGENTS.md), [desktop](desktop/AGENTS.md) and [server](src/server/AGENTS.md). These files guide development; they do not configure or grant permissions to the product's runtime AI.

## Start locally

Node >=22.19.0, npm. From this directory:

```sh
npm ci
cp .env.example .env.local
npm run dev -- --port 3100
```

Open http://localhost:3100. For production preview: `npm run build`, then `npm start -- --port 3100` (stop the dev process first).

The Mac desktop `/desktop` screen has a top-right Files button: choose a local folder, expand/filter its tree and click an MP4 to play beside chat. Audio, images and bounded source-text previews also work. The chosen folder is read-only and retained until the app exits; no upload or AI request is made. Native folder selection requires the packaged app, while the web prototype explains that limitation. Build for Apple Silicon with `npm run desktop:build`; open `release/mac-arm64/me studio.app`. HTML/Python files display source and are not executed.

## Local HTML/audio → MP4

```sh
npm run local:setup
npm run local:doctor
npm run local:demo
```

Node >=22.19.0, FFmpeg/ffprobe and a supported local Chromium/Chrome are required. Setup installs Playwright Chromium if no supported browser is found; it does not install OS packages. The demo re-renders existing animation/audio as a real 8-second portrait MP4, saves an input snapshot and job state to `.studio/renders/<id>/`, and prints the output path. No AI/API key is used. Import that MP4 into the studio with + to play it; the CLI is not connected to studio generation controls yet.

For your own reviewed animation: `npm run local:render -- --project /absolute/path/project.json`. HTML must expose `window.seek(milliseconds)`, with assets/audio explicitly listed in the manifest. This reviewed-input CLI is not a sandbox for arbitrary generated code. See [setup, manifest, cancellation, output and limitations](docs/local-development.md), [local-first plan](docs/plans/2026-11-02-local-first.md) and [ADR 0004](docs/decisions/0004-local-first-runtime.md).

## Agent harness and local memory

The active native video harness uses a Python loop with a trusted Node bridge and a scoped SQLite store for user/project facts, transcripts and runs. It supports tool events, host-approved memory read/write/forget, revisions, request idempotency, bounded context/calls and cooperative cancellation. It is connected to explicitly configured native Project chat. Browser data remains unchanged; the older Pi implementation remains for the legacy Meta path.

Run `npm run agent:demo` to exercise the real Pi loop and SQLite against an explicitly scripted offline provider: remember a character, close/reopen storage, recall in a new session, verify project isolation. No AI inference/key/paid request. Node 22 SQLite emits an expected ExperimentalWarning. See [interfaces and limitations](docs/agent-harness.md), [ADR 0005](docs/decisions/0005-agent-harness-memory.md), [plan](docs/plans/2026-11-02-agent-harness-memory.md) and [third-party notices](THIRD_PARTY_NOTICES.md).

## Providers and models

The configuration registry supports OpenRouter, OpenAI, Meta Model API and ElevenLabs. Meta is not limited to Llama: Muse has direct Meta API routes. See [provider standby research](docs/model-research-2026-11-03.md) and the [earlier model research](docs/model-research-2026-11-01.md). Unconfigured chat remains a sample; explicitly configured native video sessions use OpenAI through Python.

`.env.local` accepts:
- `STUDIO_MODE`: demo (default), self-hosted or saas. This describes intent; saas does not enable account/auth/billing services.
- `OPENROUTER_API_KEY`, `OPENAI_API_KEY`, `META_API_KEY`, `ELEVENLABS_API_KEY`: server credentials; never NEXT_PUBLIC variables. Do not commit real keys. Existing parent-file names Openai_api/meta_ai_api/elevenlabs were mapped once into the ignored app-local env; runtime code uses canonical names.
- `STUDIO_CHAT_MODELS`: JSON array of `{ "id": "actual-provider-model-id", "label": "Display name", "family": "optional-family" }`.
- `STUDIO_OPENAI_MODELS`: direct OpenAI model metadata; requested standby model is `gpt-6-luna`.
- `STUDIO_DEFAULT_CHAT_PROVIDER` / `STUDIO_DEFAULT_CHAT_MODEL`: optional server default pair, validated against configured model lists. Standby default is OpenAI / `gpt-6-luna`.
- `STUDIO_META_MODELS`: same metadata shape, using direct Meta API IDs (for example `muse-wonder-1.0`), not OpenRouter IDs.
- `STUDIO_SPEECH_MODELS`: same shape using real ElevenLabs model IDs. Check language/TTS capabilities with the provider.
- `STUDIO_SPEECH_VOICE_ID` / `STUDIO_SPEECH_VOICE_LABEL`: separate voice identity metadata. Standby uses `eleven_v3` for Thai and the official example voice `JBFqnCBsd6RMkjVDRZzb`; ElevenLabs metadata currently returns 401, so it is not verified as usable with the configured key.

Requested Meta standby route is `muse-spark-1.3-contributor`. Meta may use submitted content to train models under Contributor mode; only metadata was requested during setup. OpenAI/Meta model metadata checks returned 200, which does not prove paid inference/billing readiness. No generation call was made. The packaged desktop sample UI does not automatically load this developer env file; credentials are loaded explicitly through the native file picker and kept in worker memory.

Lists default to empty. Use actual IDs from [OpenRouter models](https://openrouter.ai/docs/api/api-reference/models/list-all-models-and-their-properties) and [ElevenLabs models](https://elevenlabs.io/docs/api-reference/models/list); the app does not invent model versions or probe providers in this release. Restart the server after env changes. Configured key presence is not a verified connection. No real key is needed for the current demo.

Settings → โมเดลแชต selects configured models or saves a manual OpenRouter/Meta model preference. It appears in the chat selector after returning to the studio. This does not add server permission or call AI. Dated model candidates (Haiku 5.5 and Muse Wonder) are selectable preferences, not verified account access or server permission.

Settings → การเชื่อมต่อ displays server key configuration status; UI key management awaits authenticated owner settings/encrypted storage.

To add an operator-approved model: add its ID/label to STUDIO_CHAT_MODELS, restart, then select it in the UI. To add a new provider: add a reviewed server adapter and safe catalog capability mapping with tests; never accept arbitrary client-supplied URLs or expose credentials. See docs/architecture.md.

## What works / what does not

| Surface | Current implementation |
| --- | --- |
| Projects, messages, imported files | Local browser storage; no cloud accounts/sync |
| Chat | Validated structured request to mock adapter, selected model and asset IDs included |
| Native agent/memory | Python loop + trusted Node tools and SQLite facts/transcripts/runs; explicit native connection; Python verified offline |
| Drafts | Separate per project during the current studio session; not durable across reload/navigation |
| Workspace writes | Revision check rejects stale snapshots; not atomic cross-process storage |
| Existing videos | Real playback/download on the desktop right panel; imported or bundled examples |
| HTML files in studio | Stored/downloaded only; no in-app HTML preview or render-job integration |
| Local renderer CLI | Real seek-driven HTML → MP4 with timed audio, input snapshots, progress/cancellation and output validation; reviewed local inputs only |
| Models/connections | Server config catalog + local model preferences; no live chat/TTS calls |
| GET /api/health | Process liveness only |
| GET /api/catalog | Safe runtime model/provider metadata; 503 for invalid config; no secrets |
| Login, credits, AI generation/jobs | UI examples/planned; no auth, charges or AI generation backend. Local CLI render jobs are separate disk records |

New sessions start on an empty project. Existing selected projects remain preserved. Legacy filename-only messages remain readable; new attachments retain asset IDs. Imported files are stored in IndexedDB (250 MB/file limit); browser cleanup removes local data. Workspace stale-write conflict stops studio autosave; reload to see latest saved data. Unsaved drafts are not a cloud backup.

## Work standards

- [PRODUCT.md](PRODUCT.md): intended workflow and release scope.
- [DESIGN.md](DESIGN.md): interaction/visual hierarchy, preview boundaries.
- [AGENTS.md](AGENTS.md), [CONTRIBUTING.md](CONTRIBUTING.md): coding workflow and agent boundaries.
- [Architecture](docs/architecture.md), [backend implementation order](docs/backend-readiness-plan.md), [acceptance gates](docs/ACCEPTANCE.md).
- [Foundation plan](docs/plans/2026-11-01-foundation.md), [provider ADR](docs/decisions/0001-provider-and-runtime-boundaries.md).

```sh
npm test
npm run lint
npm run build
npm run test:api # requires a completed build
```

CI repeats these checks. It does not replace browser UX checks, security review or SaaS release acceptance. Current foundation tests cover stale/corrupt storage, attachment identity, draft isolation, config validation and safe provider metadata. See docs/verification-2026-11-01.md for delivered evidence and limitations.

## Code map

The current desktop V1 is an Electron Mac arm64 app with a chat-first frontend at `/desktop`: Home, chat/drafts/history/search, Prompt Kit composer/file picker, multi-provider metadata settings, and an artifact preview opened by clicking a labelled sample. Configured native Project sessions can render through the Python agent; other provider forms remain metadata. old browser/native project data is preserved separately. See the [current frontend plan and evidence](docs/plans/2026-11-03-chat-first-frontend.md). The earlier [hackathon plan](docs/plans/2026-11-03-desktop-hackathon.md) contains superseded UI work; the active video loop is now Python; older frontend-only descriptions are historical.

Cmd/Ctrl+K opens the command-search palette. It groups quick actions, recent chats, existing sample artifact files and message-text matches, with bottom category filters and arrow/Enter navigation. File results open the existing preview; text results return to the matching message. See [search refinement](docs/plans/2026-11-03-command-search.md).

Build locally with `npm run desktop:build`. Open `release/mac-arm64/me studio.app`. It is an unsigned development app, not a signed/notarized release. Run `npm run agent:python-setup` on the build machine first. The packaged runtime bundles Python, Node, Chromium and FFmpeg; configured native production and the unconfigured sample adapter remain separate. For browser review use `http://localhost:3100/desktop`.

`src/app`: thin route entrypoints, root layout/global styles and HTTP handlers. `src/components` groups screens and their components by feature:

```text
src/components/
  auth/       Login/register screen
  studio/     Studio screen and project Agent settings
  projects/   Projects screen and shared inline project rename
  library/    Library screen and its media detail views
  settings/   Settings screen, provider controls and related styles
  preview/    Labelled component demonstration screen
  layout/     Shared brand and application navigation
  chat/       Shared chat cards and model selector
  media/      Video player and voice controls
  ui/         Installed Base UI/shadcn primitives
```

Each component's dedicated CSS stays in its feature folder. Routes import screen modules directly; do not add compatibility re-exports at the components root. `components/ui` keeps its existing shadcn alias. `src/services`: client adapters; `src/lib`: shared contracts/local persistence; `src/server`: server-only configuration; `tests`: regression tests.

The studio screen still owns its existing orchestration, and global CSS remains migration debt. New domain modules belong outside screen components. The separate local renderer lives under `scripts/local/`. Auth/application repositories and hosted isolated workers remain future backend stages. The local CLI has no HTTP execution endpoint or paid provider operation.

## Reference and sample assets

`public/demos/` contains existing real MP4 samples; they are not newly generated by mock chat. The `/components-preview` route renders labelled storyboard/credit/job UI examples from `src/components/preview/`. A private reference application was consulted for interface inspiration; its source code and backend are not included in this repository.

Base UI/shadcn primitives are installed. The earlier voice-picker implementation was inspired by ElevenLabs UI, not installed as its official component. Current composer shows disconnected guidance. Historical notes are kept locally and excluded from the public repository.

## Open-source readiness

This repository is public, but a project license has not been selected yet. Public visibility alone does not grant an open-source license; licensing is pending owner decision. Keep env secrets excluded and provide only .env.example. See docs/ACCEPTANCE.md for launch blockers.

Project names now edit inline in the studio and project list: click name, Enter/blur saves, Escape cancels. The folder icon opens a project from the list. No rename modal.

## Browser regression checks

After `npm run build`, install a test browser with `npx playwright install chromium`, then run `npm run test:ui`. On a developer Mac with Chrome already installed, `PLAYWRIGHT_CHANNEL=chrome npm run test:ui` uses an isolated headless test profile. Tests launch their own local server on port 3210 and do not use your existing browser session. CI installs Chromium and runs these checks.

## Project Agent settings
The composer gear replaces the paperclip button and opens settings in the right workspace, even without a video. Plus still imports files; the full library remains in primary navigation. Confirmation preference, project chat override and output aspect ratios/counts save separately per project and persist on refresh. Legacy projects get defaults. Closing restores a previously visible video without resetting playback position. Mobile settings are full-screen with keyboard focus containment. Image/video generation models are not selectable until integrated; these preferences do not authorize credits or generate media.

The recommended backend stack and first authorization policy slice are documented in [ADR 0003](docs/decisions/0003-backend-stack.md). The policy is tested in isolation and is not connected to real sessions, a database, or protected endpoints yet.

## Active Python agent

`npm run agent:python-setup` prepares pinned development dependencies. `npm run agent:python-test` tests the SDK transport offline; `npm run agent:python-demo` exercises the Python loop and real HTML-to-MP4 tools with a scripted model. End users of the packaged Mac app need no Python installation. [Runtime ownership, packaging and verification](docs/python-agent-runtime.md). Node still owns persistence, permissions and production tools.
