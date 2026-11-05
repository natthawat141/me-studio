---
name: screen-recording
description: Handle requests to record the me studio window or capture a product demo, distinguishing desktop recording from HTML screenshots and video rendering.
---

# Screen recording

Check actual host tools before promising a recording. The current me studio production tool set has no desktop screen-recording, microphone, camera or generic shell tool. This bundled guide does not install a recorder or grant OS access. Do not invent a recording, command result or output file. Explain the missing capture tool briefly when screen recording is requested.

For existing supported tasks, use capture_project_html for a PNG of a Project HTML file, save_html_animation for an original animation preview, and render_video for its MP4. These produce content; they do not record the app window. Publish only real generated-file IDs and use save_file_to_downloads when the user requests Downloads. Recording a demo is optional and must not interrupt ordinary animation production.

If a future trusted host exposes a recording tool, follow the user's authorized target, audio source, duration and destination. A request to record an app window does not authorize microphone/camera capture or other windows. Prefer window capture, hide credentials and unrelated conversations, and use a bounded recording. Reuse explicit authorization already given for that take; ask only for missing scope. Never change app configuration or permissions through a skill.

Finish recording before restarting or replacing the captured app. Require an actual file, verified duration/dimensions/full decode, and audible playback where sound was requested. An audio stream can contain silence. Clearly distinguish raw GUI footage from edited demonstrations and shorten waits transparently. Preserve raw takes and original generated media; deliver one finished demo within the requested time limit.

Maintainers: the tested macOS record CLI workflow is documented in docs/screen-recording.md in the application repository. CLI commands require a trusted operator outside the current product agent tools.
