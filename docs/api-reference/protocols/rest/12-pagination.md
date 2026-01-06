# REST API — Pagination — Exhaustive

This document describes pagination patterns used across:
- the production REST gateway (`/api/v1/*`)
- the OpenAPI contract (`/v1/*`)

## A) Production Gateway (`/api/v1/*`)

Most list endpoints in the gateway do **not** currently implement explicit pagination parameters. They typically:
- query Supabase
- order by `created_at desc`
- return the full result set for that user

Examples:
- `GET /api/v1/stories` — no `limit`/`offset`
- `GET /api/v1/characters` — no `limit`/`offset`
- `GET /api/v1/libraries` — no `limit`/`offset`
- `GET /api/v1/webhooks` — no `limit`/`offset`

Where the gateway does apply limits:
- `GET /api/v1/stories/:storyId/ip-detection-audit` limits to 100 audit records.

## B) OpenAPI Contract (`/v1/*`)

The OpenAPI spec documents classical `limit`/`offset` pagination.

Example (from story list):

- `limit`: integer (1..100)
- `offset`: integer (>=0)

Pattern:

```text
GET /v1/stories?limit=20&offset=0
```

Response pattern:

```json
{
  "items": [],
  "total": 123,
  "limit": 20,
  "offset": 0
}
```

## Guidance for Clients

- For `/api/v1/*` list endpoints, assume the gateway may return large arrays.
- If you need pagination today, paginate client-side or request a contract endpoint that supports `limit/offset`.
- When the gateway adopts pagination, it should align with the OpenAPI `limit/offset` pattern.
