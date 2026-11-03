# Acceptance and release gates

A checked item means verified in the described scope, not inferred from file existence. Record exact commands/evidence in the delivery note.

## Every change
- [ ] Product behavior and implementation status agree with PRODUCT.md and README.
- [ ] npm test, npm run lint, npm run build pass for code changes.
- [ ] Changed UI flows inspected at relevant desktop/mobile sizes with keyboard; blocked browser checks reported.
- [ ] Loading/empty/failure/disconnected/cancelled states work; no inert primary actions.
- [ ] No secret in source, client bundle, browser storage, API response or logs.
- [ ] Changes preserve existing local projects/assets or have an explicit tested migration.

## Desktop V1 regressions
- [ ] Home opens on brand/composer; no Project creation/manual scene form or automatic preview.
- [ ] แชตใหม่/history/search/settings preserve per-chat drafts; IME Enter, keyboard navigation and focus return work.
- [ ] White/light surfaces, thin monochrome icons and neutral hover/focus match DESIGN.md, including portalled dialogs.
- [ ] Sample/generated media provenance is preserved; native attachment bytes use scoped IDs; provider metadata is not claimed as authentication.
- [ ] Files opens explicitly; native folder picker cancel preserves the prior folder. Tree expansion/filter/refresh work with actual selected files.
- [ ] Real MP4 plays/seeks through the packaged native protocol. Audio/image/text previews work; HTML/Python/SVG source is escaped and not executed.
- [ ] Forged IDs, root escapes/symlinks and oversized text fail safely; media range/HEAD and root-grant revocation are covered.
- [ ] Panel close/reopen preserves chat draft/folder state; narrow layout can switch tree/preview without overflow. Native grants end on app exit.
- [ ] Browser-only access explains the native picker requirement; mock bridge tests are distinguished from real native checks.
- [ ] Native build uses the changed main/preload/runtime, excludes env files/credentials and preserves user data.

## Python runtime regressions
- [ ] Python SDK/subprocess tests run offline; legacy SQLite history/revisions/request replay remain readable.
- [ ] Host grants and model/tool/context/time limits remain enforced; cancellation stops the child and releases the session.
- [ ] Packaged Python passes --check with environment allowlist; no dependency on the user installing Python.
- [ ] Live provider inference is reported separately from SDK mocks and scripted rendering.

## Legacy foundation regressions
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

## Evidence and remaining scope
The checkboxes above are release-gate templates, not a claim that a current run executed every check. Record actual evidence in dated docs/plans files; see the Files/frontend/search plans linked from [the AI guide](ai-guide.md). Legacy foundation gates apply to legacy routes, not to the accepted desktop V1 interaction. Further legacy studio decomposition, CSS consolidation and executable HTML artifact preview remain separate work. No item is complete merely because a design rule was written.
