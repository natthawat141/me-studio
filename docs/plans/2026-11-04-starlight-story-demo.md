# Starlight story — actual creative harness trial

Date: 2026-11-04. User requested an interesting story/video after the MVP audit.

## Creative brief and actual delivery

Original short story: a small robot catches a fallen star, hesitates to share it with a dying tree, then gives it away. The tree sprouts leaves and sends stars into the night sky. Ending: “แบ่งแสง โลกก็สว่าง”.

18 seconds, 9:16, 720×1280, silent HTML/CSS/SVG graphic animation. The agent authored the design from a natural Thai brief using real Meta `muse-spark-1.3-contributor`. The coding assistant did not hand-author its animation HTML.

Actual exported files, preserved under `.studio/story-demo-20261104/starlight-project/`:

- `starlight-final.mp4`: named copy of the real agent-produced MP4.
- `starlight-ending.png`: coding-assistant export of the last decoded MP4 frame. The agent inspected the ending but did not publish a separately named ending PNG itself.

Generated source versions and original render remain in that Project's `output/`. The app has a new synthetic directory Project named “หุ่นยนต์ที่เก็บแสงดาว — ทดลอง”, pointing to this folder; previous Projects and chats were preserved.

## Execution evidence and limits

- Source Node worker bundled separately in the ignored evidence directory; actual packaged frozen Python/browser/FFmpeg used. This was **not** a new installed desktop release, and did not patch the running application's resources.
- First request: `MODEL_CALL_LIMIT` after 10 model/tool calls. One HTML validation error, then two saved drafts, inspections and revisions; no initial MP4 delivery. 247.674 seconds.
- Explicit continuation of the latest saved draft: completed with a real MP4, 5 model calls / 4 tool calls, 181.950 seconds. No expensive model fallback or raised host budgets.
- Record this as **assisted completion**, not a first-attempt autonomous success or a stability pass.
- Evidence: `evidence.json`, `finish-evidence.json`, `live.log`, `finish.log`, `verification.json`, `story-contact-sheet.png` under `.studio/story-demo-20261104/`.

## Renderer correction

The earlier audit reproduced a deterministic defect: the encoder's Playwright screenshot disabled animations after host seeking, finishing finite animation and cancelling infinite motion.

Changed `scripts/local/render.mjs` to preserve the seeked frame with `animations: 'allow'`. The host's `window.seek` continues to pause/set the animation time; no new execution permissions or networking were added.

Added `tests/local-render-css.test.mts`, which encodes an actual MP4 and samples decoded RGB pixels at the start, midpoint and near end of finite and infinite opacity animations. It failed before the fix (`red: 254, blue: 0` at time zero) and passed afterward. It skips explicitly when local media tools are unavailable; **it did not skip on this Mac**.

Validation: unit tests 87/87 passed with zero skips; lint passed; production build passed. The build first caught a ProcessEnv typing issue in the new test; the test's isolated environment was corrected and the build rerun successfully. No claim of a rebuilt/reopened packaged candidate.

## Actual media review

ffprobe: H.264, 720×1280, 24 fps, 432 frames, exactly 18.0 seconds, AAC track with no requested narration. Complete FFmpeg decode passed with no reported errors. Inspected six actual encoded frames at 1, 4, 7, 10, 14 and 17.5 seconds and the ending PNG. The robot changes position, the fallen star changes location, the tree gains leaves and stars rise. The requested motion is present after the renderer fix.

Creative judgment: coherent simple graphic-story prototype, not polished cinema. The robot enters cropped at the opening, the middle could be faster, and the ending text overlaps the lower character/tree area. These are quality refinements; do not represent this as creative approval by the user.

## Native check follow-up

After the user foregrounded/unlocked the Mac, the existing packaged app's old three-second heart MP4 played to its end: the right player changed from Play to Pause, then returned to Play with elapsed time 0:03 and a visible decoded image. This resolves the earlier basic playback observation blocker for that existing artifact only.

The new Project folder picker, automatic folder-derived name, Project creation and Files refresh were observed in native UI; both newly exported files appeared. Opening the new story via the row did not give a verified transition, and a coordinate fallback timed out. Do not claim the new story's native playback, seek, or a complete native UI audit passed. Deliver the real file inline in Codex for immediate review.

Remaining MVP blockers: production-turn exhaustion and reliable generated-artifact discovery/reopening. The renderer correction is in source and this demonstration, not yet in the running installed 0.2.1 package.
