# Sidebar navigation and draft lifecycle

Approved direction: Project click expands/collapses only; separate write action starts a draft; empty folders show “ไม่มีแชต”; history appears on first send. Keep current chat/player unchanged while browsing folders, use compact stable rows and make full/rail transitions continuous.

Implementation: `chat-drafts.ts` separates/migrates unsent threads and atomically promotes them on first send; preserves native session/file IDs and all legacy drafts. Project write actions resume their draft, while explicit general New Chat creates a fresh draft. Other drafts remain recoverable through search. The hook debounces storage and flushes on pagehide. Sidebar disclosure and scroll preferences have backward-compatible defaults. The mounted full sidebar retains DOM/scroll state beside its rail; hidden surfaces are inert. Folder-only clicks no longer activate native roots. File activation occurs on actual chat/draft selection without blocking all Project buttons. Transcript scrolling targets only its own container.

Verification includes synthetic migration/promotion unit tests, existing chat/project/IME/media regressions, and sidebar regressions for empty folders, no activation during disclosure, unchanged player element/time, draft recovery across reload, stationary 34px hover rows and retained sidebar DOM/scroll. Run build, lint, unit and UI checks; native verification and visual evidence are recorded after execution. No provider calls are needed.

## Verified 2026-11-03

- Unit suite: 64 passed. Lint, production build and `git diff --check` passed.
- UI suite: 31/33 passed in the last full run; the two stale draft-navigation expectations were updated, then all six chat-shell cases passed on rerun. All three sidebar-flow cases also passed. This is aggregate coverage of all 33 cases, rather than a single final full-suite run.
- Native app: Project header collapse removed only its child rows; reopening restored them. Full sidebar/rail toggles worked in the actual app. Empty Project displayed “ไม่มีแชต” without adding a draft row.
- Light/dark visual evidence: `.studio/frontend-review/sidebar-flow-light.png` and `sidebar-flow-dark.png`.
- Bundled the existing Anuphan variable font locally under SIL OFL 1.1 to remove the external Google Fonts stylesheet dependency and network-dependent startup stalls. Attribution and license are included.
- Updated only the native release's frontend runtime from the verified build, retaining the previous UI under `.studio/frontend-review/ui-before-sidebar-1793713756953`. Native backend/worker and application data were preserved. No provider calls or real chat submissions were required.

Animation and interaction behavior were checked; no frame-rate benchmark was performed.
