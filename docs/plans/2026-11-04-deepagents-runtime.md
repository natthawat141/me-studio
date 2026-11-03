# Deep Agents creative runtime implementation plan

> For agentic workers: use superpowers:executing-plans task by task. User approved the proposed migration and asked to proceed; routine implementation decisions are delegated.

Goal: replace the hand-built Python model/tool loop with Deep Agents while completing streaming, scoped visual assets and a bounded inspect/fix/render loop.
Architecture: Electron and Node retain credentials, Project scopes, SQLite, grants and media production. Python runs Deep Agents with explicit LangChain provider adapters, host-backed tools and bounded virtual context. Preserve stored user data, exact model selection and existing private JSONL protocol.
Tech stack: Deep Agents 0.7.32, langchain-openai 1.7.3, existing Python/Electron/React/Node/Playwright/FFmpeg.
Spec: accepted four-stage proposal in this conversation; docs/python-agent-runtime.md and docs/video-harness.md describe the retained contracts.

## Global constraints

- No developer credentials in bundles/logs; fixed host-selected endpoints; no silent fallback, shell, arbitrary generated JS/Python or expanded filesystem permissions.
- Preserve existing Project/chat identity, completed legacy transcripts, grants, request fingerprints/replay semantics, cancellation and partial user-visible output.
- Reference image bounds: maximum 6 images, 250 KB each; private image bytes never enter SQLite transcripts or renderer events.
- Main approved slice is runtime + real assets + self-inspection. Research/Tavily and deeper skill content are the subsequent slice, not prerequisites for local production.
- Work in the existing clean feat/local-render-runtime checkout used by the native app. Keep old runtime in an explicit comparison fixture, never as an automatic production fallback.

## Review focus

- Concurrent/late events must not corrupt another chat or continue rendering after Stop.
- A filename, symlink, image reference or SDK filesystem tool must not escape Project scope or read credentials.
- Tool images must reach the model as images while transcripts/events contain bounded text metadata only.
- A failed/cancelled revision must preserve previously accepted files and artifacts.
- Provider-specific reasoning, streaming tools and SDK defaults must not silently re-enable retries/delegation/shell or spend beyond host limits.

## Task 1: SDK model/tool execution

Files: python/me_studio_agent/{runtime,models,agent_loop}.py, worker.py, requirements*, Python tests, Node bridge contracts/tests and frozen build script.
Interface: run_agent(config, provider, rpc, emit) remains async and returns result/usage/errorCode; explicit model adapter supports injected scripted model for offline tests. Node RPC remains authority for tools/context. Media is standard multimodal content; tool responses may include bounded image parts.
- [x] Add failing actual-SDK tests for sequential tools, images, provider settings, limits, error redaction, no unapproved default tools, replay and cancellation.
- [x] Install pinned dependencies, implement Deep Agents graph and model factory; preserve JSONL and transcript schema; remove forced low reasoning.
- [x] Run Python/Node suites and offline graph demo, then commit runtime slice.

## Task 2: Scoped production files and real raster assets

Files: desktop/chat-files.mjs, main.mjs, src/server/video/{native-production,production}.mts, new project workspace service, existing HTML preview/renderer owners and tests.
Interface: host supplies normalized reference images with stable asset IDs; tools list/read/write approved Project content and import images into immutable animation versions. Generated HTML can reference only allowlisted local assets.
- [x] Add negative path/symlink/secret/asset tests and an actual local-image render test.
- [x] Implement bounded Project tools and raster asset mapping through the host, not arbitrary paths from renderer or model.
- [x] Run scope/HTML/production tests and actual offline render, then commit.

## Task 3: Visual inspection and bounded revisions

Files: production tools, host tool-result sanitizer, Python multimodal tool adapter and tests.
Interface: inspect_animation returns 3 time-labelled image blocks plus ffprobe metadata. Render permits up to 3 attempts/request and creates unique artifacts; budget exhaustion is explicit. Existing artifact remains available if revision fails.
- [x] Add failing tests proving images reach an actual SDK tool continuation and multiple revisions preserve files, cancellation and bounds.
- [x] Implement screenshots/metadata, tool image transport and 3-attempt policy; guide agent to verify before claiming completion.
- [x] Run actual SDK → save → inspect → edit → render smoke and relevant suites, then commit.

## Task 4: Streaming and reasoning through native UI

Files: desktop/preload.cjs, main.mjs, native contracts/config, chat hooks/transcript/composer and UI tests.
Interface: production events carry requestId/sessionId; onProductionEvent returns unsubscribe. UI displays only current request's deltas and tool stage, preserves partial output on Stop, and ignores late events. Config reasoning Auto omits unsupported settings; explicit supported reasoning is passed to the adapter and part of request identity.
- [x] Add failing isolated UI tests for early tokens, stale/late events, Stop and persisted reasoning setting.
- [x] Wire request-scoped streaming and thin reasoning control using existing primitives.
- [x] Run full unit/Python/UI/API/lint/build verification, then commit.

## Task 5: Packaging, docs and independent review

- [x] Update canonical docs/notices and record exact implementation limits; freeze SDK dependencies and package all SDK assets/imports.
- [x] Build and reopen native app with user's drafts/jobs preserved; run frozen SDK offline smoke and verify no credential-bearing bundle files.
- [x] Dispatch one independent final review as required by executing-plans, fix important findings with regressions, commit and push the authorized release path.
- [x] Remove only regenerated staging; keep current app, latest backup and all user data. Report verification versus live model evaluation separately.

## Verification evidence

- Task 1 runtime commit: abf9844. Deep Agents 0.7.32/langchain-openai 1.7.3 pinned; no automatic Pi fallback.
- Unit suite: 73/73; Python: 13/13 (8 active SDK tests and 5 legacy comparison tests); UI: 45/45. API checks, TypeScript, lint, Next production build and native packaging pass.
- Actual SDK subprocess demo: save HTML → inspect three images → save targeted revision → render MP4 → inspect actual MP4. Completed in 6 scripted model calls/5 host tools without provider requests. Unique output beneath .studio/python-agent-demo, never user Project files.
- Local-image render regression checks a red input image remains red in actual MP4 pixels. Traversal, hidden/credential paths, symlink replacement, cancelled writes and three-attempt render bounds are covered.
- Independent review found SDK Command handling, effective SDK schema budgeting, incomplete Responses status and worker cancellation dispatch/shutdown defects. All fixed with covering tests; no unresolved important findings. Reviewer independently reran active SDK and worker regressions.
- Native packaged frozen worker --check runs an actual offline graph/tool/image continuation. Packaged worker cancellation/shutdown and desktop runtime/render smoke pass. Packaged runtime contains zero real-env filenames (.env* excluding synthetic .env.example, or config.env).
- Reopened release/mac-arm64/me studio.app; old Project/chat/reference image remained available, Markdown rendered and reasoning menu shows Auto/Low/Medium/High. No real config keys were opened or modified; no paid requests made.
- Live model creative quality/provider entitlement, quit dialog during a real native render, code signing/notarization and clean-machine/platform behavior remain unverified. Research/Tavily and richer creative skill content are the next slice.

## Implementation decisions

- Keep host-owned rolling history/SQLite memory and disable automatic paid summarization. Cost: older turns require explicit scoped recall/current-draft tools; this is not unlimited conversation memory.
- Retain the existing dedicated feature checkout used by native packaging. Cost: changes were visible in that checkout during development; unrelated user data were preserved.
- Commit dependent file/image, inspection and native event contracts together to avoid an intermediate incompatible private protocol.
