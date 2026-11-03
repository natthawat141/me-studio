# Local files and video side panel

User supplied Codex/DeepSeek file-tree + video-player screenshots and authorized adding that interaction. Keep the white me studio theme, regular text, neutral focus and thin monochrome icons. Home starts with the panel closed. Right header button opens Files; a native directory picker grants the folder; expandable read-only tree, name filter and refresh live beside an optional selected-file preview. MP4 uses a real video player with seek, sound and fullscreen controls. Image/audio/text previews remain read-only; HTML/Python are never executed. Existing sample artifacts still open on explicit clicks. Chat and drafts remain available on the left.

No Terminal, general web browser, AI execution, filesystem writes or credential integration. The developer env from the preceding task stays outside the distributable.

- [x] Add a narrow, owned-main-frame IPC bridge and token-based folder/file service, with root containment, symlink checks, bounded text reads and media streaming/range support.
- [x] Build Files panel/tree/filter and local file preview, compose it into the existing resizable right area without losing chat drafts.
- [x] Verify native file selection/playback plus unit/UI failure paths; inspect native desktop screenshots and exercise narrow/mobile layout in automated UI tests.
- [x] Update docs, rebuild/reopen the native app and report actual limits.

Verification: 51 unit tests passed; the full UI run passed 19 cases and exposed only an ambiguous alert locator in the new web-only case. Scoped that assertion to the Files region and reran all 3 new Files cases successfully (17 existing cases + 3 Files cases verified). Lint, production build, API integration and git diff whitespace checks passed. Packaged Apple Silicon app rebuilt/reopened; staged and packaged app roots/app.asar contain no env files.

Native evidence: selected `/Users/macarthur/aicatoon/archive/legacy-animation/output` with the real directory picker. Tree showed actual MP4/MP3 files. Opened and played `bew-mac-greeting-day-final.mp4` (8 seconds) with visible frames; native timeline decrement moved from 0:08 to 0:07 and updated the frame. Screenshots inspected for tree and playing video; tree snapshot saved under `.studio/frontend-review/files-tree.png`. User started inspecting the app during the final capture; stopped changing their view. Mobile split/tree switching and lack of overflow passed automated checks; no native mobile claim (Mac window minimum is 980px).

Limits: root grants are session-only, refresh is manual, and HTML/SVG/Python are escaped source rather than executable previews. No new AI/provider/browser/terminal workflow was enabled.
