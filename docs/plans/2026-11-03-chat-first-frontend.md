# Chat-first frontend V1

Status: user authorized implementation on 2026-11-03. This supersedes the project-first desktop UI and the UI priorities in the earlier hackathon plan. AI harness/provider implementation stays paused.

## Accepted direction

- Familiar DeepSeek/ChatGPT layout, me studio branding, white content and a light translucent macOS sidebar. Typography is quiet and regular-weight; avoid thick controls and decorative labels.
- Open on Home, with the brand and Prompt Kit composer centered. The primary action is แชตใหม่. Navigation is chat history/search/settings, not Projects/Workspaces or developer tools.
- First message becomes a conversation, with the composer at the bottom. AI is responsible for all creative work; no manual dialogue/color/scene form.
- Show labelled sample responses/artifacts in this frontend prototype. An artifact click opens the right preview, which can resize/fullscreen/close. Completing a sample reply must never open it automatically.
- Provider configuration and chat model selection are separate. Settings lists OpenRouter, OpenAI, Meta and custom providers. This frontend saves only non-secret display/config preferences; API-key fields clearly remain unconnected and do not store/transmit keys.
- Backend language/framework stays undecided. Frontend does not call the existing Meta IPC, renderer or any paid API.

## Components and source

- Prompt Kit `prompt-input.tsx` and `file-upload.tsx`, copied from upstream commit `5a9496635cc0e1bf7679fe2a9e35d9b36b99c08a` with its MIT LICENCE.md. Preserve public component APIs. Adapt Tooltip asChild to Base UI render, protect IME Enter and disabled drops, and document modifications.
- Existing shadcn Base UI Button/Dialog/Select; add official Base UI Textarea, Tooltip, DropdownMenu and Switch. No additional agent UI/runtime library.
- ElevenLabs UI stays a possible source for future audio widgets; this slice has no voice-service integration or inert microphone button.
- https://github.com/ibelick/prompt-kit/tree/5a9496635cc0e1bf7679fe2a9e35d9b36b99c08a/components/prompt-kit
- https://www.prompt-kit.com/docs/prompt-input and https://www.prompt-kit.com/docs/file-upload returned HTTP 403 to the research fetch; their official GitHub source was inspected instead.
- https://ui.shadcn.com/docs/components/base/tooltip and https://www.electronjs.org/docs/latest/api/browser-window#winsetvibrancytype-options-macos

## Work

- [x] Add original Prompt Kit components with the small compatibility/accessibility changes above.
- [x] Add frontend-only chat/draft/history/preferences state under a new storage key; preserve all previous project data.
- [x] Replace the rejected screen with Home/conversation/sidebar/artifact viewer and light native window chrome.
- [x] Compose category-based Settings and reusable provider/model menus. Do not pretend credentials or provider access are verified.
- [x] Run existing checks and focused chat UI tests for Home, IME/drafts, history, attachments, settings and explicit preview opening. Inspect native Home and browser conversation/preview/Settings screenshots, including mobile/tablet.
- [x] Rebuild/open the app, report actual evidence and remaining prototype limitations.

The initial UI check must fail against the old project-first screen. Existing runtime code and native project data are preserved but not exposed through the new prototype.

## Evidence, 2026-11-03

- Initial RED: Home-heading check failed against the old scene form (`/tmp/me-studio-chat-red.log`).
- `npm test`: 47/47 pass (`/tmp/me-studio-chat-final-tests.log`). `npm run lint`: clean, no errors/warnings (`/tmp/me-studio-chat-final-lint.log`). `npm run desktop:stage`: Next build and runtime staging pass (`/tmp/me-studio-chat-final-stage.log`).
- UI: all 14 cases pass across the final suite and focused rerun. The last additional storage test initially matched Next's route-announcer alert as well as the application alert; its locator was narrowed to the actual failure message and the focused rerun passed. Other 13 cases passed in the final suite (`/tmp/me-studio-chat-final-ui.log`, `/tmp/me-studio-chat-storage-ui.log`). Tests include the 8 legacy rename/settings cases, 6 new chat cases; no paid calls.
- Native arm64 packaging completed and the app was reopened at `release/mac-arm64/me studio.app` (`/tmp/me-studio-chat-final-package.log`). Repeat staging initially hit existing Chromium framework symlinks; the generated browser directory is now replaced before copying with verbatim symlinks, and restaging passed. This does not delete user project directories.
- Inspected screenshots in `.studio/frontend-review`: `home.png` (native Mac window), `conversation-preview.png` (browser, real bundled 1080×1920/8s video loaded with readyState 4), `settings.png`, `mobile-home.png` (390px), `tablet-settings.png` (768px). Viewport override reset after review. Native text automation was inconsistent; conversation/settings interaction evidence is from the same packaged frontend served in the browser plus isolated Playwright tests, not a claim of a complete native interaction test.
- No new DeepSeek source or ElevenLabs components were added. Prompt Kit MIT notice and source pin retained. No native project migration, live AI, API key storage, asset upload, new render/export, signing/notarization, or cross-tab transaction guarantee. The user has not yet accepted the visual design.
