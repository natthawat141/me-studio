# me studio Desktop Hackathon Implementation Plan

Status update 2026-11-03: Electron/runtime packaging was implemented experimentally, then the project-first/Meta-only/manual scene UI was rejected. Its UI tasks are superseded by [Chat-first frontend V1](2026-11-03-chat-first-frontend.md). Harness/provider work is paused during UX review. Unchecked gates below are not claims of completed behavior.

> **For agentic workers:** Use native execution with the executing-plans workflow if implementation is requested. This turn prepares the plan only; no desktop dependencies or runtime changes are installed. Do not fork DeepSeek or alter the separate evaluation.

**Goal:** Deliver an independently launched macOS arm64 me studio app that edits one cartoon project, previews it and exports a validated MP4, then connects one real-model edit and project memory within the remaining time.

**Architecture:** Electron wraps the existing Next.js frontend and supervises bundled Node services. Narrow preload IPC joins our product tools, Pi harness, scoped memory and existing renderer. Preserve component contracts and browser data; package runtime/media dependencies so the app does not depend on the developer's PATH.

**Tech Stack:** Existing Next.js 16.4.3/React 19.3/TypeScript/Tailwind v4/Base UI/shadcn/Pi 1.4.0; proposed Electron 45.2.1 and electron-builder 26.18.0; bundled Node 22.22.3 and media tools.

**Spec:** [Proposed design, scope, component sources and tradeoffs](../decisions/0006-desktop-hackathon-stack.md).

## Global constraints

- User deadline: two days from 2026-11-03; exact submission time and rules remain unknown. First target macOS arm64 only.
- Own white me studio UI; no copied DeepSeek implementation/branding or decorative eyebrow labels.
- Preserve all existing changes, component exports, storage keys, project drafts and unrelated web functionality.
- No paid automated tests, shipped credentials, arbitrary shell/filesystem operations or unrestricted generated HTML execution.
- Keep public health/catalog APIs read-only. Session identity, project scope, models and tool permissions come from trusted local host policy.
- Prototype a real package early; never present an Electron dev window as a self-contained distributable.

## Review focus

1. Finder launch without a dev terminal: packaged smoke must resolve bundled Node, browser and encoder independently of PATH.
2. Restart/port collision: project state survives, a busy port fails safely, and the app never opens another process's UI.
3. Preview privilege: templates cannot call the app bridge, read secrets or load arbitrary network resources.
4. Render failure/cancel/quit: exactly one terminal state, no invalid MP4 published and no automatic replay of interrupted work.
5. Agent state isolation: edits/memory affect only the active project, stale revisions fail and repeated request IDs do not charge/run twice.

## Task 1 — Packaged desktop/runtime spike (first 4 hours)

**Files:** create `desktop/main.mts`, `desktop/preload.mts`, `desktop/runtime.mts`, `desktop/runtime-protocol.ts`, `desktop/tsconfig.json`, `desktop/electron-builder.yml`, `scripts/desktop/{build,stage-runtime,smoke}.mjs`; modify `package.json`, lockfile, `next.config.ts`, `.gitignore`; add `tests/desktop-runtime.test.ts`.

**Interfaces:** main owns `startRuntime(): Promise<{origin: string; stop(): Promise<void>}>`; private capability/readiness messages stay outside renderer DTOs. Bundled tool descriptors contain absolute paths resolved under application resources.

- [ ] Write tests for owned-server handshake, occupied-port refusal, runtime crash/startup timeout and staged resource resolution.
- [ ] Pin/qualify proposed stable dependencies; enable Next standalone, compile desktop entries and stage public/static assets. Package the known Node runtime with verified checksums.
- [ ] Build a `.app`/ZIP that boots the existing screen with a persistent partition, stable loopback origin, single-instance handling and clean shutdown. Add only narrow preload methods and sender validation.
- [ ] Stage a browser, FFmpeg/ffprobe and explicit production renderer dependencies. Replace PATH-based discovery with injected packaged tool paths while preserving CLI defaults. Do not rely on `@playwright/test` as the production renderer import.
- [ ] From the packaged runtime, render the existing reviewed sample into a temporary application data directory; validate with ffprobe and record dependency/architecture evidence. This can precede in-app export controls.

**Gate:** launching the package and rendering work with system tool discovery disabled. If unresolved after the timebox, continue diagnosis and cut optional features; report the blocker. A CLI-only or Web-only fallback is labelled incomplete for the desktop goal.

## Task 2 — White desktop workspace (day 1)

**Files:** extract `src/components/studio/{studio-shell,project-sidebar,chat-composer,task-status-card}.tsx` from `studio-screen.tsx`; add `src/components/media/{scene-preview,artifact-panel}.tsx`; add scoped owning CSS; update existing layout/chat/media components only as needed.

**Interfaces:** `StudioShell` composes navigation/chat/preview; preview mode is a discriminated `storyboard | scene | artifact | settings` state. UI task cards consume sanitized task/render events, not raw provider objects.

- [ ] Inventory existing components before adding anything. Inspect selected shadcn Base UI/pattern sources and dependency diffs; reuse current controls if integration is larger than the benefit.
- [ ] Keep existing neutral-white design, blue functional actions and Thai labels. Compose three resizable panels with clear collapse/reopen controls; preserve player/focus/drafts and project Agent settings behavior.
- [ ] Add one template entry, an honest empty/loading/error state and event-driven task cards. Use a sample label for existing audio and offline demo mode.
- [ ] Validate desktop layout, keyboard navigation, resize and close/reopen behavior against the prior acceptance contracts. UI polish stays within this layout; no new landing/account screens.

**Gate:** app window can select the demo project and reach its preview, edit and export actions without a terminal. Capture and inspect real screenshots.

## Task 3 — Project/scene tools, real preview and export (day 1 → day 2)

**Files:** add `src/lib/desktop-contract.ts`, `src/services/desktop-client.ts`, `src/server/media/{scene-schema,project-files,render-service,render-tools}.mts`, `desktop/worker.mts`, `src/data/templates/cartoon-greeting/*`; modify existing renderer tool injection, job service and media UI; add focused workspace/render integration tests.

**Interfaces:** preload exposes `createProject({templateId,title})`, `getProject({projectId})`, `updateScene({projectId,expectedRevision,changes})`, `requestPreview({projectId,revision})`, `startRender({projectId,revision,requestId})`, `cancelJob({jobId})`, `saveExport({jobId})` and `onEvent(callback): unsubscribe`. Return promises and bounded serializable DTOs. File paths, save destinations and tool grants are host-owned.

- [ ] Test project-to-directory mapping, path/symlink rejection, stale revisions, duplicate requests and immutable output versions before connecting UI mutations.
- [ ] Create projects from one owned cartoon template using the existing 8-second 1080×1920/30fps baseline. Accept bounded scene/dialogue/style data; compile it deterministically into `window.seek(ms)` HTML. Do not accept arbitrary executable HTML from a tool argument in this sprint.
- [ ] Add isolated scrub/play preview without Node/preload access or provider keys. Preview and render consume the same scene revision/snapshot; static document display alone does not pass.
- [ ] Wrap `renderProject` with the existing input snapshots and validation. Send actual stage/frame progress; separate media work from the UI/agent process; implement cancel and recover stale running records as interrupted.
- [ ] Wire native Save As to succeeded validated artifacts only. Keep prior renders accessible. Handle quit with an active job and export cancellation without marking the job failed.
- [ ] Render through the packaged app and inspect the full MP4/audio/ending, not one poster. Check dimensions, duration and codecs. A pre-existing sample playback is not evidence of a new render.

**Gate:** edit a scene → preview the edited revision → render a new MP4 → save/open it, with a failure and cancellation path tested. Source checkout and prior data remain unchanged.

## Task 4 — One live model and project memory (day 2, after real export)

**Files:** add `src/server/agent/{desktop-adapter,media-tools}.mts`, a single verified provider adapter and focused tests; connect `desktop/worker.mts`, private IPC and the chat client adapter; reuse `src/server/agent/runtime.mts` and `src/server/memory/*`.

**Interfaces:** `startChat({projectId,sessionId,requestId,text})` resolves owner/project/model/grants in the host. Credential setup uses a separate write-only native operation with session-only storage; never send credentials to chat or return them in events. Expose bounded scene read/update and render tools plus the three existing memory tools.

- [ ] Verify event rules and a usable provider/model route before selecting the live adapter. Record primary metadata and exact model ID; do not invent a required Meta model or silently substitute one.
- [ ] Test the adapter with offline fixtures for text/tool streams, safe errors, cancellation, idempotency and model/tool/input limits. Keep the real key out of tests and logs.
- [ ] Require trusted local identity/capability, allowlisted models, validated project scope, one active run, call/token caps and explicit user-triggered paid inference. Do not add a paid public HTTP proxy.
- [ ] Connect the real Pi loop to UI events and scene tools. Prompt edits structured scene data, and the same preview/render path from Task 3 runs. Label fixture playback as demo; provider failure remains a visible failure.
- [ ] Demonstrate one user-triggered live edit if usable credentials are available and the operator authorizes that run. Demonstrate a saved character/style fact recalled in a new session, plus project isolation. Never claim live inference from the existing scripted demo.

**Gate:** a prompt changes the actual scene revision, and a new conversation recalls a project fact. Without live-provider evidence, report the app as a template/render prototype with an offline harness demonstration.

## Task 5 — Freeze and submission evidence (reserve final half-day)

**Files:** add/update `docs/desktop-development.md`, `docs/desktop-demo.md`, packaging notices and README; record verification evidence in this plan and attach the actual package/video paths. Update PRODUCT.md only to reflect functionality actually delivered.

- [ ] Run `npm test`, `npm run lint`, `npm run build` and relevant existing UI tests. Run the desktop package/runtime/render smokes after the final build.
- [ ] Test restart, second launch, occupied port, missing/corrupt asset, cancelled render, disk/save failure, offline provider and no system tool dependencies. Inspect final desktop screenshots and complete output clips.
- [ ] Verify the arm64 package from outside the source directory, ideally a second Mac; audit binary/dylib paths and included files so private `.env`, sessions and snapshots are not shipped.
- [ ] Distinguish unsigned/ad-hoc local demonstration from a signed/notarized release. Use signing only if the owner provides the appropriate access; report exact distribution limitations.
- [ ] Record a short end-to-end demo with one clearly live prompt if qualified, a scene revision, real export and project recall. Include source attribution and event-required disclosures; verify eligibility against the actual hackathon rules.

## Cut order and unresolved items

Cut first: ornamental animation/waveforms, fresh TTS integration, more templates, full storyboard editing and package size optimization. Keep the functional scene preview, actual MP4 render, clear status and honest demo/live labels. Cloud, payments, marketplace, general coding tools and multi-agent orchestration are outside this plan.

Unresolved inputs: exact deadline/timezone and hackathon rules; allowed/required provider and usable credentials; signing/distribution access. These do not block this written plan or the local packaging spike, but they block claims of eligible submission, verified live inference or public signed distribution.
