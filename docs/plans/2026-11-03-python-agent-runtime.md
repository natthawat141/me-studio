# Python agent runtime — 2026-11-03

## Request and delivered slice

Move the active native video agent runtime to Python. Preserve the accepted frontend, local Projects, drafts, attachments, original media and scoped memory. Do not rebuild the entire backend or add arbitrary shell/Python execution.

Delivered: Python owns the bounded OpenAI Responses model/tool loop. A private JSONL Node bridge preserves scope, tool grants, SQLite facts/transcripts/runs and existing production tools. Native production and the video CLI use Python; legacy Pi is retained explicitly for the older Meta path. No silent fallback. The Mac app includes a frozen Python/SDK runtime.

## Owning changes

- `python/me_studio_agent/{runtime,worker}.py`: async streaming loop and one-run subprocess transport.
- `src/server/agent/runtime.mts`: trusted bridge, persistence, grants, events, bounds and process cancellation. Old code retained in `pi-runtime.mts`.
- `src/server/video/native-production.mts`: selects packaged Python, preserves Project skills, tools and artifact registry.
- `scripts/desktop/build-python.mjs`, build scripts/package.json: pinned venv setup, PyInstaller onedir, SDK diagnostics and distribution licenses.
- `tests/python-agent.test.mts`, Python SDK tests and offline fixtures/demo: real subprocess/tool boundaries with no provider spending.
- CI sets up Python before running the now-cross-language test suite. Existing sidebar UI tests received only HTMLVideoElement type assertions required by the build.
- Canonical instructions/product/architecture/docs updated; operational guide: `docs/python-agent-runtime.md`.

## Verification actually run

- `npm test`: **65 passed**, including actual Python subprocess, scoped memory writes/recall, missing runtime, invalid/unapproved tools, whole over-budget batches, model/context/time bounds, cancellation, safe errors and environment isolation.
- Cross-engine regression: Pi writes facts/transcripts/run → close/reopen SQLite → Python returns the same completed request without a subprocess or side effects → Python restores legacy conversation/facts. No schema migration.
- `npm run agent:python-test`: **3 passed** using the installed OpenAI Python SDK with HTTP MockTransport. Fixed Responses request, streaming, retry suppression and legacy message normalization.
- `npm run agent:demo`: retained legacy Pi memory demo passed offline.
- `npm run lint`, `npm run build`, `npx tsc --noEmit`, `git diff --check`: passed. Initial build caught test typing errors; corrected and rerun successfully.
- `npm run desktop:stage` followed by electron-builder with the normal config/Mac arm64 target and temporary output directory: passed. Frozen executable `--version` and `--check` passed. Python sidecar/resources: approximately 33 MB. `--check` constructs and closes the SDK client without network.
- `npm run desktop:smoke`: staged worker reports runtime=python and unconfigured; frozen SDK loads; real legacy renderer/ffprobe smoke passes with fixed environment.
- The same smoke ran against the installed app's `Contents/Resources/runtime`: passed, including an actual 8-second 1080×1920 MP4.
- `PLAYWRIGHT_CHANNEL=chrome npm run test:ui -- tests/ui/video-production.spec.ts`: **2 passed** with an isolated mock native bridge. These prove frontend contracts, not live AI.
- `npm run agent:python-demo`: actual Python loop → Node skill/save/render tools → real 3-second 540×960 H.264/AAC at 24 fps. Offline scripted model; silent audio track, no speech/API call. Probed output and a 3-frame contact sheet including the ending inspected.
- Native app opened from the updated release path. Existing Project/chat and pang_bill.png attachment remained readable. Existing generated MP4 reopened in the right panel and played. No new AI request was sent from the app.
- Packaged runtime file-name scan found no `.env` files. No real credentials were read or copied for this change.

## Local artifacts

Installed app: `/Users/macarthur/aicatoon/cartoon-studio/release/mac-arm64/me studio.app`.

The previous app was moved intact, after normal Quit, to `.studio/frontend-review/me-studio-before-python-20261103-205100.app`. Existing native userData was left in place. Installed Node worker SHA-256: `bd68ad94b408877718ccbcca96a13fc3b971dc57f44ac7d6a952d469f4217986`.

Python demo evidence: `.studio/python-agent-demo/27a5e8ef-8388-4505-bf70-0e95afc9ba83/result.json` and its output folder. MP4: `output/animation-21d593fc-6bee-493f-b2bf-4ffebcaa6ace/renders/0ce96b52-1f2c-43ef-bd84-147211d4d923/video.mp4`. Contact sheet: `.studio/python-agent-demo/contact.png`. All are ignored local test outputs, separate from user projects.

## Limits

No paid OpenAI/ElevenLabs call was made after migration. SDK mocks, actual rendering and native launch do not prove live Python inference/account entitlement. Earlier live Pi generation remains historical evidence. Credentials must be explicitly loaded again after app restart, as before.

Node still owns memory persistence, production tools/compiler/renderer and Electron; this is not a fully Python backend. Pi remains for legacy transport/schema compatibility. There is no new arbitrary Python tool, web API/service, durable queue, crash lease recovery or rollback of completed tool side effects. Clean-machine and other-platform distribution remain unverified.
