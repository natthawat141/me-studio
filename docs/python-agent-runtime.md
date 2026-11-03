# Python agent runtime

The active native video agent uses Python for its model/tool loop. React and Electron remain unchanged; Node continues to own permissions, SQLite persistence and production tools. This is a runtime migration, not a conversion of the whole backend.

## Ownership

```text
Desktop chat → trusted Electron worker → runtime.mts (scope, SQLite, grants)
                                          ↕ private JSONL pipes
                                  Python worker / async agent loop
                                          ↕ OpenAI Responses API
                                 configured provider/model, streaming

Python tool request → Node allowlist/grants → memory or video tool
                                             → reviewed Canvas HTML → MP4
```

- `python/me_studio_agent/runtime.py`: bounded sequential loop, Responses streaming, transcript normalization and tool-call continuation.
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

`agent:python-build` checks the frozen executable with `--version` and `--check` (SDK construction only, no network). Distribution licenses and the Python license are copied into `runtime/python-agent/notices`. Generated venv/dist/build data remain ignored in `.studio/`.

## Data and trust boundaries

The SQLite schema and owner/project/session scope are unchanged. Completed legacy Pi user/assistant text can feed Python context; legacy tool records stay in the archive, but are not replayed as orphan Responses calls. Facts/revisions/tombstones and request replay/conflict behavior remain host-owned. There is no implicit database or UI-storage migration.

Keys travel through private stdin, not argv, renderer DTOs, files or logs. The child receives an environment allowlist and does not inherit provider credentials, PYTHONPATH or proxy settings. OpenAI uses a host-selected fixed provider endpoint and configured model, `store=false`, SDK retries disabled and sequential tools. Saved memory, skills, file contents and tool results remain untrusted reference data.

The host independently enforces registered tools, approved grants, duplicate call IDs and call/result bounds. Model output cannot select an arbitrary executable, directory, endpoint or shell command. Python is the implementation language of the agent; it is **not** a tool that runs arbitrary model-generated Python.

Cancellation terminates the Python process and signals host tools. Host tools must still cooperate with cancellation. Successful side effects remain on disk; there is no rollback, crash lease recovery or durable queue. Existing provider/model/output limits are preserved; context characters are not a token-price estimate.

## Verification boundary

See [dated evidence](plans/2026-11-03-python-agent-runtime.md). SDK tests use an HTTP mock transport, while subprocess tests execute real Python and real scoped Node tools. These checks do not prove account entitlement or live inference after the language migration. Earlier live Pi generation evidence remains historical and must not be labelled live Python verification.

Primary references checked 2026-11-03: [OpenAI Python SDK](https://github.com/openai/openai-python), [function calling](https://developers.openai.com/api/docs/guides/function-calling), [PyInstaller platform notes](https://pyinstaller.org/en/stable/feature-notes.html).

Native model visibility and configuration are now described in [video-harness.md](video-harness.md). The Python provider receives the model/provider in private JSONL; run fingerprints and transcript metadata include both. OpenAI, OpenRouter and Meta use their fixed Responses endpoints. This does not make arbitrary endpoints or credentials accessible to the renderer.
