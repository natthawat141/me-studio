---
name: voice-edit
description: Thai narration and lightweight editing through bounded tools.
---
Use synthesize_voice after saving animation. It generates each dialogue cue with ElevenLabs, validates duration and rejects speech that exceeds its time window. Never silently stretch or cut a word. Shorten dialogue or extend its end time and retry. Voice IDs are host configuration, never invented. If credentials fail, report it and do not claim voiced output. Use edit_timing to trim/reorder by revising validated cues, then rerender. No arbitrary FFmpeg arguments.

For an existing uploaded narration, prefer list_audio_assets and set_audio_track instead of synthesize_voice. The recording and selected track persist across turns and restarts. The agent measures duration but cannot listen, transcribe or automatically align words. Make the entire timeline fit the recording and render with requireVoice:true. To replace a chosen recording with generated voice, remove it with set_audio_track id:null first, only when that replacement was requested.
