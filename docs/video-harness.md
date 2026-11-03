# Local video harness V1

Pi 1.4 owns the bounded model/tool loop. The host owns local Project directory grants, OpenAI GPT-6 Luna transport, SQLite session memory, skills, the deterministic HTML compiler and FFmpeg. Original archive files are references and remain intact.

## Actual tools

- read_video_skills: reads four bounded Project reference files, never grants permissions.
- save_animation: validates a storyboard with two characters, 3–30 sec, portrait/landscape, city-night/day-park/office backgrounds, timed dialogue and idle/wave/walk actions. Compiles host-owned Canvas HTML exposing seek(ms). Strings cannot inject executable code.
- synthesize_voice: ElevenLabs eleven_v3 Thai speech; caps calls, checks duration against each cue, reports errors rather than silently claiming audio.
- render_video: one immutable render per request; H.264 yuv420p/AAC at 24fps, 540x960 or 960x540. Snapshots inputs and verifies output with ffprobe.
- trim_video: trims the current rendered output to validated seconds, preserving audio, producing a new MP4. It does not accept arbitrary shell/FFmpeg arguments or paths.

Project skills live in `.me-studio/skills/{storyboard,html-animation,voice-edit,video-render}/SKILL.md`; initialization preserves overrides and rejects symlink escapes. Defaults are in the application's skills directory. These are runtime creative references, distinct from repository AGENTS.md and the assistant's private memory. Existing scoped SQLite memory remains in native userData, with Project/session identity set by the host.

## Try it

`npm run video:produce -- /absolute/path/to/a/project "สร้างการ์ตูน 8 วินาที..."`

CLI loads the existing ignored app `.env.local` explicitly. It needs OPENAI_API_KEY and optionally ELEVENLABS_API_KEY. Never copy env into packaged assets.

Desktop: select/create a folder Project → Settings → AI providers → เชื่อมต่อ AI สร้างวิดีโอ → choose the local env file in the native picker. Keys remain worker-memory only and must be loaded again after restart. OpenAI is selected explicitly. Send a brief in that Project. The artifact opens in the right player; Download MP4 opens a native Save dialog. Original sample conversations are retained and unconfigured mode stays clearly labelled as a prototype.

Source and output roots come from the native Project registry, never tool arguments. Output versions are written beneath the configured output folder. Artifact IDs are persisted in native userData and resolved to fresh scoped media URLs on reopen; native Save uses that registry rather than renderer paths. Generation is one local request at a time, cancellable; API/model/tool limits bound work. This local app is not a multi-tenant SaaS service.

## Evidence / limits

2026-11-03: actual OpenAI/Pi tool loop → ElevenLabs Thai audio → 8-second MP4 completed. The run used 5 model calls, 4 tool calls, reported 982 input and 393 output tokens. Output was probed and 8 representative frames including the ending were inspected; this is a basic template cartoon, not arbitrary animation-code generation. Full speech intelligibility and native end-to-end verification should be reported separately.

V1 edits structured scenes and trims generated clips. Arbitrary Python/shell, arbitrary generated HTML execution, imported clip assembly, lip-sync phonemes, multi-track editor and cloud sync are not implemented. Source attachments remain filename-only prototype data and are rejected by the live flow rather than claimed as uploaded.
