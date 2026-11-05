# me studio

me studio is a local-first Mac prototype for creating motion graphics through conversation. Describe an idea, discuss a direction with the assistant, preview a still or animation, and render a short MP4 on your own computer. You do not need to install creative agent skills separately.

## What works today

- A chat-first Electron app for macOS Apple Silicon, with local folder Projects and chat history.
- A Python Deep Agents runtime using an explicitly configured AI provider. A trusted Node process owns project access, rendering, and local memory.
- Project-scoped HTML/CSS/SVG animation, still-image preview, local MP4 rendering, and playback in chat or the side panel. The agent can inspect output frames and make bounded revisions.
- Optional ElevenLabs speech with a configured key and voice. AI-written HTML is validated and rendered in an isolated environment; arbitrary JavaScript, shell commands, and Python execution are not supported.

This is a prototype, not a general-purpose video editor or hosted service. Individual renders support up to 300 seconds in one continuous timeline. Rendering remains subject to the request time budget. Uploaded MP3/WAV/M4A/OGG can be measured and included as a soundtrack in the final MP4, including recordings attached earlier in the conversation. The agent cannot listen to, transcribe, or automatically synchronize words/beats; video attachments remain view-only. Video quality and provider availability depend on the selected model; generated content must be reviewed by the user. There is no cloud sync, payment system, or durable background job queue.

## Try the desktop app

The currently supported development build targets macOS Apple Silicon. It is unsigned and has not been verified as a general installer for other machines. From this directory, with Node.js >= 22.19 and Python >= 3.11 installed:

```sh
npm ci
npm run agent:python-setup
npm run desktop:build
open 'release/mac-arm64/me studio.app'
```

The packaged app includes its own runtime, browser, FFmpeg, and frozen Python agent. The build machine needs the tools above; end users should not need to install Python separately. In the app, open **Settings → AI providers**, add a provider key, and enable a model available to your account. Select the model in the chat composer. Provider API usage may incur charges. Keys are stored in the app's local configuration, not bundled in the release; avoid sharing `config.env`.

Create or select a Project folder, describe the result you want, and ask the assistant to create a preview or short video. Existing output remains in the selected Project folder. Saving a key is not proof that the selected model is available or that a paid request will succeed.

Use the folder icon beside a chat file or in its preview header to **Show in Finder**. **Save a copy…** offers **Save to Downloads** directly or **Choose another folder…** through the native folder picker. Originals stay in the Project. You can also ask the assistant to save an existing generated file to Downloads; it copies the real file and numbers duplicate names instead of overwriting them. Other destinations are selected through the native destination-folder picker. HTML copies contain the source file, not a bundle of its relative image dependencies.

## Development and verification

```sh
npm run dev -- --port 3100   # browser preview at /desktop
npm test
npm run lint
npm run build
npm run agent:python-test
npm run agent:python-demo   # offline scripted model and actual render
```

The browser preview does not provide the full native file and agent bridge. `agent:python-demo` uses an offline scripted model; it is not evidence of live AI quality or provider access. Local rendering tools and prerequisites are documented in [local development](docs/local-development.md).

See [video harness](docs/video-harness.md), [Python runtime](docs/python-agent-runtime.md), [architecture](docs/architecture.md), and [hackathon readiness plan](docs/plans/2026-11-04-hackathon-readiness.md) for details and current verification limits. Coding agents should start with [AGENTS.md](AGENTS.md) and [the AI guide](docs/ai-guide.md). Third-party licenses are listed in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
