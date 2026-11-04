# me studio 0.2.1 — user acceptance audit

Date: 2026-11-04. Decision: **not ready to call stable or hand to a nontechnical user as a self-service MVP**.

This is a current-run assessment of one natural-language, multi-turn creative journey. It is not a reliability benchmark, a completed native UI usability study, or a claim that every available model behaves identically. No application code was changed during this audit.

## Test boundary

- Installed candidate: `release/mac-arm64/me studio.app`, version 0.2.1, packaged code revision `54269e153eb2deafb2a3d8854ebb3c08fcc1cf43`.
- Actual bundled worker, frozen Python Deep Agents runtime, browser, FFmpeg and ffprobe; isolated synthetic Project and private data. Not a mock provider or a developer-only runtime.
- Real Meta `muse-spark-1.3-contributor`, authorized inexpensive paid testing. No paid OpenAI or ElevenLabs calls, and no private user artwork/history sent.
- Ordinary Thai prompts. No tool names, source code or instructions about implementation supplied to the model.
- Journey: discuss two directions without creating files → PNG poster → change only price → six-second MP4 → recover after failure → restart worker and reopen existing PNG.
- Current evidence: `.studio/mvp-audit-20261104/`, intentionally ignored by Git. Original logs and generated media are preserved.

## Observed results

| User action | Actual result | User-level verdict |
| --- | --- | --- |
| Ask for two ideas, explicitly do not create yet | Discussed two directions, asked a consequential question, created no files; 23.7 seconds | Pass on respecting intent. Advice was too lengthy and recommended real filming/actors, an expectation the app cannot fulfill itself. |
| Request cream/orange graphic poster, 9:16, Morning, AMERICANO 59 BAHT, PNG only | Actual readable PNG, 720×1280, original HTML and two captures; 71.6 seconds | Pass on requested graphic output. Exposes HTML in final response even though PNG was requested. This validates HTML/SVG graphic creation, not general photorealistic image generation. |
| Change only 59 to 69, retain old version | Actual second PNG, same layout; source diff contains only the two price replacements; 31.5 seconds | Pass. Both old/new PNG and HTML files still exist. |
| Make latest version a silent six-second clip with cup motion, steam and text entrance | Two animation drafts and inspections, then `MODEL_CALL_LIMIT` after ten model calls; no MP4 returned; 78.6 seconds | Fail. A normal complete brief exhausted the turn before delivery. |
| Ask to continue saved work without redesigning | MP4 returned after another 64.6 seconds; H.264, 720×1280, 24 fps, 144 frames, exactly 6.0 seconds; complete FFmpeg decode succeeds | File/container pass, **creative motion fail**. See renderer diagnosis below. User had to rescue the request. |
| Restart worker, ask to reopen existing PNG69 without creating anything | Opened HTML instead; falsely said no PNG was saved, despite the captures still existing; 37.6 seconds | Fail on requested artifact and truthful recovery. Did not delete the PNG. |

Provider totals for these six requests: 36 model calls, 31 tool calls, 426,747 reported input tokens and 21,626 output tokens. Total request wall time 307.69 seconds; this is observed latency/usage, not an invoice or projected per-clip price.

## Release blockers, in order

### P0 — MP4 capture changes the animation being rendered

Owner: `scripts/local/render.mjs`, frame screenshot call using `animations: 'disabled'` after `window.seek(ms)`.

The authored HTML includes text fade-in, cup sway and moving steam. The MP4 opens with the finished poster, and inspected first/middle/last frames do not reproduce the requested motion. This is a deterministic renderer defect, independent of model wording.

Reproduction using the actual saved HTML and a headless browser:

1. Seek to 0 and capture with animations allowed: introductory elements remain hidden, as authored.
2. Seek to 0 and capture with animations disabled: the complete poster appears immediately; infinite motion disappears.
3. Seek to 1500 ms and capture with animations allowed: the cup is tilted/lifted and steam is visible.

Evidence: `allowed-0.png`, `disabled-0.png`, `allowed-1500.png`, `renderer-diagnosis.json`, and decoded `first.png`, `middle.png`, `last.png`. Decoding reports 25 distinct frame hashes across 144 frames; hash differences alone do not prove intended motion. Direct visual comparison and the controlled screenshot reproduction establish the failure.

The file contains an intentionally silent AAC track (max volume -91 dB), not an absent audio stream. Audio/voice generation was outside this test.

Required correction: preserve the host-controlled seek time during capture. Add a regression that compares actual encoded finite fade/translation and infinite-motion frames against authored times, plus the legacy renderer behavior. Probe-only validation cannot catch this failure.

### P1 — A normal production request runs out of turns before producing its deliverable

Owner: Python orchestration/budget policy and production tool workflow.

Observed sequence: planning → draft discovery → read source → planning → save → inspect → reread → save → inspect → hard stop. All host tool results were successful. No render was attempted before the ten-call ceiling.

The budget guard correctly enforced its boundary. The missing behavior is execution that fits within it: reduce redundant planning/reads, track remaining budget, reserve capacity for render/check/delivery, and preserve a clear resumable status. Raising limits by itself does not establish reliability or sensible cost.

Required acceptance: the original brief completes without a rescue prompt; when correction is necessary, the agent still delivers or explicitly offers a bounded continuation without silently restarting design.

### P1 — Generated outputs are not reliably discoverable by the agent after restart

Owner: generated-artifact persistence/discovery and production tool contracts.

`capture_project_html` publishes the PNG to the app, but its textual tool result only identifies the source HTML and `captured: true`. `list_visual_assets` enumerates imported/uploaded references, not generated captures. The agent did not discover the nested generated PNG after restart and substituted HTML while claiming PNG did not exist.

A durable generated-artifact index with scoped IDs, kind, title, source/revision and reopen capability should bridge this gap. Do not weaken filesystem grants or expose arbitrary paths to repair discovery. Distinguish this from file loss: the saved files were verified present.

Required acceptance: restart → “open the PNG69 we made” opens that exact existing PNG, without recapturing, rewriting or misreporting its absence. Repeat for MP4 and for an output folder outside the source directory.

## User experience assessment

Strengths observed: understands a brief, respects “do not create yet,” creates a real legible graphic and performs a narrowly scoped revision while preserving the previous file. These support the central conversational product direction.

Friction observed: excessively long advice, suggestions outside current production capability, internal HTML/file discussion in delivery, a rescue message needed to obtain MP4, and an incorrect claim about an existing PNG. For a nontechnical user these undermine trust even when individual tools return success.

Native UI audit remains **incomplete**. Current-run accessibility data and screenshots disagreed, and UI actions did not reliably reflect visible state. A request to unlock/foreground the app was sent; no confirmation arrived during this audit. Do not attribute this control-channel limitation to an application defect, and do not count native play/pause/seek, inline image opening, keyboard behavior or responsive layout as passed. No user data was removed to test those flows.

## MVP recommendation and next gate

My product judgment: keep the initial promise narrow—create a graphic still, turn the accepted design into a short HTML/CSS motion graphic, revise through conversation and reopen saved results. The creative tool foundation exists, but this build does not yet satisfy that complete promise reliably. Do not expand to a general browser/terminal agent or promise arbitrary film/cartoon production to compensate.

Before a new candidate is handed over:

1. Fix and regress the renderer timing, production completion and durable artifact reopening above.
2. Run at least three different ordinary-language briefs through still → targeted edit → MP4 → restart/reopen, without tool-name hints or rescue prompts; record first-attempt failures as failures.
3. Test actual native image/video playback, seek, panel resize/close/reopen and saved history on the packaged candidate. Explicitly test Stop and provider failure recovery without losing the draft or previous artwork.
4. Inspect actual output frames against the brief, not just successful tool status, file existence or media metadata.
5. Then run a small observed nontechnical-user pilot. A few internal passes establish a candidate for that pilot, not a broad statistical stability claim.

## Evidence files

All paths below are within `.studio/mvp-audit-20261104/`:

- `user-flow.mjs`, `live-flow.log`, `evidence.json`: original prompts and first-attempt results.
- `recovery.mjs`, `recovery.log`, `recovery-evidence.json`: explicit rescue and worker-restart results.
- `inspect-render.mjs`, `renderer-diagnosis.json`: controlled renderer reproduction.
- `coffee-project/morning-americano-poster.html` and `morning-americano-poster-69.html`: source revision comparison.
- PNG59: `coffee-project/output/animation-60e19420-7e82-4b35-ac34-3c604c37f97a/capture-9782bb3d-4a6c-4a34-99e6-754d35237e14.png`.
- PNG69: `coffee-project/output/animation-c1162615-12da-4280-a211-776e4c2202e3/capture-b95be807-c729-461e-a5b6-353787a586e7.png`.
- MP4: `coffee-project/output/animation-fda3abcc-1e10-4b4f-a450-40eea6dc3951/renders/6b7b9a3e-303f-468b-a76b-152a5ccc5728/video.mp4`.
