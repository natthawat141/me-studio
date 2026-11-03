# Local-first hackathon implementation plan

> **For agentic workers:** Use the native workflow in this chat; implement and verify each complete slice before the next. No hosted services or paid provider calls are authorized by a setup/render check.

**Goal:** Run me studio locally and turn a reviewed HTML animation plus timed audio into a real, versioned MP4 before connecting AI and refining the studio experience.

**Architecture:** Retain the Next.js studio. A separate local Node process renders reviewed project manifests with an isolated browser context and FFmpeg, keeping files on disk. Future UI/provider adapters call a local job boundary; HTML never runs inside the application DOM.

**Tech Stack:** Existing Node 22+, TypeScript/Next.js, installed Playwright tooling, Chromium or an isolated Chrome process, system FFmpeg/ffprobe. No new SDK or hosted infrastructure in the first slice.

**Spec:** This document records the user's local-first direction and the existing PRODUCT.md/architecture.md boundaries. These milestones are proposals beyond the first executable slice, not delivered features.

## Global constraints

- Preserve the current studio and its browser data. No decorative eyebrow/kicker labels.
- Local renderer accepts only operator-reviewed HTML; it is not a secure arbitrary-code sandbox or an HTTP execution endpoint.
- Use window.seek(milliseconds), local allowlisted assets, bounded input size/duration/resolution, and no provider credentials in browser/encoder environments.
- Keep every render in a fresh ignored .studio/renders/<id> directory; preserve input snapshots and earlier outputs.
- No AI/provider availability claims, paid calls, cloud provisioning, login or billing in setup/render verification.
- Do not auto-install OS packages, silently migrate old projects, or overwrite existing work.

## Approaches and decision

Local web app plus a separate renderer is the selected starting direction, following the user's request to begin locally. Browser-only export would couple exports to the tab/device lifecycle; hosted workers would add deployment and account work before validating the workflow. Desktop packaging is a later distribution option. Start with a CLI execution boundary and prove its output before exposing it in the studio.

## Review focus

1. Asset paths containing traversal, symlinks, hidden files or external URLs must not expose files outside the explicit manifest.
2. Invalid media or a missing seek function must fail without publishing a partial MP4 as a success.
3. Encoder failure, browser failure and cancellation must release processes and record a terminal job status.
4. New renders must preserve previous outputs and snapshot their inputs.
5. A clean clone must report missing local dependencies with actionable setup instructions, without reading provider secrets.

## Milestone 1 — executable local runtime (current work)

Files: scripts/local/{project,tools,render}.mjs; scripts/local/{doctor,setup,cli,smoke}.mjs; tests/local-render.test.ts; examples/local-render/; package.json; .gitignore; docs/local-development.md.

- [x] Define and test project loading: version/title/HTML entry/dimensions/fps/duration, explicit assets, and timed audio. Reject traversal, symlink escapes, invalid limits and missing files.
- [x] Implement doctor/setup: check Node/browser/FFmpeg/ffprobe, report missing tools, install only the official Playwright Chromium on explicit setup command.
- [x] Implement a separate render process: fresh job/input snapshot, loopback allowlisted asset server, blocked external networking, seek-driven frames piped to FFmpeg, timed audio mixing and validated output.
- [x] Test real invalid input and asset serving; prove actual rendering/audio/duration with a short opt-in smoke run, including missing-seek failure and cancellation.
- [x] Bundle an existing first-party animation/audio example, mark provenance, document commands and update canonical status.
- [x] Run npm test, npm run lint, npm run build, doctor and real render smoke. Report limitations; do not claim prompt-to-video works.

Interfaces: loadProject(manifestPath) returns normalized project plus verified local files; checkTools() reports local readiness; renderProject(manifestPath, { outputRoot?, signal?, onProgress? }) resolves only after MP4 validation and returns job metadata/output path. CLI accepts --project and --output, not arbitrary shell commands.

## Milestone 2 — real AI planning and scene generation

Verify the competition's official rules and current Meta API documentation before selecting a model. Add local-session authorization, operator allowlists, explicit paid-call approval, budgets, timeout/cancellation and usage records before any paid web endpoint. Generate a structured storyboard first, then scene code against the renderer contract. Evaluate real tasks and failures rather than treating model metadata as task suitability. General agent-written Python/shell execution is a separate isolation decision.

## Milestone 3 — studio creation and revisions

Wire disk-backed jobs/artifacts through a local authenticated API. Show a playable example, editable storyboard, voice samples, actual job progress and real MP4 export. Preserve browser projects through an explicit migration/import flow. Keep input/version snapshots; revise a selected scene without discarding prior outputs. Capture and inspect the actual UI before and after changes.

## Milestone 4 — templates and repeat creation

Curate a small set of production recipes, character/voice/style persistence and episode duplication. Choose the first content niche from user testing. A third-party marketplace is outside this release.

## Milestone 5 — hackathon delivery

Verify a clean-machine setup, cancellation/restart/error behavior, a rehearsed complete demo, actual timings/usage, demo instructions and competition requirements. Competition URL, deadline and required Meta technology remain unknown. Do not claim eligibility until verified.

## Implementation record

2026-11-02: inspected current code; working tree was clean. Created feat/local-render-runtime. System FFmpeg/ffprobe are installed; bundled Playwright Chromium was absent. Existing UI chat remains mocked. Scope of this work is milestone 1; remaining milestones are subsequent work with explicit acceptance criteria above.

Milestone 1 completed: 26 unit/regression tests, lint, production build, setup/doctor and seven real browser/FFmpeg smoke scenarios pass. The smoke verifies changing frame pixels, audible audio after a 250 ms offset and silence before it, replay from snapshots, no-narration output, missing-seek failure, external asset rejection, cancellation and invalid audio. Test-first checks also caught and fixed an invalid fps probe value (0/0) and the snapshot manifest location before completion.

Full example verification: .studio/renders/44e3df85-7fe9-453a-897d-d2917f3f4b34/video.mp4; 1080×1920, 30fps, 8.000 seconds, H.264/yuv420p + AAC, 644,951 bytes. Render elapsed 15,488 ms on this Mac using an isolated system Chrome render process. Example is re-rendered existing animation/audio, not AI-generated during this change. No paid calls or new dependencies. No app UI changed, so no new UI screenshot is claimed. Clean-machine/browser download and Linux/Windows setup remain unverified; the installer module entry resolves but was not downloaded because system Chrome is present. No commits/push/deploy were made.
