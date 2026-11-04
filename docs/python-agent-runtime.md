# Python agent runtime

The active native video agent uses Deep Agents SDK in Python for its model/tool loop. React and Electron remain unchanged; Node continues to own permissions, SQLite persistence and production tools. This is a runtime migration, not a conversion of the whole backend.

## Ownership

```text
Desktop chat → trusted Electron worker → runtime.mts (scope, SQLite, grants)
                                          ↕ private JSONL pipes
                                  Python worker / Deep Agents graph
                                          ↕ OpenAI Responses API
                                 configured provider/model, streaming

Python tool request → Node allowlist/grants → memory or video tool
                                             → declarative HTML/CSS/SVG → MP4
```

- `python/me_studio_agent/runtime.py`: Deep Agents graph, budget middleware, streaming and multimodal host-tool continuation.
- `python/me_studio_agent/models.py`: explicit LangChain ChatOpenAI adapters for fixed provider endpoints.
- `python/me_studio_agent/worker.py`: one-run JSONL subprocess, protocol version 1. No HTTP listener or arbitrary execution API.
- `src/server/agent/runtime.mts`: trusted bridge. It validates scope/input, owns run IDs and durable status, checks grants independently and kills the child on cancellation/timeout.
- `src/server/video/native-production.mts`: explicitly chooses the packaged Python executable. Missing Python fails visibly; there is no silent Pi fallback.
- `src/server/agent/pi-runtime.mts`: retained legacy implementation for the older Meta path and its regression tests. Pi remains a schema/tool compatibility dependency, but does not run the active video agent loop.

## Development

Use Node >=22.19 and Python >=3.11. The tested Mac development environment is Python 3.14.6; dependencies are pinned in `python/requirements.lock`.

```sh
npm ci
npm run agent:python-setup
npm run agent:python-test
npm test
npm run agent:python-demo
```

The demo uses an offline scripted model with the actual Python loop, trusted production tools, HTML compiler, Chromium and FFmpeg. It writes a unique directory beneath `.studio/python-agent-demo/`, never user projects. It proves orchestration/rendering without a provider call or synthetic claims of billed usage. Browser/FFmpeg setup is described in [local-development.md](local-development.md).

`video:produce` also uses the Python source worker and explicitly loads the existing local env file. It makes paid provider calls; do not run it merely for refactor checks.

## Packaging

```sh
npm run desktop:build
```

Staging first builds a PyInstaller onedir executable and its private Python/SDK libraries, then the Electron resources. Output: `release/mac-arm64/me studio.app`. End users need no Python, pip or venv installation. Only the build machine needs `agent:python-setup` first. This remains an unsigned Mac arm64 development build; other platforms and clean machines require separate verification.

`agent:python-build` checks the frozen executable with `--version` and `--check` (actual offline SDK graph, tool/image continuation and adapter construction, no network). Distribution licenses and the Python license are copied into `runtime/python-agent/notices`. Generated venv/dist/build data remain ignored in `.studio/`.

## Data and trust boundaries

The SQLite schema and owner/project/session scope are unchanged. Completed legacy Pi user/assistant text can feed Python context; legacy tool records stay in the archive, but are not replayed as orphan Responses calls. Facts/revisions/tombstones and request replay/conflict behavior remain host-owned. There is no implicit database or UI-storage migration.

Keys travel through private stdin, not argv, renderer DTOs, files or logs. The child receives an environment allowlist and does not inherit provider credentials, PYTHONPATH or proxy settings. OpenAI uses a host-selected fixed provider endpoint and configured model, `store=false`, SDK retries disabled and sequential tools. Saved memory, skills, file contents and tool results remain untrusted reference data.

The host independently enforces registered tools, approved grants, duplicate call IDs and call/result bounds. Model output cannot select an arbitrary executable, directory, endpoint or shell command. Python is the implementation language of the agent; it is **not** a tool that runs arbitrary model-generated Python.

Cancellation terminates the Python process and signals host tools. Host tools must still cooperate with cancellation. Successful side effects remain on disk; there is no rollback, crash lease recovery or durable queue. Existing provider/model/output limits are preserved; context characters are not a token-price estimate.

## Verification boundary

See [dated evidence](plans/2026-11-03-python-agent-runtime.md). SDK tests use an HTTP mock transport, while subprocess tests execute real Python and real scoped Node tools. These checks do not prove account entitlement or live inference after the language migration. Earlier live Pi generation evidence remains historical and must not be labelled live Python verification.

Primary references checked 2026-11-03: [OpenAI Python SDK](https://github.com/openai/openai-python), [function calling](https://developers.openai.com/api/docs/guides/function-calling), [PyInstaller platform notes](https://pyinstaller.org/en/stable/feature-notes.html).

Native model visibility and configuration are now described in [video-harness.md](video-harness.md). The Python provider receives the model/provider in private JSONL; run fingerprints and transcript metadata include both. OpenAI, OpenRouter and Meta use their fixed Responses endpoints. This does not make arbitrary endpoints or credentials accessible to the renderer.

## Deep Agents configuration

Pinned Deep Agents 0.7.32 and langchain-openai 1.7.3 own model/tool orchestration. SQLite remains the durable source for completed conversation history, request replay and scoped project memory. A fresh graph is constructed per request with that bounded history. There is no LangGraph server or hosted dependency.

The graph has an in-memory StateBackend with scratch filesystem tools and write_todos. Scratch files are not Project files and do not persist across requests. The general-purpose subagent middleware is replaced; task, shell, execute and delete are unavailable. Host context middleware replaces automatic summarization so hidden model calls cannot exceed the request budget. Effective SDK tool schemas, instructions, history and text tool output all count toward context characters; normalized image bytes are bounded separately.

`STUDIO_REASONING_EFFORT=auto|low|medium|high` is persisted in private config.env through a narrow native method. Auto omits reasoning settings; OpenAI/OpenRouter explicit effort is forwarded without silently changing it. Meta uses Auto until its effort contract is verified. Model support and provider entitlement remain provider-dependent. Non-Auto effort participates in request identity, while Auto preserves existing replay fingerprints.

Production events carry sessionId and requestId. The UI streams partial Markdown into the current assistant message, replaces it with the final result, and ignores late events after Stop. A late final response may attach verified saved files (deduplicated, at most 10) to the original stopped message only; it cannot open a panel or modify a newer run. Stop is request-scoped. Host shutdown is a separate worker-only action. Provider incomplete/failed responses, invalid tool calls and empty final answers fail explicitly; partial streamed text remains visible with a failure state.

## Project assets and visual inspection

Host Project tools list/read/write bounded creative text files and import raster images. Paths are relative to the host-selected Project source; hidden files, credentials, instruction files, build/dependency directories, traversal and symlinks are denied. Writes back up existing content before atomic replacement. These are task tools, not an expanded editable Files panel or an execution API.

Normalized attached/imported images have stable content-addressed asset IDs. The model discovers their exact src through list_visual_assets. HTML allows those images only; the preview route and immutable render snapshot serve the allowlisted bytes, without opening network or arbitrary disk access. Limits: 6 attached images/request, 250 KB/normalized image, 20 registered images/chat. Project imports accept raster inputs up to 25 MB before normalization.

inspect_animation returns three labelled images at the beginning, midpoint and ending. Draft inspection captures the saved HTML; after rendering it extracts frames from the actual current MP4 and returns ffprobe duration/stream metadata. A new edit marks the previous MP4 as stale for inspection. The agent can correct and render up to three times/request, retaining unique previous artifacts. This is evidence for model review, not an automated guarantee of visual quality or user approval. Inspection images do not enter durable transcripts or renderer events.

Research/Tavily and expanded creative skills remain the next slice. Audio/video semantic understanding, arbitrary JS/Python execution, general browser automation, long-term SDK scratch memory and a durable job queue are not introduced by this migration.

Primary SDK references: [Deep Agents customization](https://docs.langchain.com/oss/python/deepagents/customization), [backends](https://docs.langchain.com/oss/python/deepagents/backends), [models](https://docs.langchain.com/oss/python/deepagents/models), [streaming](https://docs.langchain.com/oss/python/deepagents/streaming). Exact installed contracts are tested offline, including SDK Command results and Responses incomplete status.

## Stability recovery (0.2.1)

`context.py` measures model-bound messages and tool schemas, excluding response diagnostics, duplicate Responses function-call representations and separately bounded image bytes. Before a model call it retires complete older dialogue turns, then complete older tool cycles when necessary, while retaining the current user request, newest tool exchange and pending calls. Durable transcripts/files are unchanged. If those retained inputs alone exceed the fixed budget, the request still fails with CONTEXT_LIMIT; there is no hidden summarization call or budget increase.

Native production returns an explicit completed/failed/cancelled outcome together with successful saved files and any actual rendered artifact. Provider authorization, throttling and availability errors use fixed safe codes; provider bodies/credentials never enter UI error messages. The UI clears active indicators on failure/Stop and preserves partial output. Normal retry is user-triggered. A worker crash can still interrupt a run; this release does not add crash recovery or a durable queue.

When write_project_file saves HTML referencing registered content-addressed assets, the host verifies and materializes only those assets beside the HTML. Existing differing bytes and symlinks are refused. Supported HTML can therefore be captured/opened from the Project source with its verified dependencies, rather than referencing a missing render-only asset folder. Arbitrary external or disk image paths remain unavailable.

See [stability evidence](plans/2026-11-04-runtime-stability.md) for the actual live Meta and packaged-release checks; paid generation quality and user creative acceptance remain separate.
