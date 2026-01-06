# REST API — Analytics & Research Endpoints — Exhaustive

This document covers:
- analytics endpoints defined by the OpenAPI contract
- research proxy endpoints implemented by the production REST gateway

## A) OpenAPI Contract — `/v1/analytics/*`

Source of truth:
- [`api/openapi-specification.yaml`](../../../../api/openapi-specification.yaml)

> Note: These are `/v1/...` contract paths, not `/api/v1/...` gateway paths.

### A1) Usage metrics — `GET /v1/analytics/usage`

Query parameters:
- `period`: `day|week|month|quarter|year` (default `month`)
- `metric`: `stories|characters|sessions|engagement` (default `stories`)

Response example:

```json
{
  "metrics": {
    "total": 123,
    "daily": [
      {"date": "2025-12-01", "value": 4},
      {"date": "2025-12-02", "value": 7}
    ],
    "trend": "increasing"
  },
  "period": "month",
  "comparison": {
    "previousPeriod": 100,
    "percentChange": 23.0
  }
}
```

### A2) Insights — `GET /v1/analytics/insights`

Query parameters:
- `category`: `user_behavior|content_performance|engagement|all` (default `all`)

Response example:

```json
{
  "insights": [
    {
      "type": "recommendation",
      "category": "engagement",
      "title": "Try shorter stories on weekdays",
      "description": "Weekday sessions are shorter; recommend short stories.",
      "priority": "medium",
      "actionable": true
    }
  ],
  "generatedAt": "2025-12-18T12:00:00Z",
  "nextReview": "2026-01-18T12:00:00Z"
}
```

## B) Production Gateway — Research Proxy Endpoints (`/api/v1/research/*`)

Source of truth:
- [`packages/universal-agent/src/api/RESTAPIGateway.ts`](../../../../packages/universal-agent/src/api/RESTAPIGateway.ts)

### Availability (important)

These endpoints are registered **only if**:
- `RESEARCH_AGENT_ENDPOINT` environment variable is set

If it is not set, these routes do not exist in the gateway.

### B1) Analyze (proxy) — `POST /api/v1/research/analyze`

Auth:
- requires gateway auth middleware

Request body (accepted):

```json
{
  "tenantId": "string (optional, default 'storytailor')",
  "timeframe": "string (optional, default '7 days')",
  "focus": "buyer|user|all (optional, default 'all')",
  "events": []
}
```

Proxy behavior (exact):
- Forwards the request to:
  - `${RESEARCH_AGENT_ENDPOINT}/api/v1/analyze`
- Sends headers:
  - `Content-Type: application/json`
  - `Authorization: <same as inbound>`
- Sends body with defaults applied.

Response:
- Returns `res.json(data)` where `data` is the proxied response body.

Errors:

```json
{
  "success": false,
  "error": "(error message)",
  "code": "RESEARCH_AGENT_FAILED"
}
```

### B2) Latest brief (proxy) — `GET /api/v1/research/briefs/latest`

Auth:
- requires gateway auth middleware

Query parameters:
- `tenantId` (optional, default `storytailor`)

Proxy behavior:
- Forwards to:
  - `${RESEARCH_AGENT_ENDPOINT}/api/v1/briefs/latest?tenantId=${tenantId}`
- Forwards `Authorization` header.

Errors:

```json
{
  "success": false,
  "error": "(error message)",
  "code": "RESEARCH_AGENT_FAILED"
}
```

## Examples

### cURL — proxy analyze

```bash
curl -sS -X POST "https://api.storytailor.dev/api/v1/research/analyze" \
  -H "Authorization: Bearer [REDACTED_JWT]" \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "storytailor",
    "timeframe": "7 days",
    "focus": "all",
    "events": []
  }'
```
