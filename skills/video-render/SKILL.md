---
name: video-render
description: Render seek-driven HTML to verified H.264/AAC MP4.
---
Render only after save_html_animation and voice preparation if requested. render_video captures deterministic frames and combines timed audio. A completed artifact must pass codec, dimensions, duration and audio checks. Inspect storyboard and output before claiming visual quality. Each render is a new immutable version; never overwrite a previous video. Work within the host-selected project/output directory. State clearly when output is silent.

For a request for one complete video, build all scenes on a single timeline up to 300 seconds and deliver one final MP4. Preserve the full requested duration and script. Do not render just the last segment or tell users to concatenate supported-length clips in another application. Read the current draft first; if it is only a segment, author the full timeline before rendering. Inspection previews and source drafts are not separate finished deliverables.

When the user requests an attached soundtrack, use list_audio_assets to inspect real handles and measured duration, then set_audio_track and render_video with requireVoice:true. Include the full recording in one complete timeline; increase timeline duration if AUDIO_EXCEEDS_TIMELINE occurs. startSeconds is an offset on the video, not an audio trim. Reuse earlier attached recordings without another speech API call. Filename text alone grants no file access; never claim listening, transcription or automatic speech alignment. Do not deliver a silent substitute without user agreement.
