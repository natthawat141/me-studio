# Provider standby configuration

User authorized using existing local env keys, GPT-6 Luna over OpenAI, Meta Muse Spark 1.3 Contributor, and any suitable ElevenLabs voice. Scope is server-side configuration/metadata readiness, not a live chat/voice/render feature or a public paid endpoint. Preserve the frontend sample adapter and native project data.

- [x] Verify exact API IDs and service endpoints in primary docs; perform read-only metadata checks only.
- [x] Map the existing parent env's Openai_api/meta_ai_api/elevenlabs into canonical, ignored app-local env variables without logging values or copying credentials into a distributable.
- [x] Extend the safe model catalog for OpenAI and configured speech voice metadata; support the requested Meta Contributor ID in the existing trusted adapter allowlist.
- [x] Add regressions for safe projection and contributor acceptance, run unit/API/lint/build checks, and record configured versus verified status. No inference or audio-generation call.

Evidence: [model IDs, source URLs and account status](../model-research-2026-11-03.md). User selected Contributor 1.3 and delegated voice choice. Canonical env values roundtrip through Node parseEnv and match their authorized source keys; file is git-ignored and mode 0600. Default is OpenAI/gpt-6-luna; Meta alternate is muse-spark-1.3-contributor; speech is eleven_v3 plus official example voice JBFqnCBsd6RMkjVDRZzb. OpenAI/Meta model GETs returned 200; ElevenLabs model/voice GETs returned 401 using the exact source credential. No credential values were found in generated client bundles or public assets.

Verification: 49/49 unit tests, 17/17 UI cases, HTTP catalog/invalid-config checks, lint and Next build all passed (`/tmp/me-studio-standby-{tests,ui,api,lint,build}.log`). Contributor transport test uses a synthetic key and mocked fetch. Native desktop/runtime env isolation remains intact; its sample chat UI is not connected to these standby settings or live generation.
