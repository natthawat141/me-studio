# Desktop navigation and file drawer

User supplied the Codex/ChatGPT-style top navigation and right file drawer reference. Keep me studio light theme; implement familiar structure using existing thin Lucide controls. This does not authorize Project/directory persistence, terminal, general browser or AI execution.

Layout: one 48px window-wide navigation row with native traffic-light clearance, left sidebar/new-chat controls, current conversation title, selected output tab and right panel toggle. Below: collapsible chat history (compact icon rail on desktop when collapsed), chat, optional preview. Inside Files: one breadcrumb/toolbar row; a separate folder button hides/shows the far-right file tree while keeping the media player mounted. Narrow panels switch between tree and media.

Palette: white #fff main, #f5f5f6 navigation, #eceef0 lines, #373a40 ink, #858991 secondary, #e9ebee selection. Existing fonts, 400 weight, 1.25–1.5px line icons. No extra decorative labels, inactive navigation actions or new UI dependencies.

- [x] Compose shared navigation and compact sidebar; remove duplicate window strips.
- [x] Simplify Files toolbar and add independent tree visibility toggle preserving playback.
- [x] Verify layout, keyboard/focus, sidebar and file drawer toggles, draft/media preservation and narrow screens.
- [x] Update canonical docs; rebuild/reopen native app and inspect actual screenshot.

Verification: 51 unit tests, all 21 UI tests, lint, production build and git diff --check passed. New UI coverage verifies shared navigation/compact rail and preserved draft; file-tree hide/show retains the same video element and seek position. No new dependencies/native access were added. Packaged Apple Silicon app rebuilt/reopened and app.asar/runtime roots checked to exclude env files.

Visual evidence: inspected and saved 390px browser Home/navigation at `.studio/frontend-review/navigation-mobile.png`; reset temporary viewport and closed the test tab/server. Inspected native navigation, compact rail, real directory/tree, selected-file tab and preview toolbar. The user started selecting their own folder/video and switching views during final inspection; stopped sending UI actions and saved the latest view to `.studio/frontend-review/navigation-desktop.png`. Independent tree-hide/playback retention is covered in automated UI tests, not claimed as a completed manual native toggle test. No Project persistence, AI/browser/terminal or renderer behavior was changed.
