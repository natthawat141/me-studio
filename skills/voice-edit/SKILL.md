---
name: voice-edit
description: Thai narration and lightweight editing through bounded tools.
---
Use synthesize_voice after saving animation. It generates each dialogue cue with ElevenLabs, validates duration and rejects speech that exceeds its time window. Never silently stretch or cut a word. Shorten dialogue or extend its end time and retry. Voice IDs are host configuration, never invented. If credentials fail, report it and do not claim voiced output. Use edit_timing to trim/reorder by revising validated cues, then rerender. No arbitrary FFmpeg arguments.
