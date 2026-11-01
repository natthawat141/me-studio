# Project Agent settings panel plan

Goal: replace the composer paperclip with a gear opening project-scoped settings in the right workspace region.

1. Add a validated AgentSettings contract with legacy-safe defaults: confirmation policy, optional chat override, image/video aspect ratios and output counts. No invented image/video model names.
2. Store optional settings in Project; preserve legacy records and include an immutable snapshot in mock chat requests. Paid approvals remain server-authoritative; paid-only confirmation may skip free work only.
3. Compose an accessible neutral settings panel with labelled radio controls, server/catalog chat options and a close/done action. Save changes through the workspace repository; report errors instead of claiming success.
4. Replace the paperclip action with a gear. Preserve plus-import and existing attached-file chips. Right panel switches between settings and video; video remains mounted/paused so its position survives. Close restores only a video previously visible. Keep the shared resize behavior; mobile settings use a dedicated overlay with focus containment.
5. Update product/agent/design rules for the explicitly requested settings exception to the video-only region. Test per-project isolation, refresh persistence, defaults/validation, snapshot inclusion, video restoration, Escape/focus and mobile access. Run tests/lint/build/API and inspect screenshots.
