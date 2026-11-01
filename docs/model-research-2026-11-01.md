# Model research — checked 2026-11-01

## Verified facts
- Anthropic lists Claude Haiku 5.5, released 2026-10-07, API ID claude-haiku-5-5. Source: https://www.anthropic.com/claude-haiku-5-5
- Meta documentation lists direct Muse Wonder muse-wonder-1.0, bearer API at https://api.meta.ai/v1. Muse Wonder Full is not available through Model API. Sources: https://dev.meta.ai/docs/models and https://dev.meta.ai/docs/overview
- Live OpenRouter catalog returned anthropic/claude-haiku-5.5 and meta/muse-wonder. Both advertise tools and structured_outputs. These are OpenRouter route IDs, not direct provider IDs. Source: https://openrouter.ai/api/v1/models
- Catalog presence does not verify this operator's credits, access, rate limits, Thai performance or real request behavior. No paid request was made.

## Proposed roles (product/engineering judgment, not benchmark findings)
| Task | Candidate | Why trial it |
| --- | --- | --- |
| Brief discussion, summarization, request classification | Haiku 5.5 | Provider positions it for fast high-volume work; measure Thai clarity and latency ourselves |
| Multi-step scene/code planning and tool orchestration | Muse Wonder | Provider targets long agentic/coding work; evaluate HTML/animation correctness and recovery |
| Narration | ElevenLabs TTS | Separate voice ID, speech model and language capability; query authorized catalogs before selecting |
| MP4 rendering | Deterministic isolated worker | A chat-model name does not provide a video renderer |

Do not route every chat to the most expensive model. Build an evaluation set: Thai brief → consistent scenes/duration, valid structured payloads, revision of one scene without changing others, tool failures/recovery, cost/latency per successful task. Keep candidate names dated until those evaluations exist.

## UI/config placement
Settings: dated candidates + route/provider choice. Chat composer: chosen model, not API credentials. Scene/character/narration controls: voice identity. Operator config: allowed models and keys. Credentials/account readiness are separate from a saved preference. src/data/model-recommendations.json records the snapshot and source URLs. Re-check primary sources before changing it.

## Previous error corrected
The earlier direct-provider examples and assumption that Meta meant only Llama were not sufficiently researched. ADR 0002 replaces that scope; no old model preference is silently deleted from existing browser data.
