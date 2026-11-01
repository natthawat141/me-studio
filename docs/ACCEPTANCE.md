# Acceptance and release gates

A checked item means verified in the described scope, not inferred from file existence. Record exact commands/evidence in the delivery note.

## Every change
- [ ] Product behavior and implementation status agree with PRODUCT.md and README.
- [ ] npm test, npm run lint, npm run build pass for code changes.
- [ ] Changed UI flows inspected at relevant desktop/mobile sizes with keyboard; blocked browser checks reported.
- [ ] Loading/empty/failure/disconnected/cancelled states work; no inert primary actions.
- [ ] No secret in source, client bundle, browser storage, API response or logs.
- [ ] Changes preserve existing local projects/assets or have an explicit tested migration.

## Foundation regressions
- [ ] Stale workspace snapshot is rejected, original saved changes preserved; corrupt data is not overwritten.
- [ ] Selected chat provider/model and stable attachment IDs reach the adapter.
- [ ] Draft and attachments survive in-session project switching.
- [ ] Config validation fails closed; catalog omits credentials; Llama is a model family routed via OpenRouter.
- [ ] UI preferences never claim credentials have been verified or models called.

## SaaS launch blockers (not implemented)
- [ ] Real identity/session, tenant membership and ownership tests including foreign IDs.
- [ ] Persistent projects/messages/assets with revisions; upload and recovery flow.
- [ ] Streaming real chat, validated structured UI and verified provider capabilities.
- [ ] Voice list/preview and narration selection tied to generation input.
- [ ] Quote expiry/input binding; approval idempotency; transactional usage ledger/budget enforcement.
- [ ] Durable jobs, worker isolation, retry/cancel/reconnect, versioned real MP4 output.
- [ ] Rate limits, cost limits, backup/restore and operational observability tested.
- [ ] Self-host clean checkout setup and production secret management verified.
- [ ] Open-source license selected by owner, references reviewed, secret scan and publish review complete.

## Visual backlog
Shared primary navigation, initial library border reduction and old settings/project dialog removal are implemented in the foundation slice but need browser visual verification. Further studio decomposition, CSS consolidation and artifact HTML preview remain open. No item is complete merely because a design rule was written.
