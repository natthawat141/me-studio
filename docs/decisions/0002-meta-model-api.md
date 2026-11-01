# ADR 0002 — Correct Meta scope after primary-source verification
Date: 2026-11-01. Supersedes ADR 0001's Meta/Llama-only assumption.

Meta Model API is a separate provider. Its public documentation currently lists Muse Wonder with direct model ID muse-wonder-1.0. OpenRouter's catalog separately lists meta/muse-wonder. They are different routes and credential owners. Muse Wonder Full is not a Model API model; do not fabricate an API ID for it.

Decision: add server configuration/metadata for Meta independently from OpenRouter. The new key name in this app is META_API_KEY (Meta examples call their bearer key MODEL_API_KEY). STUDIO_META_MODELS controls direct IDs. This is metadata foundation only; authenticated inference adapters remain pending.

Record API role candidates and verification dates in the model research note. No automatic promotion to paid production usage without task evaluation, cost policy and verified account access.

Source: https://dev.meta.ai/docs/models and https://dev.meta.ai/docs/overview, accessed 2026-11-01; OpenRouter live GET https://openrouter.ai/api/v1/models.
