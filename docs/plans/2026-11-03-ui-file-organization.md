# UI File Organization Implementation Plan

> Execution: native in the current session, within the user's authorized folder cleanup. No new dependencies, UI redesign, or changes to the separate DeepSeek evaluation.

**Goal:** Make `src/components` navigable by page/feature and keep App Router pages as route entrypoints.

**Architecture:** Group UI under `src/components/{studio,projects,library,settings,auth,preview}` and shared UI under `{layout,chat,media,ui}`. Keep styles beside their owning component, preserve component props/client directives and every existing URL. Screen extraction relocates existing code without changing state, storage or behavior.

**Tech Stack:** Existing Next.js 16.4.3, React 19.3, TypeScript, npm, Base UI/shadcn.

**Spec:** User requests a clean component/page organization; root AGENTS.md, DESIGN.md and CONTRIBUTING.md apply.

## Global Constraints

- Preserve existing uncommitted harness/renderer work and browser data.
- Keep `components/ui` and shadcn aliases unchanged.
- No provider calls, dependency changes, new copy, or decorative labels.
- Keep feature CSS imports relative and move each stylesheet with its owner.

## Review Focus

- Broken imports after moves: lint, production build and search for old paths.
- Client/server boundary changes: preserve `use client` on extracted screens and run build.
- Missing styles: verify relative CSS imports resolve and run build.
- Shared component regressions: retain exports/props and run existing tests, including UI regressions.
- Lost routes/data: preserve all route filenames, storage keys and screen bodies; compare moved source and inspect route output.

## Tasks

- [x] Move components and styles into their page/shared folders; rewrite direct imports without compatibility stubs.
- [x] Extract Studio, Projects, Library, Settings and Components Preview screens; keep existing login/register composition and make other `page.tsx` files route-only exports.
- [x] Update the README/architecture code map with concrete ownership.
- [x] Run `npm test`, `npm run lint`, `npm run build` and existing UI checks; inspect the final diff and file tree. No new implementation-mirroring tests are needed for file moves.

## Verification

- Verified 15 relocated component/style files and five extracted screen bodies match their pre-move content, allowing only import paths and screen export names to change.
- `npm test`: 43 passed, zero failed.
- `npm run lint`: exit 0.
- `npm run build`: exit 0; all existing app/API routes retained.
- `PLAYWRIGHT_CHANNEL=chrome npm run test:ui`: eight passed, including rename persistence/failure/IME, project-scoped Agent settings, playback preservation, mobile focus and tablet overflow.
- Inspected generated Agent settings screenshots at desktop 1440×900 and mobile 390×844; existing layout and styling render correctly in these states.
- No obsolete flat component imports remain; `git diff --check` passes. Existing unrelated changes remain uncommitted and untouched by this cleanup.
