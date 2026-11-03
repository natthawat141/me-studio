# Collaborative creative agent and native model configuration

## Requested outcome
Push the latest app source, replace fixed video behavior with conversational collaboration, add discoverable slash commands and contextual visual choices, configure the actual Python chat model from a local env file, and provide searchable model visibility controls with thin neutral styling.

## Implementation
- Fixed-path private AppConfig, seeded official OpenAI IDs, provider-key presence, enabled model lists, native open/reload/toggle IPC, File menu and Files/settings controls.
- Composer selection travels to Python and is included in run identity/transcripts; OpenAI/OpenRouter endpoints remain host-owned.
- Optional `/style`, `/voice`, `/preview`, `/skills` discovery, clickable contextual choices and persistent HTML draft versions.
- Original declarative HTML/CSS/SVG → isolated screenshot → local verified MP4. Active native tool list excludes legacy save_animation; no mandatory cast, background, length or interview.
- Project skill enabled preferences and configured voice settings. Internal source/manifest files stay out of new chat artifact lists.

## Validation
- npm test: 67 passed; Python SDK: 4 offline tests passed, including a non-default GPT model on the actual request body.
- npm run lint, Next production build and npm run test:api passed.
- Chrome UI suite: 40 passed. A pre-existing stale close-panel accessible-name assertion was aligned with the current navigation label. Additional model-manager test confirms search/toggle, selected model payload, slash keyboard behavior and clickable response choices. Light/dark model settings screenshots inspected; screenshots wait for theme application.
- Python agent demo: real three-second typography HTML/CSS animation → H.264/AAC MP4, scripted provider and no speech call.
- Creative preview smoke: six active/external-content rejection cases; draft restored in a new production tool instance and rendered; voiced rendering without audio rejected. Preview inspected.
- Legacy offline agent demo passed. Native macOS arm64 build completed, frozen Python --check passed; reopened actual me studio app and observed Settings listing all seeded GPT models with the existing local key configured. User interacted with the live app during inspection; further UI actions were avoided.
- Existing authorized OpenAI/ElevenLabs setup was copied privately into userData/config.env, retaining GPT-6 Luna as default. Keys were never printed, put in renderer preferences or staged. No paid live inference/voice call was performed in this change; model entitlement and creative-quality acceptance remain unverified.
- Attachment analysis and imported-clip assembly are not part of implemented tools. Source HTML is not loaded in Electron's privileged DOM.
- Staged-source scan: about 2 MB, no oversized files; the only token-pattern hit is an intentional synthetic provider-error string in tests/fixtures/python-agent.py. Config, app data, build outputs and backups remain ignored.

## In-app provider editor follow-up

Added a password-only new-key form for OpenAI, OpenRouter, Meta and ElevenLabs. Existing keys are never returned to the renderer. Providers without keys show a connect action, not model switches; after saving, enabled model controls appear. Meta now has a fixed Python Responses endpoint and official Muse IDs. SDK tests cover selected Meta model and endpoint with synthetic HTTP, and UI tests cover missing Meta key → form → saved model list without browser-storage key persistence. Full UI suite remains 40 passed; unit suite 67 passed; native build and API checks passed.
