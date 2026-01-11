# REST API — Pagination — Exhaustive

This document describes pagination patterns used across:
- the production REST gateway (`/api/v1/*`)

> **Contract Precedence (Product REST API)**: Treat `docs/api/REST_API_EXPERIENCE_MASTER.md` as canonical for which endpoints paginate and the exact response shapes.

## A) Production Gateway (`/api/v1/*`)

Some list endpoints in the gateway implement pagination via `page` + `limit` and return a top-level `pagination` object.

Examples (gateway-sourced; see master for the definitive list):
- `GET /api/v1/stories`
- `GET /api/v1/characters`
- `GET /api/v1/libraries`
- `GET /api/v1/users/me/notifications`
- `GET /api/v1/users/me/rewards`

Where the gateway does apply limits:
- `GET /api/v1/stories/:storyId/ip-detection-audit` limits to 100 audit records.

## B) Legacy pagination notes (non-canonical)

Some older/legacy docs may describe `limit`/`offset` pagination. For the product REST API contract, prefer `page` + `limit` where supported, and follow the per-endpoint documentation in `docs/api/REST_API_EXPERIENCE_MASTER.md`.

Example (from story list):

- `limit`: integer (1..100)
- `offset`: integer (>=0)

Pattern:

```text
GET /api/v1/stories?page=1&limit=20
```

Response pattern:

```json
{
  "success": true,
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 123,
    "totalPages": 7,
    "hasNext": true,
    "hasPrevious": false
  }
}
```

## Guidance for Clients

- If an endpoint provides `pagination`, rely on it.
- If an endpoint does not paginate, assume it may return large arrays and paginate client-side.
