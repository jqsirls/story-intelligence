# REST API — Overview (Production) — Exhaustive

This documentation describes the **production REST API** served by the Storytailor Universal Agent REST gateway.

Source of truth:
- REST gateway (Express + serverless-http): [`packages/universal-agent/src/api/RESTAPIGateway.ts`](../../../../packages/universal-agent/src/api/RESTAPIGateway.ts)
- Auth routes: [`packages/universal-agent/src/api/AuthRoutes.ts`](../../../../packages/universal-agent/src/api/AuthRoutes.ts)

## Base URL and Versioning

The production REST API uses a versioned prefix:

- **Prefix**: `/api/v1`

> Note: Some older/alternative documentation may refer to `/v1`. The production gateway routes are `/api/v1/...`.

Base URLs in production are typically configured via environment:
- `API_BASE_URL` (platform-wide)
- `APP_URL` (used for links)

## Content Types

### Request

Most endpoints accept:
- `Content-Type: application/json`

### Response

- `application/json` for most endpoints
- Binary responses are supported in the serverless wrapper:
  - `image/*`
  - `application/pdf`
  - `audio/*`
  - `video/*`

## CORS + Security Headers (Exact)

All requests receive these headers:

- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS`
- `Access-Control-Allow-Headers: Content-Type, Authorization, X-API-Key`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`

### Preflight (OPTIONS)

If `req.method === 'OPTIONS'`, the gateway returns:

- **204 No Content**

## Health Endpoint

- `GET /health`

Returns:

```json
{
  "status": "healthy",
  "version": "1.0.0",
  "timestamp": "ISO-8601",
  "uptime": 123.456
}
```

See `02-health-endpoints.md`.

## Authentication (High level)

The gateway supports authenticated endpoints using middleware:
- `AuthMiddleware.requireAuth`
- `AuthMiddleware.requireEmailVerification`

Authentication details, token formats, refresh flow, and every auth endpoint are documented in `01-authentication.md`.

## Error Handling (Two layers)

### 1) Endpoint-level error responses

Many endpoints explicitly return JSON responses with their own `success`, `error`, `code`, and other fields.

Example:

```json
{
  "success": false,
  "error": "Confirmation token required",
  "code": "TOKEN_MISSING"
}
```

### 2) Global error middleware

Unhandled errors reach the global error handler, which returns:

```json
{
  "success": false,
  "error": "Internal server error",
  "code": "INTERNAL_ERROR",
  "requestId": "(x-request-id header or 'unknown')"
}
```

Important:
- Not all endpoints use the same schema; endpoint docs define exact shapes per route.

## Complete Route Inventory (Production Gateway)

The production gateway defines (at minimum) the following REST route families:

- **Auth**: `/api/v1/auth/*`
- **Account deletion**:
  - `POST /api/v1/account/delete`
  - `POST /api/v1/account/delete/confirm`
  - `POST /api/v1/account/delete/cancel`
  - `GET /api/v1/account/export`
- **Stories**:
  - `GET /api/v1/stories`
  - `GET /api/v1/stories/:id`
  - `POST /api/v1/stories`
  - `PUT /api/v1/stories/:id`
  - `DELETE /api/v1/stories/:id`
  - `POST /api/v1/stories/:id/delete/cancel`
  - IP and audit routes under `/api/v1/stories/:storyId/...`
- **Characters**:
  - `GET /api/v1/characters`
  - `GET /api/v1/characters/:id`
  - `POST /api/v1/characters`
  - `PUT /api/v1/characters/:id`
  - `DELETE /api/v1/characters/:id`
- **Libraries**:
  - `GET /api/v1/libraries`
  - `GET /api/v1/libraries/:id`
  - `POST /api/v1/libraries`
  - `PUT /api/v1/libraries/:id`
  - `DELETE /api/v1/libraries/:id/members/:userId/remove`
- **Conversations**:
  - `POST /api/v1/conversations/start`
  - `POST /api/v1/conversations/:sessionId/message`
  - `GET /api/v1/conversations/:sessionId`
  - `POST /api/v1/conversations/:sessionId/end`
  - `POST /api/v1/conversations/:sessionId/assets/clear`
- **Webhooks**:
  - CRUD routes under `/api/v1/webhooks`
  - Deliveries route: `GET /api/v1/webhooks/:id/deliveries`
- **Email tracking**:
  - `GET /api/v1/emails/:messageId/track`
- **Research proxy**:
  - `POST /api/v1/research/analyze`
  - `GET /api/v1/research/briefs/latest`

A2A endpoints are documented separately under `../a2a/*`.

## Status Codes (Observed)

Across the production gateway you will see these HTTP status codes:

- **204** (OPTIONS preflight)
- **200** (most successful operations)
- **201** (resource creation)
- **400** (validation / missing params)
- **401** (auth required)
- **403** (forbidden / tier / verification)
- **404** (resource not found)
- **409** (conflicts)
- **422** (unprocessable entity / business validation)
- **429** (rate limiting)
- **500** (internal server errors)
- **503** (service unavailable)

The complete error catalog is in `10-error-catalog.md`.
