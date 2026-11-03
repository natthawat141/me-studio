# Native chat routing fix — 2026-11-03

## Report and reproduction

The user loaded an AI key but received the canned sample reply. Native send previously branched only on cached `videoConnected` React state. If that snapshot was false, it called the scripted `send()` without rechecking the worker, regardless of the actual native configuration. Initial status errors were also unhandled, and an older startup status could overwrite a newer connection. Key-load feedback appeared outside the modal instead of inside it.

The exact original key-load sequence was not reconstructed; no credential values were inspected. Automated reproduction changed worker configuration after the initial disconnected snapshot and confirmed the UI still returned the sample. Four regression tests failed on the old build for stale routing, disconnected/failed draft preservation and in-dialog key feedback.

## Fix

- `src/hooks/use-video-connection.ts` owns native connection state and refreshes trusted worker status before every agent-capable text send. Revision guards reject stale startup snapshots after connect/send.
- Browser/read-only preview bridges retain labelled sample mode. Native bridges with agent capability never fall back to samples because a key/status is missing or a request fails.
- Unconfigured/unavailable/busy/wrong-provider/missing-Project states keep the draft and explain the next step.
- Composer awaits asynchronous routing while retaining its synchronous submission guard and per-chat file/draft/focus behavior.
- Settings displays connection success/failure inside the provider view. Keys still stay in worker memory; loading does not verify account entitlement.

## Verification

- Old-build reproduction: **4 failed** with the expected canned reply/missing setup feedback.
- After fix, targeted routing/video UI checks: **6 passed**.
- `npm test`: **66 passed**; `npm run lint`, `npm run build`, `git diff --check`: passed.
- `PLAYWRIGHT_CHANNEL=chrome npm run test:ui`: **39 passed**, including IME/Enter, attachments, drafts, Project navigation, search, media, themes and the new regressions. The bridge fixtures remain offline and do not prove live inference.
- Native build: Next and frozen Python builds passed. First staging attempt hit a transient missing `.next/standalone` during another local build. Verified the completed static chunk contained the new routing message, then reran `node scripts/desktop/build.mjs` and electron-builder with the normal Mac arm64 config to a temporary output; both passed.
- After normal Quit with no active job/unsent draft, installed the new app at `release/mac-arm64/me studio.app`. Prior app preserved at `.studio/frontend-review/me-studio-before-chat-routing-20261103-211854.app`. No userData, existing chats, attachments or media were removed.
- Actual native test before key loading: submitting retained the draft and showed the load-key setup message, with no sample response/history row.
- Loaded the existing application `.env.local` through the native file picker without displaying credential values. In-dialog feedback changed to loaded and the fixed OpenAI provider was selected.
- Sent a short synthetic greeting request in a new chat inside the existing Animation harness demo Project, explicitly asking for no tools/files/video. The updated native app routed it to the packaged Python runtime and returned **พร้อมใช้งาน**. No new video or voice generation was requested. App remains open and configured for the user to try.

## Remaining limits

Current native inference uses the fixed OpenAI GPT-6 Luna path. Generation still requires a native directory Project. Attachments can be saved/viewed but are not analysed by the model. Browser/read-only previews remain scripted, so they are not a substitute for testing the Mac app. Restarting the app still clears in-memory credentials by design.
