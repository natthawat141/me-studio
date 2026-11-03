# Video harness V1 delivery

Built on the existing published Pi agent core rather than an upstream desktop fork. Added bounded structured-scene compilation, project-local skills, ElevenLabs Thai speech, immutable HTML→MP4 output, trim, native credential-file selection and desktop chat integration. The worker owns model calls and SQLite scope; native main supplies directory grants. No environment file is packaged.

Actual evidence:
- CLI production completed with OpenAI GPT-6 Luna and ElevenLabs speech, then verified 8s H.264/AAC output.
- Native application connected via credential picker and generated an independent 8s MP4 through chat in Animation harness demo. Native ffprobe: 540x960, 24fps, yuv420p, H.264, AAC, 8.000 seconds, 214331 bytes.
- Initial native playback failed because studio-media was registered on the default Electron session. Registered it on persist:me-studio-v1, rebuilt, restarted, reopened the saved chat and obtained a fresh media grant. Native player loaded with enabled Play/volume/seek controls and no error message. A subsequent Play/screenshot automation timed out; continuous playback and native Save completion are not claimed as fully verified.
- A separate real local render + trim produced a new 7.8s MP4 with audio, preserving the full original.
- Lint and production build passed. 55 unit tests passed; 7 relevant UI flows passed, including live-bridge artifact persistence/refresh. Agent memory demo passed (offline scripted provider; distinct from live evidence).

The pipeline is a basic two-character Canvas cartoon compiler with three scene presets and timed dialogue, not arbitrary animation programming or a full imported-media editor. Live mode uses OpenAI only; Meta's existing adapter remains separate. Skills are creative references rather than executable permissions.
