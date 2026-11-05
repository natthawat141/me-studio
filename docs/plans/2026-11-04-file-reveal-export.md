# Local file reveal and copies

User request: reveal local files in Finder and save output in another folder, including Downloads through conversation. Preserve existing projects, chats, drafts and originals.

Implemented:
- Folder/Save icons beside chat files and in the preview header, using existing thin neutral controls and English/Thai labels.
- Owned-main-frame IPC resolves live scoped file IDs. No renderer-supplied OS paths. Replaced paths, directories, forged and expired IDs are rejected.
- Copy menu offers direct Downloads or a native folder picker starting in Downloads; cancellation changes nothing. Duplicate names receive a numeric suffix. Copies are bounded to 500 MiB and preserve source bytes.
- Host-granted Downloads tool resolves current-conversation generated IDs, preserves originals and uses numbered names on collision. Other locations use the native destination-folder picker. No arbitrary path tool.
- Saved copies remain discoverable without automatically adding another embedded player. HTML copies do not bundle relative assets.

Verification in progress: scoped Files tests, export byte/collision/path tests, cross-conversation agent export test; chat and preview UI actions, cancellation, failure, draft preservation, small viewports and existing media deduplication. Native Finder/folder-picker checks and packaged-app verification recorded below when complete.

## Verification evidence

- Focused Files/chat/export tests: 10 passed; UI regressions: 11 passed (scoped IDs, cancellation, errors, draft preservation, small viewports and media deduplication). ESLint and production build passed. Packaged Apple Silicon app rebuilt and launched from `release/mac-arm64/me studio.app`.
- Native Show in Finder was exercised from the chat video and selected the correct `video.mp4` in its render directory.
- The production copy helper copied the actual latest voiced 127-second movie to `/Users/macarthur/Downloads/GitLab-JiHu-final.mp4`. Source remained intact; source/copy SHA-256 both `361db45d14d83a089d0e1a71a18c8b35e01424a62d453d22dcd4903d17e9cf18`, size 3,792,123 bytes. This was a direct helper check, not proof of a completed native menu click or live model choice.
- Native destination dialogs appeared, but confirmation remained disabled during automation; subsequent computer-use actions returned stale UI or `noWindowsAvailable`. Therefore arbitrary-folder selection and the final packaged Downloads menu action are **not yet end-to-end verified**. Browser tests cover their bridge contracts, and direct Downloads avoids dependence on a native dialog.
- Retained one prior packaged app under `release/file-actions-previous` until the native copy flow receives final GUI validation. Existing conversations, drafts, originals and credentials were preserved. No paid inference calls were made for this change.
- Final full `npm test`: 99 passed, 0 failed/skipped (181.46s), including actual continuous 127-second rendering and uploaded soundtrack regression. `git diff --check` passed.

## Follow-up native GUI check

- Successfully opened the last chat video's Save a copy menu and clicked Save to Downloads in the packaged app. Finder selected `/Users/macarthur/Downloads/video (2).mp4` afterward. File size 3,792,123 bytes and SHA-256 `361db45d14d83a089d0e1a71a18c8b35e01424a62d453d22dcd4903d17e9cf18` match the original. This supersedes the earlier unverified status for the direct Downloads menu action; numeric collision handling also worked in the actual app.
- Choose another folder opened the native picker. Entered `/Users/macarthur/Downloads/me-studio-export-check` via its folder icon, but Save here remained disabled. Cancel returned to the chat. Arbitrary-folder export is still a failing acceptance case, not a passed feature. No source files or conversations were changed during this check.
