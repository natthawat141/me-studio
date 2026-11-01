# ADR 0001 — Shared contracts, server-owned providers
Status: provider scope superseded by ADR 0002; server/runtime boundaries retained. 2026-11-01.

Context: me studio targets hosted SaaS and downloadable self-hosting. OpenRouter is a chat provider, Meta/Llama a model family, ElevenLabs a speech provider. Prior UI confused provider/model names and did not send preferences to the mock adapter.

Decision: use a server-validated operator registry with env credentials and allowed model metadata. Frontend reads a safe catalog. Keep one application/API with a separate future render worker. Do not add direct Meta integration without a confirmed endpoint and credential flow.

Consequences: operators can add permitted model IDs through configuration without touching components; user preferences may select only within granted capabilities when live calls exist. UI credential management waits for owner authentication and an encrypted server store. Provider/key presence is not a connectivity test. No public paid proxy is included in this foundation.

Deferred: auth vendor, hosting/queue vendors, tenant BYOK, renderer technology and open-source license. See architecture.md and ACCEPTANCE.md before launch.
