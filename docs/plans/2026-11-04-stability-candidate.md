# Stability candidate after actual user failures

Scope approved by user: fix motion export, production exhaustion and saved-artifact reopening, then deliver a tested new Mac build. Preserve existing data and fixed permissions/budgets. This is local desktop stability, not a SaaS launch or a guarantee about arbitrary creative briefs.

## Implementation order

1. Keep the reproduced CSS capture fix and encoded finite/infinite-animation regression.
2. Return real draft/MP4 inspection images directly from save/render tools. Reduce redundant model round trips; do not equate media metadata with creative quality.
3. Use a creative host-tools-only SDK profile: no throwaway filesystem or to-do tools consuming production turns. Preserve Deep Agents orchestration, memory grants and the existing general/offline SDK profile. Give the model explicit remaining-budget information; do not raise paid-call limits or auto-retry provider calls.
4. Add a durable, session-scoped generated-file catalog. Store only host-published files, validate allowed source/output roots and symlinks on every access, and support opening existing PNG/MP4 by opaque generated ID after restart, including output outside source.
5. Run offline regression/security checks, Python graph/subprocess checks, unit/lint/build and media regressions. Fix failures before packaging.
6. Build a separately identifiable candidate, preserve the current package as rollback, exclude credentials, test bundled Python/worker and paid cheap Meta user prompts without tool names. Cover PNG → edit → MP4, a narrative clip and a longer multi-scene clip. Record first-attempt failures honestly.
7. Reopen the new package without losing drafts/history. Verify native generated media opening/playback/seek/Stop and error recovery. Hand off only the scope actually verified, with unresolved limits stated.

## Evidence and stop conditions

Paid tests use only the authorized Meta Contributor key and synthetic briefs/assets. No expensive model fallback, silent substitute for requested speech, deletion of user files or broadened execution grants. Failed captures/renders retain previous versions. A first-attempt failure is not relabelled a pass after manual rescue.

Current implementation/verification results will be appended below.

## Self-repair boundary clarified with user

The creative agent may inspect and revise its Project artwork and render a new version within the existing three-render/request budget. It cannot edit app credentials/config.env, provider endpoints, path grants, budgets, host runtime or executable code. Provider/configuration failures must be reported rather than bypassed by changing settings. A user-requested preference change requires a narrow validated host setting operation; creative reference/skill preferences do not confer execution rights. Preserve earlier artwork versions and never describe an unverified render as repaired.


## Candidate verification (2026-11-04)

- Renderer regression failed before fix and passed afterward: encoded finite and infinite CSS animations preserve early/middle/final timing. Existing user GitLab 42s HTML re-rendered locally to a new output; full decode and six sampled frames now show the authored scene sequence. No original files were overwritten and no user media was sent to Meta.
- Offline baseline: 88 Node tests, 22 Python tests, lint/build, legacy demo, Python production demo, API tests and 10 relevant UI tests passed. Fresh focused tests after review cover allowed GIF/AVIF/CSV/YAML/YML publishing and denied config/runtime writes. Independent review reproduced one P2 allowlist regression; fix independently verified (2 focused tests, no skips).
- Bundled candidate runtime real Meta Contributor, synthetic inputs: 18s narrative completed in 187.4s (7 model / 6 tools); six-scene 42s completed in 261.8s (6 model / 5 tools). Both H.264/AAC, 24fps, exact duration, full decode. Twelve frame samples per video inspected across all beats; they show scene changes and motion. Audio track is silence by request; not tested as voiced production.
- Restarted worker natural-language retrieval: existing PNG (10.8s, 3 model / 2 tools) and existing MP4 (12.1s, 3 model / 2 tools) opened by catalog without render/capture/write calls.
- First coffee journey is a recorded failure, not a pass: initial PNG capture returned TOOL_ERROR, later captures succeeded, then provider returned MODEL_UNAVAILABLE after 7 calls. Files remained. A separate fresh coffee acceptance journey is in progress. Provider availability and creative quality remain limits; successful media exports alone do not establish general reliability.
- Evidence is local under .studio/stability-live-20261104/ (synthetic test outputs/transcripts only), plus .studio/stability-*.log. Staged candidate uses frozen Python and bundled Node/browser/media tools. Native package/playback verification still pending at this entry.

- Fresh coffee acceptance: PNG59 completed (4 model/3 tools), PNG69 edit completed (7/6), MP4 6s completed (6/5), PNG reopen after restart completed (3/2), MP4 reopen completed (3/2). Prior outputs retained. The price edit changed two visible price values and removed HTML comments; DOM/CSS otherwise unchanged after comment normalization. Actual MP4 fully decodes, 144 frames at 720x1280; six sampled frames show entrance motion then readable ending.
- Final Node regression rerun: 88/88 passed, no skips. Final lint/build passed. The first attempted resource restage exited with SIGKILL during the bundled Node version check; the package was not released from that failed staging. A sequential restage and packaged checks are required before handoff.

- Sequential resource restage completed, then 0.2.2 packaged separately at release/stability-0.2.2/mac-arm64/me studio.app. Runtime metadata identifies source commit 3785f9d493824d455390ecf96e0e1fae32b6eae6. Packaged worker and frozen Python SHA256 match the live-tested staging bytes. No .env*/config.env files found in runtime resources. Packaged offline SDK/render smoke passed using only bundled tools with PATH=/usr/bin:/bin.
- Native process verified from the new 0.2.2 path, PID22804 at inspection. Existing Projects/history hydrated without migration; empty composer had no pending draft. Created isolated Project ตรวจรุ่น 0.2.2 through the native picker; automatic folder-derived name/default output path observed before entering the explicit test name. Opened actual PNG69 visually; played actual 6s MP4 to the end, then range control decremented to 0:03/0:02. Further long-video playback and native Stop/error/reopen checks are recorded separately rather than inferred from this result. Prior app remains at release/mac-arm64/me studio.app for rollback.

- Remaining native verification limit: after successful PNG and 6s playback/seek, selecting the fixed 42s file exposed a buffering state in AX while subsequent screenshots/selection actions showed inconsistent older state. Do not mark that long-file native playback as passed or assign a root cause from these observations alone. Likewise native Stop/error/reopen in this specific package was not reverified; related isolated UI regressions passed. This is a tested candidate with the above measured boundaries, not a blanket stable-MVP declaration.
