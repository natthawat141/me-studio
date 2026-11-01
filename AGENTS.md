<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# me studio — agent working rules

## Source of truth
- Product/workflow/status: PRODUCT.md. Visual/interaction rules: DESIGN.md.
- Architecture/current vs planned services: docs/architecture.md. Release checks: docs/ACCEPTANCE.md.
- Change process: CONTRIBUTING.md. Task plans: docs/plans; decisions: docs/decisions.
- Do not infer implementation from a mock, type, screenshot or written plan. Update docs when behavior changes.

## Repository and commands
App and git root: this directory. Next.js App Router, React, strict TypeScript, npm, Tailwind v4, Base UI/shadcn. Node 22+.
- Install npm ci; develop npm run dev -- --port 3100.
- Check npm test, npm run lint, npm run build. Production npm start -- --port 3100.
- src/app: routes/composition; src/components: UI; src/lib: shared contracts/local adapters; src/server: server-only configuration/services; tests: regressions.
- Preserve existing uncommitted work and local browser data. Do not read or print real env secrets.

## Boundaries
- Current product is a local prototype plus read-only backend foundation, not a deployed SaaS. Auth, paid AI, credits and render workers are not implemented.
- New screens compose feature components/hooks. Do not add domain logic or duplicated settings/project dialogs to src/app/page.tsx. Remove obsolete paths when replacing their behavior.
- All paid provider access belongs in authenticated server services with ownership, quotas and allowlisted models. Browser preferences are not authority.
- Never expose credentials, provider raw errors, arbitrary upstream URLs, generated executable HTML or env configuration through public APIs/client imports.
- Server provider vs model family vs voice are separate. Use config/catalog; never invent model versions or claim key presence is verified access.
- New attachments reference asset IDs. Legacy filename-only messages remain readable; do not fabricate IDs.
- Do not overwrite unreadable storage. Stale-write checks are not full cross-tab transactions. State the limitation until transactional storage is implemented.

## UI
Thai-first neutral theme, blue functional accent. No decorative eyebrow/kicker labels. Reuse installed primitives. One visual boundary per group, spacing before borders. Edit owning CSS rules instead of accumulating overrides/!important.
Desktop right workspace shows either video or project Agent settings, one at a time (explicitly requested settings exception). Settings open from the composer gear even without a video; close restores only a previously visible player. HTML preview remains a separate planned artifact view. Keep drafts when switching projects. Agent settings are project-scoped, validated and snapshotted in requests; browser preferences never authorize credit use.

## Handoff
Report changed behavior, actual checks and material gaps. Build/lint passing does not prove usability/security. Keep demo and live results distinguishable; never claim generation or billing succeeded without real backend evidence.

## Research before provider/product decisions
Before introducing/updating provider integrations, model names/IDs, capability claims, pricing, or a UI pattern with external dependencies: inspect the owning code and current primary provider docs/catalog. Record URL, review date and verified API ID in docs/model-research-*.md or the owning ADR. Distinguish verified facts from proposed role assignments and account access. Do not use model names from memory or equate “Meta” with only Llama. No blanket “latest” claim from a dated snapshot. Update config/examples/UI/docs together; no paid calls just for metadata verification.
Inline project rename is the default for simple naming changes: edit in place, Enter/blur commit, Escape cancel, IME-safe input, reject empty names and preserve failures. No rename modal.
