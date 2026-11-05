# Screen-recording skill handoff

Request: retain the tested recording skill and make its guidance available to me studio.

Added an original `skills/screen-recording/SKILL.md`, registered it with the Project skill loader and reused the registry for toggle validation. Existing Projects receive the new reference on their next production initialization; project-authored skill contents are preserved. The guide explicitly separates HTML capture/rendering from desktop screen recording. No OS capture tool, shell or new permissions were added to the product.

Saved the operator recipe in `docs/screen-recording.md` and linked it from the installed Codex record skill through a new local reference. Corrected that existing skill's unquoted YAML description so the skill validator can parse it. The recipe preserves actual lessons from the demo: bounded window capture, stop before app restart, verify sound rather than only AAC presence, preserve raw takes and save final output to the requested folder. It uses installed record 0.2.1 help as the command reference and links the upstream tool; upstream implementation code was not copied.

Validation: the two new regressions failed before registration, then passed. They cover upgrading existing projects, preserving custom guides, discovering/enabling/disabling the reference and retaining the absence of generic recording/shell tools. Full npm test passed 102/102 with no skips; lint passed. Both skill entrypoints passed quick_validate using the existing project Python environment. Local documentation links resolve; git diff --check passed.

Full desktop build passed. The packaged skill matches its source SHA-256 and the packaged worker contains its registration. Reopened the current native bundle and observed the ready composer with the configured Meta model; no paid inference was requested for this change. Native UI automation subsequently returned noWindowsAvailable while checking the sidebar, so Project history preservation was not re-verified through GUI in this pass. No user conversations, drafts, original media or credentials were edited.
