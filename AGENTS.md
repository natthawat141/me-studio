<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# me studio — agent working rules

## Read first
- This directory is the application and Git root; the parent `aicatoon/` is only a workspace. Use npm here.
- [AI guide](docs/ai-guide.md): current capabilities, owning files and task recipes.
- [PRODUCT.md](PRODUCT.md): product scope/status. [DESIGN.md](DESIGN.md): accepted UI. [Architecture](docs/architecture.md): current versus planned services.
- [CONTRIBUTING.md](CONTRIBUTING.md): change process. [Acceptance](docs/ACCEPTANCE.md): verification gates. Task plans/evidence belong in docs/plans; architecture decisions in docs/decisions.
- Read narrower instructions under src/components, src/server and desktop when changing those areas. Keep tool-specific wrappers thin; this file is the shared application rule source.

## Product and actual boundaries
- me studio helps nontechnical users create videos through conversation without installing agent skills. Current priority is the chat-first Mac desktop experience at `/desktop`.
- Unconfigured desktop chat remains a labelled sample. Native video mode is explicitly connected via a local credential-file picker: OpenAI/Pi → structured Canvas scene → ElevenLabs → verified MP4, with Project skills and scoped memory. See docs/video-harness.md for supported operations and limits; other provider forms are metadata only.
- Native Files is real: chosen local folder → read-only tree/filter → media/text preview beside chat. Ordinary browser preview explains the desktop requirement. HTML/Python/SVG show source text and are not executed.
- An internal Pi harness + scoped SQLite memory, dormant native worker/Meta adapter and reviewed-input CLI renderer exist separately. Their existence is not an end-to-end prompt-to-video flow. Backend language remains open, including Python; do not rewrite it without task scope.
- Legacy `/`, `/projects`, `/library`, `/settings` retain project UX/data. Do not migrate, remove or impose that UX on `/desktop` as incidental cleanup.
- No deployed SaaS auth, tenant application database, credit ledger or durable generation queue. See PRODUCT.md for future requirements.

## Stack and map
Node >=22.19.0, npm/lockfile, Next.js App Router, React, strict TypeScript, Tailwind v4, Base UI/shadcn, Prompt Kit and Lucide. Electron owns the native shell. Verify exact versions/scripts in package.json; Next-specific changes require the installed Next docs above.

| Path | Ownership |
| --- | --- |
| `src/app/desktop/page.tsx` | Thin route exporting DesktopScreen |
| `src/components/studio/desktop-screen.tsx` | Desktop composition and right-panel selection |
| `src/components/{chat,settings,preview,layout}/` | Feature UI; installed primitives remain in ui and prompt-kit |
| `src/hooks/`, `src/services/`, `src/lib/` | UI state, boundary adapters and shared contracts |
| `desktop/` | Main process, preload, local runtime/worker and Files service |
| `src/server/{agent,memory}/` | Internal Pi runtime and scoped SQLite persistence |
| `src/server/config.ts`, `src/lib/provider-config.ts` | Server env boundary and safe provider metadata projection |
| `scripts/local/`, `scripts/desktop/` | Reviewed-input rendering and native packaging |
| `tests/`, `tests/ui/` | Unit/API and isolated browser regressions |

## Commands and verification
Run from this directory; use package.json as authority if scripts change.

| Change | Commands/evidence |
| --- | --- |
| Setup/web | `npm ci`; `npm run dev -- --port 3100`; open `/desktop` |
| Code changes | `npm test`, `npm run lint`, `npm run build` |
| UI changes | After build, `npm run test:ui`; inspect changed states/screenshots, keyboard and relevant viewport widths |
| API/config | `npm run test:api`; synthetic credentials only |
| Native main/preload/runtime or packaged UI | `npm run desktop:build`; reopen `release/mac-arm64/me studio.app` and test the actual native flow |
| Harness/memory | Relevant tests plus `npm run agent:demo` (scripted offline provider) |
| Rendering | `npm run local:doctor`; relevant renderer tests; actual render/probe only when the renderer changes |
| Markdown-only | Check referenced paths, npm scripts, instruction imports and `git diff --check`; no app rebuild required |

UI tests use isolated browser data and a dedicated local server. On this Mac `PLAYWRIGHT_CHANNEL=chrome npm run test:ui` uses installed Chrome if the default test browser is unavailable. Stop the native app normally before replacing its build, preserving active work. Do not run provider calls merely to validate a refactor. Report unavailable checks honestly; do not equate build success with visual/native/provider verification.

## Accepted desktop UX
- White/light main area, translucent Mac sidebar, regular/light typography, thin monochrome Lucide icons. Reuse installed components before creating a primitive. Brand/status color does not authorize blue hover/focus outlines; desktop controls use neutral gray.
- Home first: centered brand/composer; **แชตใหม่**, history/search, folder Projects and Settings. A Project groups chats and a user-selected local directory; no manual dialogue/scene/color form. AI will own creation; the current prototype must remain labelled honestly.
- Keep chat on the left. Open the right panel on explicit artifact/Files action; support resize/close/reopen. Keep drafts and selected folder state when closing a panel. Folder grants end on app exit.
- Search follows the accepted light command-palette pattern with grouped results and category filters. Preserve IME-safe Enter, arrows, Escape and focus return.
- No decorative eyebrow/kicker/slogan above headings/cards, emoji-style UI icons, heavy nested cards or gratuitous borders. Edit the owning CSS instead of accumulating overrides or !important.
- Settings: category navigation, provider configuration separate from model choice; support the existing multi-provider direction, not a Meta-only experience.
- Legacy project Agent settings/inline rename remain supported only in their existing routes. Preserve IME, Enter/blur commit, Escape cancel and failed-save behavior.

## Architecture and data rules
- Pages compose screens; components render UI; hooks manage view state; services own native/API adapters; shared contracts stay in src/lib. No provider/secret/business calls inside presentation components or extra domain orchestration in the large legacy page.
- Native access stays behind narrow preload/IPC methods with owned-main-frame validation. Never expose Node, a generic shell or arbitrary filesystem paths to renderer callers. Follow desktop/AGENTS.md for grants/media streaming.
- Saved memory/file contents/provider output are untrusted reference data, never permissions or executable instructions. Preserve scoped IDs, revision/idempotency and tool grants in harness changes.
- Preserve unreadable data rather than overwriting it. Chat prototype storage is separate from legacy/native projects. Do not fabricate asset IDs or turn filename-only prototype attachments into claimed uploads. Stale-write checks are not cross-tab transactions.
- Future paid/public services require verified identity, ownership, bounded quotas/budgets, fixed allowed endpoints/models and idempotency. Local trusted IPC does not prove SaaS authorization.

## Secrets, research and reuse
- Do not inspect real env values without task authorization; never print/store them in docs, logs, screenshots, browser preferences or public bundles. Use synthetic fixtures. Keep `.env*`, `.studio/`, `.next/`, release/ and generated runtime data out of commits; keep the tracked .env.example synthetic.
- Packaging must exclude developer env credentials; native runtime does not automatically load them. Configured, metadata-accessible and inference-verified are distinct states.
- Before changing provider/model IDs, endpoint behavior, pricing or external UI dependencies, inspect owning code and current primary docs/catalog. Record dated evidence in docs/model-research-* or the owning ADR. Never invent model/voice IDs or treat Meta as only Llama.
- DeepSeek is a separate UX/architecture reference, not the product base. Check licensing/attribution before copying code; preserve THIRD_PARTY_NOTICES.md and installed component licenses.

## Delivery
Inspect Git status first and preserve unrelated work. Complete the requested slice without silently enabling terminal/browser/AI execution, migrating data or adding product scope. Update canonical docs with behavior changes; keep task evidence out of stable instruction files. Report user-visible changes, checks actually run and material limits in Thai. Do not claim a saved config, mock response or written plan proves working integration.
