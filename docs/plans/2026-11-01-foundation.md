# Product and backend foundation implementation plan

Goal: turn the local prototype into an organized foundation for SaaS and self-hosting without describing planned services as working.
Architecture: keep a modular Next.js application for UI and HTTP entrypoints; place provider configuration and services under server-only boundaries. Rendering will run in a separate worker. Browser data stays local until an explicit migration to owned server records.
Stack: existing Next.js/React/TypeScript, npm, Base UI; Zod for external configuration/contracts and Node test runner through tsx.

## Sequence
1. Establish canonical PRODUCT.md, DESIGN.md, docs/architecture.md, docs/ACCEPTANCE.md, CONTRIBUTING.md and concise scoped AGENTS.md. Preserve Next-generated guidance. Document current/planned status, routing/model distinction, preview decision, onboarding and release gates.
2. Add configuration schema and env example; add server-only provider registry and read-only health/catalog API. Never expose credentials; fail visibly on invalid config. Do not implement a publicly callable paid provider proxy before auth, ownership and quotas.
3. Replace hardcoded direct-provider chat choices with provider-catalog choices. Keep manual model preference setup for self-host developers; distinguish selection from a verified connection. Runtime model names/IDs must be operator-configured or discovered, not invented in UI.
4. Send a typed chat request containing project, selected model and asset IDs to the mock adapter; preserve legacy attachment names and add stable asset references for new messages. Preserve in-session drafts per project.
5. Add revision checks to local workspace writes; stop studio autosave on conflict. Preserve legacy data and reject corrupt data. This is stale-snapshot protection, not a cross-process transaction; transactional repository replacement is a separate milestone.
6. Add regression tests for config validation/secret omission, stale writes, corrupt data and structured chat input. Run npm test, npm run lint and npm run build. Check HTTP endpoints against production server. Record browser verification limitations explicitly.

## Subsequent milestones (not implemented by this plan)
- Further studio component extraction, CSS consolidation and visual verification of shared navigation/library border reduction.
- Transactional storage, autosave lifecycle/unmount behavior, cross-tab synchronization and recovery UI; retire old duplicated dialogs.
- Persistent auth + Postgres ownership + project APIs before live provider calls.
- Provider discovery, streaming chat, credential management, voice catalog, estimates/approval and jobs.
- Sandbox rendering, versioned artifacts, retry/cancel semantics and real MP4 output.
