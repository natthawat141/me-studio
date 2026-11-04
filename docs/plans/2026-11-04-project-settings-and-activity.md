# Project settings and visible agent activity implementation plan

> For implementers: execute task by task after implementation is requested. This turn authorizes a plan only. Read application/desktop/server/component instructions before editing the corresponding owners.

Goal: show actual agent activity in chat/sidebar and provide a compact Project editor with folder-derived names and editable source/output directories.
Architecture: trusted Node production tools emit small structured activity events using current request/session identity. React derives running/unread state without treating model prose as progress. Electron retains native directory selection and Project registry ownership; Project/chat identity survives name/path changes.
Tech stack: existing React/TypeScript, Base UI Dialog/DropdownMenu/Tooltip, Lucide, Electron IPC, Python Deep Agents, Node production tools. No new UI dependency.

## Observed baseline and boundaries

- Baseline: 9f42eeb on feat/local-render-runtime; no uncommitted app changes when planning started.
- tool_start/tool_end, render progress, requestId/sessionId filtering and Stop already exist. Current UI maps most tools to generic “กำลังทำงาน”; neither Project-relative file names nor activity history reach it.
- Native ProjectFolders already supports create/relink/setOutput with persisted identity, canonical paths and duplicate-folder checks. The current dialog exposes directory changes but lacks a cohesive name/path editor and a native rename operation.
- Source/output changes currently persist immediately through native pickers. The proposed editor needs a staged selection + atomic Save boundary to make Cancel truthful.
- Critical continuity detail: drafts, raster assets and skill preferences currently live under source/.me-studio/skills. Relinking source alone can make a continuing conversation lose its working draft/assets. Address this explicitly before claiming seamless directory changes.
- Preserve existing Project/chat IDs, SQLite, local drafts, file grants and original media. No moving or deleting user directories, no paid provider validation, and no active-app reload during the planning turn.
- Reuse the Codex screenshot's hierarchy and interaction patterns with me studio components: flat rows, folder icon/name field, quiet path details, neutral hairlines and footer Cancel/Save. One source folder and one output folder per Project in this version.

## Accepted product behavior

- Chat: “กำลังเขียน scene.html”, “กำลังตรวจภาพตัวอย่าง”, “กำลังเรนเดอร์วิดีโอ 24/72 เฟรม”, or “กำลังคิด”. Expand the activity row to see completed/failed operations. Do not show generated source file cards unless the user requests them.
- Activity describes actual tool execution. Writing begins when the host starts saving a file, not when model prose promises to create one. Pure model streaming may say “กำลังคิด/กำลังออกแบบ”; no invented filename or percentage. Distinguish draft/style preview from final MP4.
- Sidebar: one small neutral spinner at the trailing edge of the running chat. If its Project is collapsed, show that indicator on the Project row instead. A completed unread result gets a small dot, cleared when that chat is visible and the result arrives/is opened. Failed/cancelled work does not get a success dot.
- Spinner and ellipsis actions occupy stable separate space, never overlap a long chat title. Provide accessible status text and reduced-motion behavior. Switching chats does not stop or relocate the running work.
- Create: choose a directory, fill the project name from its folder name, and allow a custom name. Once the user edits the name, subsequent folder choices do not overwrite it. Empty/all-whitespace names resolve to the folder name at Save; enforce the existing 80-character display-name limit.
- Edit: Project menu → “แก้ไขโปรเจกต์”, then name, source folder and output folder. Each folder row shows its name, a subdued full path (wrapped/truncated with accessible full text) and a change button. Save applies one validated update; Cancel changes nothing.
- New Project names default to nameOrigin=folder. Explicit user edits make nameOrigin=custom. Old records conservatively migrate to custom; do not infer or rewrite a user's intent merely because name equals folderName.
- Source change updates the Files tree and next production request. Default output follows newSource/output; a custom output remains unchanged. Existing chats/artifacts remain accessible. Keep the previous Files selection if a relink fails.
- Directory updates are blocked by the host while that Project has an active run. The dialog explains “รอให้งานจบ หรือหยุดงานก่อนเปลี่ยนโฟลเดอร์”; it never cancels work implicitly. Another Project may still be edited.
- Default workspace remains app-managed for this slice; folder editing applies to directory Projects.

## Task 1: Define truthful activity events

Files: src/lib/workspace-files.ts; src/server/agent/runtime.mts; src/server/video/native-production.mts; src/server/video/production.mts; desktop/preload.cjs if filtering needs adjustment.
Tests: create tests/production-activity.test.mts; extend tests/python-agent.test.mts and tests/worker-cancellation.test.mts where relevant.

1. Add a regression for a real host save operation emitting start/end, a failed save emitting failure, and zero renderer events containing HTML, text contents, image bytes, keys or absolute paths. Run it and observe failure first.
2. Add a shared validated activity DTO. Minimal payload:

```ts
type ProductionActivity = {
  kind: 'production'; type: 'activity';
  requestId: string; sessionId: string;
  operationId: string;
  action: 'read' | 'write' | 'inspect' | 'render';
  status: 'started' | 'completed' | 'failed';
  relativePath?: string;
  completed?: number; total?: number;
};
```

3. Emit safe metadata from the host tool boundary. Use an allowlist per tool; do not forward generic tool arguments. write_project_file uses its validated relative path; save_html_animation reports scene.html as an internal working file; render progress uses actual frame counters. Model text and SDK scratch operations are not evidence of Project disk writes.
4. Keep request/session filtering and Stop behavior; bound field lengths/activity count and ignore stale/duplicate operation updates.
5. Verify `node --import tsx --test tests/production-activity.test.mts tests/python-agent.test.mts tests/worker-cancellation.test.mts`, then commit this contract slice.

## Task 2: Activity row and sidebar running/unread states

Files: src/hooks/use-chat-prototype.ts; create src/lib/production-activity.ts and src/components/chat/chat-activity.tsx; modify src/components/chat/chat-transcript.tsx, src/components/chat/chat-sidebar.tsx, src/components/studio/desktop-screen.tsx and the existing owning studio CSS (resolve its import in desktop-screen.tsx).
Tests: create tests/production-activity-state.test.mts; extend tests/ui/production-stream.spec.ts and tests/ui/sidebar-flow.spec.ts.

1. Write state tests covering start/completion/failure, Stop, two successive requests, out-of-order events, deleted chat, switching chats and collapsed Projects. State derives from request identity, never an artificial timer. Observe the missing behavior first.
2. Add a bounded activity reducer/list keyed by operationId. Keep active work transient; persist only unread-result state using the existing storage schema with a backward-compatible default.
3. Render an expandable light activity row and trailing 12–14px indicator. Keep one status announcement, avoid announcing every token/frame, and respect reduced motion.
4. Add UI scenarios: switch away while running; spinner stays with the correct chat; collapsed Project aggregates it; success while away shows a dot; open clears it; Stop clears spinner; late events cannot restore it; title/actions do not overlap at narrow widths.
5. Run focused unit/UI checks against a production build, inspect light/dark screenshots, then commit.

## Task 3: Project naming and atomic edit contract

Files: desktop/project-folders.mjs; desktop/main.mjs; desktop/preload.cjs; src/lib/workspace-files.ts; src/services/workspace-files.ts.
Tests: tests/project-folders.test.mts; add an IPC/registry regression for active-run path updates.

1. Add failing tests for folder-derived name, custom-name preservation, old registry compatibility, name-only update preserving IDs, duplicate directory rejection, Cancel/no-op and failed atomic save preserving old state.
2. Add nameOrigin: folder|custom and outputOrigin: source-default|custom. Legacy nameOrigin defaults custom. Infer outputOrigin from whether a legacy explicit outputPath exists. Keep corrupt registries untouched.
3. Add native staged folder-selection tokens: beginProjectEdit → opaque edit token; pick source/output → candidate token; saveProjectEdit validates ownership, canonical directories, duplicate binding and current registry revision before one queued atomic write. Tokens have bounded lifetime/count, are invalidated on close/save/restart, and never accept renderer-supplied absolute paths. Existing create flow can reuse this selection mechanism.
4. Main/worker must check active Project identity when applying directory edits. Production holds a host-side Project binding lease through completion/cancellation; update and run-start cannot race into different roots. The old run's captured roots remain immutable. Do not depend only on disabled frontend buttons.
5. Run registry/IPC tests and commit. Existing legacy relink/setOutput methods remain wrappers over the validated update path where still used.

## Task 4: Preserve working state across source changes

Files: src/server/video/native-production.mts; src/server/video/production.mts; src/server/video/project-workspace.mts; add a small state-location/migration module under src/server/video if needed.
Tests: create tests/project-state-relink.test.mts.

1. Reproduce the current loss of draft/assets when source changes using temporary folders and a stable Project/session ID; never use real user folders.
2. Store native conversation working drafts, normalized asset registry and skill enable preferences under host-owned userData/project-state/<projectId>/<sessionId>. Pass an explicit stateRoot into production tools. Source/output remain the user-selected creative-file/render locations. CLI can retain its current fallback layout.
3. Lazy migration reads only known bounded app-state files from the old .me-studio location. Validate schemas, canonical containment, symlinks, asset hashes and sizes. Copy atomically; leave originals intact; never overwrite corrupt destination state. Custom SKILL.md references remain scoped to the selected source directory rather than being silently moved.
4. Check source A → source B with the same chat: current draft, chosen image IDs and version history remain available; new writes target B/current output; old artifact opening still uses its original registered output root. No arbitrary old-folder read permission carries over.
5. Run targeted state/asset/render tests and commit.

## Task 5: Compact create/edit Project dialog

Files: create src/components/chat/project-dialog.tsx and src/hooks/use-project-editor.ts; modify src/components/studio/desktop-screen.tsx, src/components/chat/chat-sidebar.tsx and existing owning CSS.
Tests: tests/ui/folder-projects.spec.ts; add tests/ui/project-editor.spec.ts.

1. Write UI tests for folder-first naming, keeping a typed name after folder changes, edit existing name/path, picker Cancel, dialog Cancel, Save failure, active-run block and repeated open/close. Include Thai IME Enter behavior.
2. Extract the existing inline Project dialogs from desktop-screen into one focused feature component; state/transport calls live in the hook/service. Use installed Dialog/Button/Input/Dropdown primitives.
3. Match the supplied Codex layout with a name field, source folder section, output section and Cancel/Save footer. Full paths remain readable on narrow screens; close buttons and action targets never overlap names. Keep thin neutral focus indicators in light/dark modes.
4. After success refresh Project metadata and the Files tree only when its source changed; preserve chat ID, draft text, scroll and open artifact. On failure keep the previous metadata/tree and form edits for retry.
5. Run focused UI checks, inspect screenshots at desktop and narrow panel widths, then commit.

## Task 6: Verification, docs and native delivery

1. Update PRODUCT.md, DESIGN.md, docs/architecture.md and docs/ai-guide.md with final behavior; add implementation evidence to this plan, keeping credentials out.
2. Run `npm test`, `npm run agent:python-test`, `npm run test:api`, `npm run lint`, `npm run build`, then `PLAYWRIGHT_CHANNEL=chrome npm run test:ui`. Do not run UI tests while Next rebuilds the same output.
3. Run relevant offline render/worker tests. Native main/preload changes require `npm run desktop:build`.
4. Before replacing the app, inspect active jobs/drafts and quit normally. Reopen the packaged app; verify real picker Cancel/selection, Project rename/source/output persistence, chat continuity, old artifact playback, status indicators and keyboard interaction. Do not issue paid API calls merely to validate UI/config refactoring.
5. Review the final diff, preserve existing credentials/data, use the previously authorized Git/release path, and remove only verified regenerated staging after the new build works.

## Release acceptance

- User can identify the current real operation and affected working file without opening a source editor.
- Sidebar makes running work discoverable across chats and shows completed unread results accurately.
- A chosen folder provides a usable default Project name; custom names remain intentional and persistent.
- Project editor supports atomic name/source/output changes, truthful Cancel and host-enforced busy behavior.
- Source relink preserves conversation/draft/assets and earlier artifacts, while new production uses the new binding.
- Existing history, drafts, source files, original media and secrets remain intact. No live-provider quality claim follows from an offline test pass.

Execution order: Tasks 1–2 deliver visibility first; Tasks 3–4 establish the data/path contract; Task 5 assembles the accepted dialog; Task 6 verifies the packaged product. No time guarantee is attached until state migration is exercised against synthetic old registries.
