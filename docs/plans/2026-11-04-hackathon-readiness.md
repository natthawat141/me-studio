# Hackathon readiness plan

**Goal:** deliver an honest, English-first Mac demo of conversational local motion graphics, evaluated against the existing GitLab brief.

**Architecture:** Preserve the Python Deep Agents runtime, scoped Node tools, user projects and existing video files. Localize desktop UI without translating user content; validate actual output through the packaged Mac app and bounded provider calls.

1. Record baseline behavior and constraints using the existing GitLab conversation and a separate test run; compare the same brief and distinguish measured outcomes from subjective quality.
2. Address failures evidenced by the run; retain prior creative versions and avoid granting agent access to app configuration or arbitrary execution.
3. Add persistent English/Thai selection, defaulting new installations to English, to the user-facing desktop flow and settings; preserve existing saved chats. Test both languages and switching.
4. Update README/setup and demo instructions to describe verified behavior, setup, provider costs, audio limits and supported platforms accurately.
5. Run relevant automated checks, package separately, and test a real still, motion MP4 and playback in the native UI. Report unverified claims and remaining gaps.
6. After the candidate is verified, remove superseded generated builds only, retaining the working candidate and a rollback. Never delete user media, chats or source.

## Verification snapshot

- One isolated live Meta Muse Spark 1.3 Contributor run produced a 20-second 1280×720 MP4. Sampling five frames showed different scenes, and FFmpeg decoded the complete file. It used a shortened, silent GitLab brief, so it is not an equal comparison against the original full brief or a verified Codex-produced video.
- The packaged runtime smoke test produced and probed a video. Unit tests: 89 passed. UI tests: 52 passed, including language persistence and the existing Thai interface. Lint and production build passed.
- The interface's principal desktop controls and activity labels support English and Thai. Some error/status paths and legacy pages remain Thai; generated model replies follow the prompt and model. This is not a complete translation audit.
- The candidate app was opened on macOS after closing the previous instance. The existing 42-second GitLab clip entered fullscreen, played to 0:42, and exited fullscreen; Settings also switched English → Thai → English. This fullscreen check used one existing clip. Packaging is unsigned.
- Old generated builds were identified but deletion was rejected by the automatic command review. The running build, candidate, rollback, user chats and original media remain intact.
- A further GUI run on the candidate used Muse Spark 1.3 Contributor to create a separate 8-second silent GitLab motion graphic. The app displayed progress, generated HTML previews, rendered an MP4 and opened it in the file panel. ffprobe found 1280×720 H.264 and 8 seconds; sampled frames showed visible changes. The assistant replied in Thai despite an English prompt and English interface. The chat also displayed duplicate file previews for the generated video, and these remain UX issues.
