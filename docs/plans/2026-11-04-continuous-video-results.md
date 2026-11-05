# Continuous video and duplicate chat results

## Problem and scope

A 127-second brief was split because the creative tool schema and instructions limited drafts to 60 seconds although the underlying renderer already supports 300. Rendering the last saved segment could deliver only 27 seconds. Preview PNGs also arrived through both previews and resultFiles; video files and final artifacts could create duplicate players.

## Changes

- Creative drafts now support the renderer's existing 300-second bound. Host instructions and bundled skills specify one complete timeline and final MP4 for a complete-film request, including multiple scenes and the full requested duration. The assistant must inspect an earlier segment before treating it as a complete film. No duration parsing heuristic, arbitrary code execution, higher paid-call budget or audio-analysis capability was added.
- Main deduplicates registered returned file IDs. Transcript rendering normalizes repeated identities in saved messages, preserves distinct file versions and Project scopes, and suppresses a second player for a file already represented by its artifact. No stored conversations/files are deleted.
- Existing Project-customized skill documents are preserved; host guidance applies independently.

## Verification

- Confirmed the original 127-second draft fails schema validation before the fix.
- Encoded a synthetic 127-second, 320x320, 24fps HTML/CSS video through production save/reopen/render. Verified one MP4, ffprobe duration, red/green/blue scenes at 0/63/126 seconds, and rejection above 300 seconds. Passed in 159 seconds. This is renderer correctness evidence, not creative acceptance or audio synchronization.
- File normalization unit tests passed for repeated PNGs, video/artifact overlap, distinct versions and Project scopes.
- TypeScript, lint and whitespace checks passed before packaging. Browser/native verification recorded below as completed.

## Delivered package

- Browser regression passed against the production build: repeated saved PNGs display once, a final video has one inline player, and distinct earlier attempts remain available as compact links under Earlier video versions. File/version records are retained.
- Next build/TypeScript, lint, three media normalization tests and the encoded 127-second regression passed. No additional paid model call was needed for this change.
- Packaged the current staged worker and UI, verified worker byte identity, replaced the old release after a normal GUI quit, and reopened release/mac-arm64/me studio.app.
- In the actual existing GitLab chat, confirmed one initial preview instead of two and one final inline player with two earlier video attempts in a disclosure. Existing short MP4 files remain short; they were not automatically regenerated or concatenated. Uploaded soundtracks remain view-only for the agent.
- Removed the superseded release build after the updated application opened successfully. User projects/conversations/output were preserved.
