# Conversational video harness

me studio is a creative collaborator. The user supplies intent and references; the agent discusses, clarifies consequential unknowns, suggests reasoned choices and executes when asked. There is no universal interview, forced approval wizard, default eight-second clip, fixed cast or preset background.

## Native configuration

The File menu, top navigation, Files header and Settings → AI providers can open `config.env` in the application userData directory. It is a private local file (0600), excluded from source and packaging. Existing credential-file import remains available on older preview UI; new native configuration reloads on focus, explicit refresh and before sending. Neither keys nor config contents are sent to the renderer. Presence of a key is not verified account access.

An in-app connection form accepts a new API key without reading an existing key back into the renderer. Unconfigured providers show a key-entry action; their model switches appear after saving. `OPENAI_API_KEY`, `OPENROUTER_API_KEY` and `META_API_KEY` enable their respective model groups. Native OpenAI defaults include GPT-6 Luna, GPT-6.1 Sol, GPT-6.1 Terra, GPT-6 Astra and GPT-6 Sol. Settings search/toggles persist enabled flags in the file. Only enabled models with a provider key appear in the composer. The selected provider/model travels through the trusted host to Python; fixed endpoints are not renderer-controlled. OpenRouter model IDs are explicitly added via `STUDIO_CHAT_MODELS`; model/tool support varies by provider. Native Meta also uses a fixed Responses endpoint; Muse Spark/Wonder IDs are seeded. Contributor rows state their data-training mode. Custom forms in legacy web routes are separate.

`STUDIO_DEFAULT_CHAT_PROVIDER`, `STUDIO_DEFAULT_CHAT_MODEL`, `STUDIO_OPENAI_MODELS`, `STUDIO_CHAT_MODELS`, `ELEVENLABS_API_KEY`, `STUDIO_SPEECH_VOICE_ID`, `STUDIO_SPEECH_MODEL`, `STUDIO_SPEECH_LANGUAGE` configure native operation. Model entries are `{id,label,enabled}`. The browser catalog has a separate schema; do not copy native enabled flags into legacy web env lists.

## Conversation and tools

- `/style`, `/voice`, `/preview`, `/skills` are discoverable by typing `/`. Arrows/Enter choose a command without sending it; IME/repeated Enter remain protected. Natural language is equally valid.
- `present_options` displays a contextual question and clickable choices. Users can select, mix or reject them in ordinary chat. Choosing a card preserves an existing text draft.
- `save_html_animation` creates original declarative HTML/CSS/inline SVG with CSS keyframe animations, then returns a real screenshot in chat. No fixed character, background, composition or duration is imposed. The model does not author executable JavaScript.
- `read_current_animation` exposes the latest draft or a numbered earlier version. Up to 20 versions are retained per conversation in the Project's internal skills directory. Choosing a previous direction must restore that version, rather than continuing the most recently generated comparison.
- `read_video_skills` loads bundled/project references and enabled status. `set_video_skill` changes project-specific skill preferences when requested. Skills do not grant tool/file permissions. Existing project overrides are preserved.
- `synthesize_voice` uses the configured ElevenLabs voice/model/language. It refuses missing keys, missing narration and speech exceeding its cue; failures must not silently become narrated output.
- `render_video` renders verified H.264/AAC MP4 locally. One render per request; current creative limit is 60 seconds, 320–1280 even pixel dimensions and 24 fps. This is a technical bound, not an eight-second product default.
- `save_animation` and its two-character Canvas schema remain only as a legacy test/CLI compatibility path. They are excluded from the active native agent tool list.

The host parses HTML in an inert document and rejects active elements/handlers and external resources. A trusted seek implementation advances CSS animations. Chromium runs outside the privileged Electron UI with sandboxing, blocked networking and no downloads/service workers; the existing FFmpeg path snapshots explicit inputs. This is not a general shell/Python/JavaScript execution service.

Conversation can start in Default workspace without creating a Project. Folder Projects retain their scoped local output. Ordinary discussion creates no animation version directory. Only produced preview images and the final video are presented in chat; manifests/source/working notes remain in Files.

## Verification and limits

See [implementation evidence](plans/2026-11-03-creative-config.md). The Python demo now authors a typography-based HTML animation and renders a real three-second MP4 with an offline scripted provider. Creative smoke checks reject active/external HTML and restore a draft across requests before rendering. These checks do not measure creative quality or verify live provider entitlement. API keys remain local and provider error bodies remain private.

Native image/video attachments can be stored and viewed inline. Model analysis of those attachments, arbitrary imported-clip assembly, external image search, phoneme lip-sync, a multitrack editor, cloud sync and arbitrary generated-code execution remain unimplemented. The available tools must be described honestly by the agent.
