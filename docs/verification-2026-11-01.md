# Foundation delivery evidence — 2026-11-01

## Verified
- npm test: 10 passing regressions: configuration safe projection, Llama/provider distinction, demo defaults, invalid/duplicate model config rejection, stale/corrupt workspace protection, legacy data/revision compatibility, attachment identity, structured mock input/cancellation and draft isolation.
- npm run lint: passes.
- npm run build: passes. /api/catalog and /api/health are runtime routes, not build-time config snapshots.
- npm run test:api: two production-server scenarios passed. A synthetic self-host config provided runtime models/status with no secret echo; invalid config returned safe 503. Tests allocate their own OS-selected port and stop their processes. No real credentials or paid API calls used.
- Existing projects/assets were not cleared or migrated. No deployment/publication performed.

## Verification limits
In-app browser connection returned `browser.user is unavailable` during this session. New menu/settings/library visual changes and pointer/keyboard/responsive interactions have not been visually re-verified in this slice. Passing build/unit/API tests is not equivalent to UI acceptance. Screenshots from earlier runs are not claimed as evidence for this change.

## Remaining product/data risks
- Local revision guard prevents ordinary stale-snapshot writes; it is not an atomic cross-process transaction. Cross-store asset deletion and unload-time autosave still need transactional repository work/recovery tests.
- Draft isolation is in-session; leaving the studio or refreshing does not persist drafts.
- Auth, tenant policies, database, upstream chat/TTS, quotes/credits, sandbox execution and real generated MP4 remain unimplemented.
- HTML preview is not implemented. The subsequent project Agent settings slice adds an explicit settings mode to the right workspace.
- Model preference is not provider permission/connectivity. UI credential management waits for authenticated owner access and encrypted storage.
- Large studio route/global CSS still need decomposition/consolidation. Shared primary navigation and initial border reduction are not a complete redesign.
- npm audit reported 21 advisories (19 moderate, 2 low; no high/critical in that result). Direct affected packages reported: eslint, eslint-config-next, shadcn. Review dependency paths and supported upgrade strategy before publication; no force downgrade applied. This is not a clean security audit.

## Next complete backend slice
Verified session + workspace membership + persistent owned projects/messages + revision conflict tests; then asset ownership and authenticated budgeted provider access. See backend-readiness-plan.md.

## Follow-up: inline rename and researched provider scope
- 12 foundation regressions pass, including Meta direct credential separation and provider-qualified model identity.
- Four isolated headless Chrome browser tests cover inline studio rename (Enter, Escape, blur, blank validation), project-list persistence/save failure, mobile/IME and current model candidate selection/provider preservation. Screenshots were opened and inspected at 1440×900 and 390×844. The in-app browser connection remained unavailable; the isolated test browser did not use the user's profile/session.
- Current primary docs/catalog verify Haiku 5.5, Meta Muse Wonder and route-specific IDs. Dated recommendations and ADR 0002 replace the Meta/Llama-only assumption. No paid model invocation occurred.
- UI key/config support is metadata only. Existing release blockers remain.

## Follow-up: project Agent settings
- Fifteen unit tests passed, including legacy defaults, invalid settings, project isolation/stale write handling and request snapshot isolation.
- Eight UI tests passed in an isolated headless Chrome profile, including opening settings without a video, per-project persistence, restoring video and playback position, keyboard/focus behavior, and tablet/mobile layouts. Desktop and mobile screenshots were inspected.
- Lint, production build and API tests passed. No real AI, billing or rendering was performed. The model-specific Escape test waits until the previous menu has actually closed before reopening it.
