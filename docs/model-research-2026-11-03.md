# Provider standby research — 2026-11-03

Scope: user requested GPT-6 Luna via OpenAI, Meta Muse Spark 1.3 Contributor, and a chosen ElevenLabs speech model/voice. This config does not activate paid generation or replace the desktop sample adapter.

## Verified primary sources

- OpenAI GPT-6 Luna: `gpt-6-luna`, official endpoint base `https://api.openai.com/v1`. https://developers.openai.com/api/docs/models/gpt-6-luna . For the later harness use Responses API for tool calling; Chat Completions function calling requires reasoning_effort=none. No OpenAI inference adapter is introduced in this change.
- Meta Contributor: `muse-spark-1.3-contributor`, fixed endpoint base `https://api.meta.ai/v1`. https://dev.meta.ai/docs/models and https://dev.meta.ai/models/muse-spark . This is the lower-price Contributor variant explicitly requested by the user; submitted content may be used to train Meta models. No content-generation request was sent.
- ElevenLabs speech: `eleven_v3` supports Thai (`th`); Flash v2.5's documented language list does not include Thai. https://elevenlabs.io/docs/overview/models . This is a Thai-capable selection, not a claim of being the latest or cheapest speech model.
- Voice: `JBFqnCBsd6RMkjVDRZzb` is the official Create speech example's voice ID. https://elevenlabs.io/docs/api-reference/text-to-speech/convert . Display label is simply เสียงตัวอย่าง; no claim of an account-owned or Thai-native voice identity.

## Local readiness evidence

Existing keys in the parent `.env.local` were read only for the authorized setup, never printed, and mapped to canonical variables in the ignored app-local `.env.local` (mode 0600). No source credential was removed or rewritten. OpenAI and Meta keys are separate; an OpenAI-compatible protocol does not make the keys interchangeable.

Read-only metadata checks: OpenAI `GET /v1/models/gpt-6-luna` and Meta `GET /v1/models/muse-spark-1.3-contributor` returned 200 with the expected IDs. ElevenLabs `GET /v1/models` and `GET /v2/voices?page_size=100` returned 401. Voice/model defaults are prepared from docs but ElevenLabs account access remains unverified. Sanitized evidence is in ignored `.studio/provider-setup/metadata-check.json`; it contains no keys or raw upstream responses. No generation, speech synthesis, upload, Contributor content submission or paid inference call.

The server catalog exposes only configuration metadata and configured-key booleans, never credentials/endpoints or a claim of verified access. `liveChatEnabled` remains false. The selected server default is OpenAI/gpt-6-luna. The desktop sample frontend and environment-isolated packaged runtime do not automatically consume the developer env file; native credential wiring remains subsequent harness work. Do not bundle `.env.local` into the app.
