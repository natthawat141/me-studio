# ADR 0004 — Local-first runtime before hosted SaaS

Status: selected direction for the local prototype; CLI renderer implemented. 2026-11-02.

The user selected a downloadable npm-based local version for a Meta hackathon. Prior hosted SaaS proposals remain a possible future direction; identity/database/credits/cloud workers are not prerequisites for this CLI slice.

Keep the current Next.js UI. Start by proving reviewed HTML plus timed audio renders to a validated real MP4 in a separate local Node process using existing Playwright tooling and system FFmpeg/ffprobe. Reuse first-party legacy animation/audio examples without claiming newly generated AI output. No new SDK, HTTP execution endpoint or paid call is introduced.

Project manifests explicitly list assets. Each job snapshots its input and writes to a new local UUID directory. A loopback server serves only those files; page networking to other origins is blocked. Provider secrets are excluded from browser/encoder child environments. This is a reviewed-input local tool, **not** a safe sandbox for arbitrary generated code. A container or browser context must not be claimed to solve that future isolation requirement.

CLI-first was selected to validate the renderer before creating UI operational states. Browser-only export would depend on an active tab and needs a different rendering pipeline. Cloud workers would add deployment/account/tenant work before testing the workflow. Desktop packaging may improve installation later but is not needed to prove the pipeline.

Next: verify competition requirements/current model documentation, then choose provider integration and an execution isolation model, local session protection and explicit cost controls before exposing paid operations in the studio. Disk-backed application projects, storyboard editing and UI-to-job integration are subsequent slices. Existing browser projects are preserved, with no automatic migration.

See [local setup and limitations](../local-development.md) and [implementation plan](../plans/2026-11-02-local-first.md). Runtime API usage is grounded in installed Playwright 1.64.1 types and local FFmpeg/ffprobe behavior; no model/pricing decision is made in this ADR.
