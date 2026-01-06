# Protocols — API Reference Index

This folder contains protocol-level documentation for Storytailor.

## Protocols

- **A2A (Agent-to-Agent)**: `a2a/`
- **REST**: `rest/`
- **MCP (Model Context Protocol)**: `mcp/`
- **Internal / Admin**: `internal/`
- **Edge Cases & Resilience**: `edge-cases/`

## Protocol comparison

| Protocol | Transport | Primary Use | Streaming | Async Jobs | Auth | Primary Response Shape |
|---|---|---|---|---|---|---|
| A2A | HTTP + JSON-RPC 2.0 | Partner agent integration | SSE (`/a2a/status`) | Tasks (`/a2a/task`) | API key / Bearer JWT (implementation-dependent) | JSON-RPC envelope + Task |
| REST | HTTP JSON | Customer API | (not currently) | (not currently) | Bearer JWT | `{ success, data }` variants |
| MCP | stdio | AI assistant tooling | n/a | n/a | local process env | `{ content: [{ type: 'text', text }] }` |

## A2A — Entry points

- `a2a/00-overview.md`
- `a2a/01-authentication.md`
- `a2a/02-discovery.md`
- `a2a/03-messaging.md`
- `a2a/04-task-delegation.md`
- `a2a/05-task-status.md`
- `a2a/06-webhooks.md`
- `a2a/07-error-catalog.md`
- `a2a/08-complete-examples.md`
- `a2a/09-sdk-guides.md`

## REST — Entry points

- `rest/00-overview.md`
- `rest/01-authentication.md`
- `rest/02-health-endpoints.md`
- `rest/03-story-endpoints.md`
- `rest/04-character-endpoints.md`
- `rest/05-conversation-endpoints.md`
- `rest/06-library-endpoints.md`
- `rest/07-user-endpoints.md`
- `rest/08-commerce-endpoints.md`
- `rest/09-analytics-endpoints.md`
- `rest/10-error-catalog.md`
- `rest/11-rate-limiting.md`
- `rest/12-pagination.md`
- `rest/13-complete-examples.md`
- `rest/14-sdk-guides.md`

## MCP — Entry points

- `mcp/00-overview.md`
- `mcp/01-protocol-spec.md`
- `mcp/02-tool-definitions.md`
- `mcp/03-request-response.md`
- `mcp/04-fieldnotes-tools.md`
- `mcp/05-integration-examples.md`

## Internal / Admin — Entry points

- `internal/00-overview.md`
- `internal/01-health-diagnostics.md`
- `internal/02-admin-operations.md`
- `internal/03-monitoring-endpoints.md`

## Edge cases — Entry points

- `edge-cases/00-overview.md`
- `edge-cases/01-timeouts.md`
- `edge-cases/02-concurrency.md`
- `edge-cases/03-partial-failures.md`
- `edge-cases/04-circuit-breakers.md`
- `edge-cases/05-retry-strategies.md`
- `edge-cases/06-degraded-mode.md`

## Quick references

### HTTP status codes

See `rest/10-error-catalog.md`.

### JSON-RPC + A2A error codes

See `a2a/07-error-catalog.md`.
