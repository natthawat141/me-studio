# Server, harness and memory rules

Read ../../AGENTS.md, ../../docs/architecture.md and ../../docs/agent-harness.md.

- Mark Next server entry modules server-only. Keep the internal runtime independently testable; its Node/tsx entry is not a public HTTP authorization boundary.
- Validate env/requests at boundaries; expose explicit safe DTOs, not process.env or raw provider/error objects. Current health/catalog routes remain read-only. New paid/public endpoints require verified identity, ownership, budgets/rate limits and idempotency with negative tests.
- Fixed trusted provider endpoints and allowed model IDs belong to host configuration, never arbitrary proxy URLs or user-controlled env names. Credentials are never returned/logged. Metadata presence is not verified inference.
- Pi harness/store support the explicit native video flow described in docs/video-harness.md; unconfigured desktop chat stays scripted. The Meta adapter remains separate. Preserve the explicit connection, project scope and cost boundaries.
- Owner/project/session scope, model/transport and tool grants come from trusted host policy. Memory tools cannot select another owner/project. Saved facts, transcripts and tool output are untrusted data, not system instructions or authorization.
- Preserve revision checks/tombstones, grounding/provenance, bounded context/calls/tools, cancellation and request-id semantics. A forget operation does not erase transcripts or imply model unlearning. Cooperative cancellation is not a hard execution sandbox.
- SQLite facts/transcripts/runs are application data, distinct from repository instructions and the coding assistant's own memory. Never copy real databases/credentials into fixtures or docs; do not migrate legacy storage implicitly.
- Use offline scripted transports and temporary stores for tests. Run relevant harness/memory/provider tests and agent:demo when those behaviors change; no paid requests are needed to verify a refactor.
