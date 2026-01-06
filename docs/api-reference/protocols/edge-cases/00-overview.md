# Edge Cases & Resilience — Overview

This section documents edge-case behaviors observed or implied by the production code.

Scope:
- A2A task lifecycle robustness
- Supabase/Redis outages
- timeouts and retries
- partial failures (persist vs compute)

Key production references:
- A2A task manager (timeouts, retries, redis-only fallback): `packages/a2a-adapter/src/TaskManager.ts`
- Conversation persistence “best effort”: `packages/universal-agent/src/api/RESTAPIGateway.ts`

Principle:
- Prefer returning a correct response even if persistence/analytics fails.
