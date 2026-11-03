# Composer images and responsive file headers

- Root cause of native traffic-light overlap: expanded preview panels were fixed at viewport inset 0. Both expanded viewers now start beneath the 48px global navigation. Breadcrumb filename has a shrinkable area; the close/action controls remain fixed-size.
- Composer image files get revocable browser object URLs immediately, with 80px thumbnails, remove actions, overflow scrolling and clipboard-file paste. Per-chat draft isolation is preserved. Source SVG is not rendered as an image.
- Sent native image attachments use compact thumbnails above their text bubble. Existing name-only messages have no image bytes and require reattachment.
- Browser checks: image decode before sending, draft switching, paste, remove, and 390px composer overflow; expanded Files at 1440/980/390px, header below navigation, filename/actions separation and visible hit target. Inspected both screenshots; fixed a mobile sidebar stacking overlap found during visual review.
- Build/lint passed; related UI coverage passed (14 tests across focused runs). No provider calls or backend behavior changes.
- Waited until the user's pending image attachment was sent and visible as a saved local image before restarting/updating the native UI. Native userData and chat/media history were preserved.
