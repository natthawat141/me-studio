# Stable chat navigation

User direction: keep navigation/sidebar/composer stationary while switching chats. Reveal only the new transcript with a brief fade. Selecting a chat must never collapse another Project. Group every conversation in a Project, including a built-in Default workspace for existing general chats.

## Implementation choices

- Keep the transcript viewport and composer mounted. Replace only the message column, with a 32 ms transparent lead-in and 160 ms opacity animation; no page translation, fabricated loading state, or animation library. Respect reduced motion.
- Fix the composer at the bottom for empty and populated chats. Keep the empty-state brand in the content stage. Restore in-session transcript scroll positions before paint and follow new messages/media only when the reader is near the end.
- Disclosure has functional state updates, independent of chat activation. Only a header click toggles a Project; explicit compose/search selection may reveal its destination without closing other groups.
- Default workspace is a UI group for the existing unassigned native scope. Do not fabricate a native Project ID, grant a directory, rewrite file refs, or move user files. Directory Projects retain their IDs/permissions. Keep unavailable Project groups visible too. A real directory Project remains required for production video creation.

Considered a whole-page transition, but it would move the navigation the user wants stationary. Artificially delaying local history fetching would add latency without useful feedback. The selected approach transitions only content already held locally.

## Verification

Regression test first failed because Default workspace was absent. Verify stable shell DOM/composer coordinates, Project disclosure across chat changes, grouping, rapid selection, scroll restoration, reduced motion, draft/attachment/media regressions, and actual native behavior. No AI/provider calls are needed.

Results on 2026-11-03:

- `npm test`: 66 passed. Lint, production build and `git diff --check` passed.
- Full isolated UI suite: 35 passed in one final run. New regressions assert stable sidebar/navigation/transcript DOM and exact composer coordinates across empty/populated chats; persistent disclosure, legacy Default grouping, last-click-wins selection, per-chat scroll restoration, reduced motion and unchanged right-player element/time across chat selection.
- Corrected a timing-only test assumption: persisted provider metadata is debounced, so the test now waits for its actual stored value before inspecting it. No production persistence delay was changed.
- Settled light/dark screenshots inspected under `.studio/frontend-review/sidebar-flow-light.png` and `sidebar-flow-dark.png`; screenshot capture disables finite animations, with an explicit dark-brand text-color assertion. The targeted screenshot test passed again.
- Replaced only the release's frontend runtime with build `wdVMXdU3PyFiRGah5rDib`, preserving native/backend/runtime credentials handling and user data. Prior UI backup: `.studio/frontend-review/ui-before-chat-navigation-1793714852217`.
- Opened the actual Mac app and observed Default workspace containing the existing general chats, native Project groups and the fixed bottom composer. Further native interaction was stopped when the automation surface reported that the user had changed the app; automated isolated tests supply the detailed transition/disclosure evidence above. No real chat submission or provider call was used.

The earlier dynamic “แชตทั้งหมด” sidebar row was removed; selecting a Project conversation no longer inserts a new row below the Project groups. No frame-rate benchmark was performed, so this records interaction/geometry correctness and visual review rather than a measured FPS claim.

## Preview controls follow-up

Removed the artifact's duplicate title/header/close button, moved expansion to a compact bottom-right footer, and retained only the global panel/file-tab closing controls. Files keeps its useful breadcrumb/tree tools, with expansion moved down and duplicate close controls removed. Corrected the global panel toggle to close an open artifact instead of switching it to Files. Build/lint and 11 focused chat-shell/Files UI tests passed, including expand/collapse retaining the same video element and global close/focus return. Frontend-only native update: build `a56HQiUL9VFZziE_s5QYE`; prior UI backed up under `.studio/frontend-review/ui-before-preview-controls-1793715450318`. The updated app reopened; no backend/user-data change or provider call was required.
