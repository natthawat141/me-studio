# Desktop runtime stability release

User authorization: stabilize the full creative flow before handing over another build. Live testing may use the low-cost Meta Contributor model with the local META_API_KEY; never print or package credentials. Use synthetic creative briefs and assets for provider tests.

## Observed cause

Read-only run metadata from the installed app shows recent failures were CONTEXT_LIMIT after 2, 7 and 9 model calls. The latest run accumulated multiple HTML tool arguments, file reads and long conversation history. Native production replaces every failed run with VIDEO_RUN_FAILED, main maps that to FILE_READ_FAILED, and UI wrongly recommends checking the AI connection. Successful intermediate output is discarded from the response. These are separate runtime and recovery defects.

## Work and acceptance

1. Add regressions reproducing context growth across real SDK tool cycles. Compact only complete older turns/tool cycles for model input, preserving the current user request, most recent tool results, durable transcript and strict fixed-context budget. Do not raise budgets or introduce paid summarization.
2. Preserve classified failures through Python → Node → Electron → UI. Return successful intermediate artifacts with an explicit failed outcome; settle pending tool/activity states on failure/Stop and show an actionable reason. Never turn a failed render into success or silently retry a paid call.
3. Exercise the actual Meta Contributor adapter using synthetic inputs: discussion, HTML creation, inspection, revision, image capture and silent MP4; inspect outputs. Bound calls/tokens and record usage. Add deterministic regressions for discovered defects before fixes.
4. Run affected/full checks and package 0.2.1 only after live/source checks pass. Verify the packaged worker with Meta and actual native preview/Stop/error recovery. Preserve user conversations/drafts; do not replace an app with active work. Record failures and limits. Keep current app plus one rollback, remove only regenerated staging after verification.

## Delivery gate

No handoff based solely on build/mock tests. Required: repeatable live tool flow with actual files and verified media, deterministic failure/cancellation recovery, complete checks and packaged-native confirmation. Provider outages and unsupported creative capabilities must be reported honestly rather than hidden behind a connectivity message.

## Confirmed regressions and fixes

- Raw base64 host-tool image blocks were counted as text. A normal imported image reproduced CONTEXT_LIMIT after one import. Regression uses a 300 KB image payload and the actual SDK continuation.
- SDK dumps included response diagnostics and duplicate function-call arguments. Model-bound accounting now excludes those copies; deterministic multi-step tests preserve current/latest context and paired tool calls/results.
- Source HTML referring to registered assets failed capture/open with ENOENT because its dependencies existed only in the animation directory. The Project writer now copies verified registered asset bytes beside that HTML; differing files/symlinks are rejected.
- Native failures discarded already saved output; UI replaced the real cause with a connection warning. Failed/cancelled outcomes now carry saved output and safe classified causes through the native response. Worker timeouts/exits retain fixed codes through main IPC.
- Stop before the first text left no stopped message and discarded late saved files. It now settles the original request only, without opening a panel or changing a newer request. Independent review additionally found merged files could exceed the persisted 10-file contract; deduplication/capping and reload regression address that.

## Verification so far

- Node tests: 86/86 passed; Python: 21/21 passed; lint, Next build and API integration passed.
- UI: 51/51 passed before extending the Stop test to include 10 files plus a video artifact and reload. That extension reproduced unreadable history before the fix; post-fix result and package checks recorded below when complete.
- Real Meta Contributor source test: discussion → HTML → targeted revision → silent MP4 completed. Actual 640x480, 3-second heart/WELCOME output and poster inspected. Synthetic reference-image test then completed import → two HTML drafts with inspection → source preview.html → actual PNG capture → open_project_file. No user image/history was sent to Contributor; test inputs/assets were synthetic.
- Intermediate live tests intentionally remain in ignored local evidence: first exposed image CONTEXT_LIMIT, a 6-call test cap exposed MODEL_CALL_LIMIT (test aligned to existing native 10-call limit), and a later test exposed missing source HTML assets. These were not treated as passing releases.
- Independent read-only review requested fixes for timeout masking, Stop recovery and the persisted file limit, then approved the corrected implementation. No changes to provider endpoints, paid retries, production budgets or sandbox grants.

Local detailed logs and media are ignored beneath .studio/release-fixes and .studio/stability-live. They are not shipped or committed. No credentials enter evidence or packaged resources.

## Packaged 0.2.1 verification

Code revision 54269e153eb2deafb2a3d8854ebb3c08fcc1cf43 is recorded in the packaged runtime.json. The PyInstaller SDK check and packaged worker/render smoke passed without host PATH tools. Frozen Python + real Meta Contributor completed five successive requests in one session: import synthetic image/save/inspect → targeted text revision/inspect → write Project preview.html/capture PNG → render/inspect MP4 → open preview.html. A deliberately invalid synthetic key returned MODEL_AUTH_ERROR; the following valid-key request succeeded. Request-scoped cancellation returned CANCELLED and released busy state.

The actual MP4 fully decodes, is H.264 480x640, 72 frames/3.000 seconds, and carries a silent AAC track (max volume -91 dB), not generated speech. First/middle/last extracted frames were inspected; original synthetic WELCOME image and revised TEST TWO caption are present. The packaged resource scan found no environment files or credential-pattern text across 1,431 text files.

Post-review Stop/reload regression and streaming tests passed (4/4); full pre-extension UI run was 51/51. The latest full Node run was 86/86, Python 21/21, lint/build/API passed, and both offline Python/legacy Pi demos completed. UI test setup initially asserted the reopened transcript before selecting its saved chat; that assertion was corrected to select the saved chat and explicitly check for a persistence error.

The actual 0.2.1 application loaded existing chat history, used Contributor in a new synthetic Default workspace chat, created/inspected HTML and automatically opened its sandboxed preview. A following render request completed and delivered video.mp4 into both chat and the right player. The agent unnecessarily tried opening an absolute render path through the relative Project tool and was denied; the native artifact still opens automatically. This is a remaining wording/tool-choice issue, not a failed MP4 render. Native playback/seek and final reopen are being checked before handoff; do not equate the loaded player accessibility node with observed playback.

Prior app 0.2.0 is preserved in release/rollback-0.2.0; private data/config were not migrated. Meta was added from the already-authorized local key for the native test, preserving other provider entries/defaults. Only synthetic content was sent for these tests. Recorded source/frozen-worker test usage totals 613,468 input and 23,342 output tokens before the final native UI requests (uncached list-price estimate USD 0.066, not an invoice; cached input may cost less). Primary pricing checked 2026-11-04: https://dev.meta.ai/models/muse-spark.

Remaining boundaries: provider/network failures and creative quality remain provider-dependent; fixed budgets can still stop oversized work with a truthful reason and saved files. No crash replay, paid automatic retries, arbitrary code execution or broader filesystem grants were added. This unsigned arm64 build has not been tested on another Mac.

## Handoff status

The native UI control tool subsequently returned noWindowsAvailable and keyboard actions stopped changing focus. A text request to unlock/show me studio is pending. Native video playback/seek remains unverified; this candidate is not yet declared stable or ready for user acceptance. The packaged worker MP4 and native chat creation/render results above are verified separately. Do not claim a successful click or buffering accessibility node proves playback.
