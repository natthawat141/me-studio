# Working agreement

Read AGENTS.md, PRODUCT.md, DESIGN.md and docs/architecture.md before changing behavior.

1. Describe the user problem, scope and concrete acceptance criteria. Record assumptions and unresolved decisions. Do not keep asking about already authorized work.
2. Inspect the current owning code/data path. Capture existing UI for visual changes when tools permit.
3. Plan multi-step work in docs/plans; persistent architecture decisions go in docs/decisions. Do not use AGENTS.md as a task log.
4. Implement a small complete slice through contract → service → UI. New domain logic must not be added to the existing large studio page; extract the relevant responsibility.
5. Test failure/data/permission behavior as well as success. Costly or destructive operations require idempotency and server ownership checks.
6. For code/config changes verify with npm test, npm run lint, npm run build; inspect changed UI and run relevant UI/API/native checks from AGENTS.md. For Markdown-only changes check links/paths/imports, script names and git diff --check; no rebuild/repackage is required. Report what was tested, what is still mocked, limitations and follow-ups. Do not equate build success with product acceptance.
7. Update canonical docs in the same change. Avoid duplicate rules; link the source of truth. Do not commit unrelated existing work.

Secrets go in ignored server env/config stores, never screenshots, fixtures, chats, public JSON or browser preferences. Use synthetic test values. Do not run paid upstream calls just to validate a refactor.

## Definition of ready
Clear user outcome, current behavior, proposed behavior, data/API ownership, error states and a verifiable acceptance list. For providers: service vs model identity, credential owner, allowed capabilities and cost policy are explicit.

## Definition of done
Acceptance evidence exists; data preserved; docs match behavior; no fake operational states; required tests pass. Browser unavailability is a recorded verification gap, not permission to claim visual success.

Before model/provider decisions, verify current primary docs/catalog, record exact route-specific API IDs, dates and sources in a research note. Model-role assignments require task evaluation and must be labelled as proposals until measured. For inline rename and model-selection changes, run `npm run test:ui` after build; it uses isolated browser data.
