# ADR 0006: me studio desktop hackathon proposal

Status: proposed implementation, not shipped. Reviewed 2026-11-03, Asia/Bangkok. The user reports two days until submission; the exact cutoff and event rules are not yet supplied.

## Intent and accepted product direction

Build our own downloadable me studio application for non-technical video creators. Study DeepSeek's navigation, chat, workspace and preview interactions as reference material. Do not fork its product, copy its branding, migrate its runtime into this app or require its installation. Preserve me studio's white visual direction and existing work. The separately cloned evaluation remains separate.

The first demonstrable flow is: open the app → create a project from one cartoon template → edit the brief/dialogue → preview → render → save a real MP4. A later live-model step controls the same bounded operations through chat and recalls a project fact. This is a template-backed cartoon workflow, not unrestricted AI-written HTML/Python execution.

## Current evidence

- Existing app: Next.js 16.4.3, React 19.3, TypeScript, Tailwind v4, Base UI 1.9 and shadcn 4.23; Lucide icons. `shadcn info --json` confirms `base-nova`, Base UI, and five installed primitives: alert, button, card, dialog, select.
- Existing screens/components are grouped by feature under `src/components`; URLs remain in `src/app`.
- Pi agent-core/pi-ai 1.4.0 and SQLite memory are implemented and verified with offline scripted streams. UI chat is still mock. There is no live provider or desktop IPC connection.
- The CLI already renders reviewed `window.seek(ms)` HTML and explicit audio into validated MP4. It discovers Chrome/Chromium and FFmpeg/ffprobe on the host and imports Playwright from a development dependency. It is not presently a self-contained packaged runtime or arbitrary-code sandbox.
- Browser project state remains localStorage/IndexedDB. Native project files and project memory must not be described as a completed application database migration.

## Approaches

| Approach | Benefit | Cost / decision |
| --- | --- | --- |
| Electron + existing Next.js standalone build | Reuses screens, routes and client adapters; package existing code first | Larger bundle and a supervised local server; recommended for the two-day deadline |
| Electron + new Vite frontend | Purpose-built renderer without the Next server | Requires routing/API changes and migration of working screens; reassess after the hackathon |
| Tauri + web frontend + Node/media sidecars | Alternative native shell | Adds Rust/native integration while the agent and media work remains Node-based; outside this sprint |

Electron is the desktop carrier, not the UI component library. The recommendation is an engineering judgment based on existing code and deadline, not a benchmark. No framework migration is needed to establish the first working desktop app.

## Proposed stack

| Layer | Choice |
| --- | --- |
| Desktop shell | Electron, TypeScript main/preload, narrow validated IPC |
| Frontend | Keep Next.js 16.4.3 / React 19.3 / TypeScript / Tailwind v4 |
| UI | Existing Base UI/shadcn and Lucide; selected compatible shadcn components/patterns |
| Agent | Existing Pi harness, product-specific tools and existing limits; one live provider route after validation |
| Memory | Existing project-scoped SQLite store |
| Media | Existing seek-driven renderer, packaged Chromium, FFmpeg and ffprobe |
| Runtime | Bundle standalone Node 22.22.3 for the Next server and worker; users install neither Node nor npm |
| Distribution | electron-builder, first macOS arm64 `.app`/ZIP; DMG/signing subject to release checks |

Candidates verified with npm metadata: Electron 45.2.1 (`engines.node >=22.12.0`) and electron-builder 26.18.0 (`latest` tag). These are proposed pins, not installed or qualified together. Verify their packaged compatibility during the first gate; do not silently follow prerelease tags. Keep existing dependencies pinned as they are until a demonstrated compatibility issue requires a change.

Using the known Node runtime sidecar avoids assuming Electron's embedded Node and native-module environment is identical to the tested CLI. The sidecar increases bundle size; measure it rather than claiming a small installer. Compile the worker as an ESM artifact and explicitly package its runtime dependency closure; do not require tsx or an installed dev checkout at runtime.

## Where UI components come from

| UI responsibility | Source / adoption rule |
| --- | --- |
| Buttons, dialogs, selects, existing player/navigation | Reuse installed components and current feature components first |
| Sidebar, resizable panels, tabs, progress | Current shadcn Base UI registry, only if an existing implementation cannot meet the requirement |
| Chat, prompt input, tool/task status | Current shadcn AI Elements patterns; adapt to our sanitized harness events, retain our backend |
| Voice picker, waveform, audio playback | Existing media components first; ElevenLabs UI is an optional source for selected audio UI after dependency/Base UI compatibility review |
| Cartoon storyboard, scene card, artifact/version preview | Compose from the primitives and product contracts; own this domain UI |

ElevenLabs UI components do not themselves provide a speech-generation service or credentials. UI patterns do not require replacing Pi with another agent loop. Do not install an entire registry or add decorative orbs/animations in place of actual progress.

AI SDK Elements currently announces migration to shadcn/ui and deprecation at the end of November 2026. Use the current shadcn pattern source for new work. Record dependency/source/license changes in THIRD_PARTY_NOTICES.md when code is actually adopted. Current ElevenLabs GitHub documentation was readable; its documentation homepage returned HTTP 403 during this check, so source-level compatibility remains to be reviewed.

## UI and runtime design

Use DESIGN.md: white content, quiet navigation, existing blue action accent, Thai text and no decorative eyebrows. The shell has project navigation, chat and a resizable preview. Preview switches explicitly between storyboard, cartoon playback and exported files; opening project settings preserves the existing player/focus behavior. Tool cards show actual states such as preparing scenes/rendering/failed/cancelled. Show percentages only from measured render progress. Do not display hidden model reasoning as required product content.

The Electron main process supervises a bundled Next standalone server and a separate trusted media/agent worker. Include `public` and `.next/static` explicitly because standalone output does not copy them automatically. Native UI operations use preload IPC; leave the existing public health/catalog routes read-only. A random launch capability authenticates the main-to-worker channel. UI-origin/readiness checks ensure a failed spawn never opens an unrelated localhost service.

Retain browser persistence in a dedicated persistent Electron partition for this sprint. Use one fixed loopback origin, proposed `127.0.0.1:18147`, with a single-instance lock; if occupied, show a retryable startup error rather than silently changing origins or attaching to another process. This keeps existing origin-scoped browser state stable across launches. Store native workspaces, memory and renders under an application-owned userData path, not the installation or source checkout. Existing browser data stays untouched; importing it is a separate explicit action, not an assumed migration.

Renderer code receives project IDs and bounded operations, never arbitrary shell commands, worker entrypoints or writable filesystem roots. Native Save dialogs choose export destinations. Main/worker derives the local owner/project scope and allowed tools; reject traversal and symlink escapes. The Next `server-only` entry remains protected; the trusted desktop worker imports the underlying harness implementation through its own build entry.

Run the app window with nodeIntegration off, contextIsolation and sandbox on; validate IPC sender/frame and request schema. Preview HTML gets a separate sandboxed surface with no preload bridge or Node access, restricted resources and no application credentials. First-sprint edits are structured data rendered through an owned template. Rendering runs in a separate process with resource/call limits and sanitized environment; process separation is not a claim of a complete hostile-code sandbox.

The native project registry owns project-to-directory mappings and immutable artifact versions. Browser UI state, native files and SQLite memory have different owners in this sprint; edits need revisions and explicit failure handling. Do not promise atomic transactions across all three. An interrupted render is recorded as interrupted/failed on restart and is not automatically replayed. Quitting with an active job prompts for cancellation or waiting; the UI must not report completion merely because a process exited.

## First-sprint scope

Required: native app launch; own white shell; one existing-style cartoon template (target 8 seconds, 1080×1920, 30 fps); editable dialogue/style fields; isolated preview; real render and Save As; progress/cancel/error; project reopening; one live-model scene edit and one cross-session memory recall if provider access is available. Use bundled sample audio with an explicit label until real TTS is connected.

Excluded: cloud sync, accounts, billing/credits, marketplace, automatic updater, Windows/Linux release, general terminal/Python, plugins, teams of agents and unrestricted generated-code execution. External dependencies are utilities; original product work is the cartoon workflow and integration.

## Time and release gates

Reserve the first four hours for a packaged app and bundled-runtime render spike. A dev window alone does not pass. Then implement UI → export → live agent/memory, leaving the final half-day for packaged testing and recording. These are timeboxes, not delivery guarantees. Cut optional waveform/TTS/multiple templates before cutting actual render validation or disguising a mock as live AI.

Before enabling live inference, verify the hackathon's required provider/model and usable credentials. Keep a session-only credential in trusted runtime memory initially; never ship `.env.local`, put a key in chat/storage or make paid calls as part of automated verification. Use allowlisted models, validated local identity/scope, request IDs, existing call/token caps and explicit user-triggered inference. Read-only browser APIs do not become paid public proxies.

Test first on macOS arm64 without depending on system Node/npm/FFmpeg/Chrome. Audit bundled binaries/dylibs, codecs, checksums and applicable notices, including the renderer's libx264 dependency. A packaged demo and a signed/notarized public release are separate deliverables. Developer signing access and event distribution requirements are unresolved; do not claim drag-and-open distribution to other Macs until tested.

## Sources checked 2026-11-03

- Local package.json, components.json, `shadcn info --json`, renderer and harness source: current implementation facts above.
- https://www.electronjs.org/docs/latest/tutorial/tutorial-prerequisites — Electron embeds Chromium/Node and provides the desktop carrier.
- https://www.electronjs.org/docs/latest/tutorial/security — isolation, sandbox, navigation and IPC validation requirements.
- https://www.electronjs.org/docs/latest/api/utility-process — optional future supervised-process alternative; not assumed compatible with the current CLI.
- https://nextjs.org/docs/app/api-reference/config/next-config-js/output — standalone tracing and explicit public/static staging.
- https://www.electron.build/v26/ — stable-line packaging, signing and platform targets; the root documentation currently points to unreleased v27.
- https://ui.shadcn.com/docs/components/base/sidebar and https://ui.shadcn.com/docs/components/base/resizable — compatible primitive candidates, not installed by this plan.
- https://ui.shadcn.com/docs/ai-elements and https://elements.ai-sdk.dev/ — current patterns and migration notice.
- https://github.com/elevenlabs/ui/blob/main/README.md — audio component source and prerequisites; source compatibility is not yet verified.
- `npm view electron version engines --json`, `npm view electron-builder dist-tags --json` — proposed version pins, not runtime test evidence.
