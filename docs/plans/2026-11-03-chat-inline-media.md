# Local files and inline chat media

## Delivered
- Removed the prototype sentence beneath the composer. Kept example-reply labels.
- Native generated-video messages resolve a fresh media capability and show an inline player plus clickable MP4/poster/storyboard/HTML/JSON files. The existing artifact registry makes this available to earlier generated-video messages too.
- Native attachments store actual bytes in app-owned local storage and persist project-scoped file IDs. Images/video/audio embed in the chat; clicking an image or file opens the existing Files preview, including outside a Project. Text/HTML stays escaped text.
- Removed download CTAs from the side video preview; native media controls remain. No AI file-analysis or imported-video editing is implied. Attaching files makes no model call.
- Fixed native update staleness: old Next `server/route-cache` survived a merge-copy of staged output. Desktop staging now clears only generated `.next` before copying the new build. The installed update used a clean runtime-app replacement and rebuilt main/preload/worker archive, retaining the old UI and native archive under `.studio/frontend-review`.

## Verification
- `npm test`: 56 passed, including scoped persistent file IDs, byte-range streaming, restart, invalid IDs, oversized imports, path traversal and symlink replacement checks.
- `npm run lint`, `npm run build`, `git diff --check`: passed.
- Related browser UI tests: 12 passed (chat shell, inline native-video mock, attachment bytes and reload/image/text preview, Files). Screenshot inspected at `.studio/frontend-review/chat-inline-media.png`.
- Updated and opened `release/mac-arm64/me studio.app`; observed the prototype footer absent, the earlier generated animation in an inline native player with enabled controls, five generated-file links, and opened scene.html from its chat link in the native right-side Files preview. No paid provider calls were used for this change.
- Earlier name-only attachments do not contain recoverable bytes; attach them again to use the new local-media flow. Full native attachment picker/drop and continuous playback are not yet independently verified; the browser flow and native protocol/service were tested separately.

## Storage
User projects, conversations and original media were preserved. Removed only reproducible `.next/cache` when disk space ran low. Native attachment copies live under application userData `chat-attachments`; the registry is `chat-files.json`. Do not print or commit userData contents.
