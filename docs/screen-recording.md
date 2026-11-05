# Recording a me studio demo

This is an operator workflow tested on macOS with [record CLI](https://github.com/atacan/record) 0.2.1. It is separate from the product agent's production tools. The app bundles the [screen-recording guide](../skills/screen-recording/SKILL.md) as a Project reference; that guide does not give the agent screen, microphone, camera or shell access.

Use this workflow for an explicitly requested screen capture or demo. Establish the window, audio source, bounded duration and destination from the request. Existing explicit authorization applies to the same take; do not repeatedly ask. Microphone and camera need their own scope. Inspect the installed `record screen --help` before using version-sensitive options. The installation is `brew install atacan/tap/record`; check for an existing executable first. macOS Screen Recording permission is required.

## Capture

Use `record screen --list-windows --json` to find the current me studio window ID. Do not reuse an ID after reopening the app. Bring the app forward with the available GUI automation tool, close pending native pickers and hide credentials/unrelated conversations. Capturing a window in the background does not guarantee that clicks or typing reach it.

The following shell example uses a placeholder ID; replace it with the observed window ID. Choose a fresh output directory instead of overwriting a previous take.

```sh
demo_dir="$HOME/Movies/me-studio-demo-take"
mkdir -p "$demo_dir"
record screen --window WINDOW_ID --duration 600 --audio system --codec hevc --fps 24 --scale 0.6666667 --max-size-mb 800 --output "$demo_dir/raw.mov" --json
```

Use `--audio none` for a silent capture. `--audio system` records app/system playback, not microphone narration. When launched in a PTY, send `s` to stop cleanly, `p` to pause and `r` to resume; retain the duration bound. Before a long take, record a short test and verify the desired audio and framing. Do not silently broaden to full-display capture if the selected window fails.

**Stop and finalize the capture before closing, restarting or rebuilding me studio.** Closing the captured window caused `SCStreamErrorDomain -3808` and an unfinished MOV in a previous attempt. Keep the app alive until the recorder exits and its file can be probed.

## Verify and deliver

```sh
ffprobe -v error -show_entries format=duration:stream=codec_type,codec_name,width,height -of json "$demo_dir/raw.mov"
ffmpeg -v error -i "$demo_dir/raw.mov" -f null -
ffmpeg -hide_banner -i "$demo_dir/raw.mov" -vn -af volumedetect -f null -
```

A valid AAC stream does not prove sound: one test take contained silence throughout despite visible playback. Check levels and listen to the relevant passages. Inspect opening, middle and ending frames for readable UI and accidentally captured private content. Check the final edited export again, not just the raw take.

For a competition demo, preserve actual GUI interactions and original generated media. Clearly label shortened generation waits and any inserted output showcase. Keep the final runtime below the submission limit; the raw capture may be longer. Export broadly playable H.264/AAC MP4 into the user's requested folder, use a fresh filename and return a link to the verified file. Do not upload or submit unless separately instructed.

For the completed English Meta demo, the final file is `~/Downloads/me-studio-Meta-Demo-English.mp4` (169 seconds). Raw takes, the edit script and timeline ledger are under `~/Movies/me-studio-meta-demo`. These are local evidence locations, not required application dependencies or files to bundle.
