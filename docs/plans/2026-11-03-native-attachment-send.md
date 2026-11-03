# Native attachment sends enter the Python agent

## Problem and scope

Sending a local file called attach() and returned before prepareSend()/sendProduction(). Both the brief and stored image appeared in chat, but no agent request occurred. Text-only sends worked. The native runtime also accepted only text, so removing the early return alone would still omit image contents.

## Change

- Route text plus local attachments through the same native connection/model checks. Disconnected sends retain draft and attached files. Browser/read-only sample responses remain labelled.
- Pass only opaque file IDs from UI to main; main resolves exact Project scope, verifies containment and bounds, and normalizes images. Maximum 10 references, 6 images at 250 KB each, 30,000 text characters total. Audio/video are explicitly view-only.
- Carry bounded media through the worker and private Node/Python JSONL. Python sends Responses input_image/input_text parts. Base64 never enters persisted transcript messages; request hashes include media. Image bytes have a separate bounded transport budget instead of exhausting the text context budget.
- Reattach the last user file references on later turns in that chat. The original files remain on disk. Model vision support is required; there is no fallback claiming a successful image analysis.
- Add an explicit resend action to old local-only/failed attachment messages, preserving the current composer draft. Do not automatically replay a user's request.

## Verification

- Reproduced the original missing-response failure before the fix with a fake native bridge; ChatFiles agentInputs and Python image-input regressions also failed before implementation.
- npm test: 69 passed. Includes cross-Project denial, image/text limits, external URL rejection, symlink replacement denial, actual 1.8 MB multimodal JSONL, transcript byte omission and media-aware replay conflicts.
- npm run agent:python-test: 5 passed; official SDK construction/stream tests use local synthetic endpoints.
- npm run lint, npx tsc --noEmit, npm run build and npm run test:api passed.
- PLAYWRIGHT_CHANNEL=chrome npm run test:ui after build: 43 passed, including images with briefs, follow-up references, explicit resend with draft preservation and disconnected draft/file retention.
- npm run agent:python-demo completed offline and rendered a real HTML/CSS MP4. npm run agent:demo completed offline.
- npm run desktop:build completed; bundled frozen Python --check reports sdk-ready. Reopened packaged Mac app, verified existing projects/messages/image references and the new resend button. User data was preserved; no user prompt was resent and no paid live provider request was made by this verification.

## Limits

This fixes request routing and actual image/text model inputs. It does not implement imported video/audio analysis, arbitrary uploaded-clip editing, or automatic insertion of an uploaded raster into authored HTML. A successful test provider does not establish a particular account/model's live vision entitlement.

## Reference

[OpenAI image inputs](https://developers.openai.com/api/docs/guides/images-vision) documents Responses input_image using a base64 data URL. The app holds credentials and file paths in the trusted host; renderer callers provide neither paths nor data URLs.
