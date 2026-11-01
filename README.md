# me studio

Thai-first cartoon studio targeting hosted SaaS and self-hosting. Current release is a local frontend prototype with a read-only backend foundation. Chat is mocked; it does not generate videos or spend provider credits.

## Start locally

Node 22+, npm. From this directory:

```sh
npm ci
cp .env.example .env.local
npm run dev -- --port 3100
```

Open http://localhost:3100. For production preview: `npm run build`, then `npm start -- --port 3100` (stop the dev process first).

## Providers and models

The configuration registry supports OpenRouter, Meta Model API and ElevenLabs. Meta is not limited to Llama: Muse Wonder has a direct Meta API route. See [current model research](docs/model-research-2026-11-01.md). Inference remains mocked.

`.env.local` accepts:
- `STUDIO_MODE`: demo (default), self-hosted or saas. This describes intent; saas does not enable account/auth/billing services.
- `OPENROUTER_API_KEY`, `META_API_KEY`, `ELEVENLABS_API_KEY`: server credentials; never NEXT_PUBLIC variables. Do not commit real keys.
- `STUDIO_CHAT_MODELS`: JSON array of `{ "id": "actual-provider-model-id", "label": "Display name", "family": "optional-family" }`.
- `STUDIO_META_MODELS`: same metadata shape, using direct Meta API IDs (for example `muse-wonder-1.0`), not OpenRouter IDs.
- `STUDIO_SPEECH_MODELS`: same shape using real ElevenLabs model IDs. Check language/TTS capabilities with the provider.

Lists default to empty. Use actual IDs from [OpenRouter models](https://openrouter.ai/docs/api/api-reference/models/list-all-models-and-their-properties) and [ElevenLabs models](https://elevenlabs.io/docs/api-reference/models/list); the app does not invent model versions or probe providers in this release. Restart the server after env changes. Configured key presence is not a verified connection. No real key is needed for the current demo.

Settings → โมเดลแชต selects configured models or saves a manual OpenRouter/Meta model preference. It appears in the chat selector after returning to the studio. This does not add server permission or call AI. Dated model candidates (Haiku 5.5 and Muse Wonder) are selectable preferences, not verified account access or server permission.

Settings → การเชื่อมต่อ displays server key configuration status; UI key management awaits authenticated owner settings/encrypted storage.

To add an operator-approved model: add its ID/label to STUDIO_CHAT_MODELS, restart, then select it in the UI. To add a new provider: add a reviewed server adapter and safe catalog capability mapping with tests; never accept arbitrary client-supplied URLs or expose credentials. See docs/architecture.md.

## What works / what does not

| Surface | Current implementation |
| --- | --- |
| Projects, messages, imported files | Local browser storage; no cloud accounts/sync |
| Chat | Validated structured request to mock adapter, selected model and asset IDs included |
| Drafts | Separate per project during the current studio session; not durable across reload/navigation |
| Workspace writes | Revision check rejects stale snapshots; not atomic cross-process storage |
| Existing videos | Real playback/download on the desktop right panel; imported or bundled examples |
| HTML files | Stored/downloaded only; no HTML runtime/preview and no HTML-to-MP4 renderer |
| Models/connections | Server config catalog + local model preferences; no live chat/TTS calls |
| GET /api/health | Process liveness only |
| GET /api/catalog | Safe runtime model/provider metadata; 503 for invalid config; no secrets |
| Login, credits, generation/jobs | UI examples/planned; no auth, charges or generation backend |

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

`src/app`: routes and HTTP entrypoints; `src/components`: UI; `src/services`: client adapters; `src/lib`: shared contracts/local persistence; `src/server`: server-only configuration; `tests`: regression tests.

The large studio route/global CSS are existing migration debt. Do not add new domain modules inside them. Auth/persistent repositories and render workers are the next backend stages, not completed features.

## Reference and sample assets

`public/demos/` contains existing real MP4 samples; they are not newly generated by mock chat. `src/app/components-preview/` contains labelled storyboard/credit/job UI examples. A private reference application was consulted for interface inspiration; its source code and backend are not included in this repository.

Base UI/shadcn primitives are installed. The earlier voice-picker implementation was inspired by ElevenLabs UI, not installed as its official component. Current composer shows disconnected guidance. Historical notes are kept locally and excluded from the public repository.

## Open-source readiness

This repository is public, but a project license has not been selected yet. Public visibility alone does not grant an open-source license; licensing is pending owner decision. Keep env secrets excluded and provide only .env.example. See docs/ACCEPTANCE.md for launch blockers.

Project names now edit inline in the studio and project list: click name, Enter/blur saves, Escape cancels. The folder icon opens a project from the list. No rename modal.

## Browser regression checks

After `npm run build`, install a test browser with `npx playwright install chromium`, then run `npm run test:ui`. On a developer Mac with Chrome already installed, `PLAYWRIGHT_CHANNEL=chrome npm run test:ui` uses an isolated headless test profile. Tests launch their own local server on port 3210 and do not use your existing browser session. CI installs Chromium and runs these checks.

## Project Agent settings
The composer gear replaces the paperclip button and opens settings in the right workspace, even without a video. Plus still imports files; the full library remains in primary navigation. Confirmation preference, project chat override and output aspect ratios/counts save separately per project and persist on refresh. Legacy projects get defaults. Closing restores a previously visible video without resetting playback position. Mobile settings are full-screen with keyboard focus containment. Image/video generation models are not selectable until integrated; these preferences do not authorize credits or generate media.

The recommended backend stack and first authorization policy slice are documented in [ADR 0003](docs/decisions/0003-backend-stack.md). The policy is tested in isolation and is not connected to real sessions, a database, or protected endpoints yet.
