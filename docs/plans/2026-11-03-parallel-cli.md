# Parallel local CLI slice

User request: build setup CLI in parallel with the main media/chat UI work. Keep this side conversation's edits confined to new `cli/` files and this evidence note; do not rebuild, restart, package or change main-thread code or user settings.

Implemented scope: doctor, providers list, locally configured models list, safe config projection, explicit env-file metadata writes for chat model/default, mode and speech voice. Reuses the actual application catalog validator and rendering-tool doctor. No new dependencies, provider calls, root npm-script changes or native userData mutations.

Acceptance: machine-readable results and exit codes; no credential values in stdout/stderr; preserve unrelated env content; reject corrupt config/unsafe paths/concurrent CLI writes. Native model switching, project registration and secure key storage are not claimed: they require a coordinated app-owned config interface, because native production currently uses a fixed model and memory-only keys.

Verification commands and integration limits are recorded in `cli/README.md`. Full application build/UI/native verification is intentionally excluded from this independent tooling slice to avoid disrupting the main thread's build and running app.

Observed verification: `node --test cli/runner.test.mjs` passed 8 tests; `npx eslint cli/*.mjs` passed; the actual `--help` entrypoint worked; `doctor --json` returned exit 0 with Node.js, FFmpeg, ffprobe and Playwright Chromium available. No real env file was loaded or changed, and no upstream API calls were made. Only the new CLI folder and this note were added.
