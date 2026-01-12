# REST API — Error Catalog (HTTP) — Exhaustive

This catalog documents every HTTP status code used/expected across the production REST gateway and OpenAPI contract.

> **Contract Precedence (Product REST API)**: Treat `docs/api/REST_API_EXPERIENCE_MASTER.md` as canonical for the product REST API contract.

Source of truth:
- Gateway behavior and per-endpoint error bodies: [`lambda-deployments/universal-agent/src/api/RESTAPIGateway.ts`](../../../../lambda-deployments/universal-agent/src/api/RESTAPIGateway.ts)
- OpenAPI contract: [`api/openapi-specification.yaml`](../../../../api/openapi-specification.yaml)

## Error Body Shapes (Complete)

The system uses multiple error shapes.

### Shape A — Endpoint-level error envelope

Most endpoints respond with:

```json
{
  "success": false,
  "error": "string",
  "code": "STRING_CODE"
}
```

Optional fields may appear depending on endpoint:
- `details` (validation)
- `requestId`

### Shape B — Validation error

```json
{
  "success": false,
  "error": "Validation Error",
  "details": "(Joi message)"
}
```

### Shape C — Global error middleware

Unhandled errors reach the global handler:

```json
{
  "success": false,
  "error": "Internal server error",
  "code": "INTERNAL_ERROR",
  "requestId": "(x-request-id or 'unknown')"
}
```

### Shape D — Contract-style error (OpenAPI)

Some contract docs use:

```json
{
  "success": false,
  "error": "string",
  "code": "string",
  "details": {"any": "json"}
}
```

## 200 OK

### Meaning

- Successful read / update / operational success.

### Common response shapes

```json
{ "success": true, "data": {"any": "json"} }
```

or

```json
{ "success": true, "message": "..." }
```

### Common causes

- GET list
- GET single
- PUT update
- POST non-create operations

## 201 Created

### Meaning

- Resource created.

### Common response shape

```json
{ "success": true, "data": {"id": "..."} }
```

### Common causes

- `/api/v1/auth/register`
- `/api/v1/stories` (create)
- `/api/v1/characters` (create)
- `/api/v1/libraries` (create)
- `/api/v1/conversations/start`

## 204 No Content

### Meaning

- Used for OPTIONS preflight in the gateway.

No body.

## 400 Bad Request

### Meaning

- Request validation failed or required parameter missing.

### Example — missing query param

```json
{
  "success": false,
  "error": "Confirmation token required",
  "code": "TOKEN_MISSING"
}
```

### Example — Joi validation

```json
{
  "success": false,
  "error": "Validation Error",
  "details": "\"email\" must be a valid email"
}
```

### Common causes

- Missing request field
- Invalid field type
- Missing query parameter

## 401 Unauthorized

### Meaning

- Missing/invalid credentials.

### Example

```json
{
  "success": false,
  "error": "Authorization token required"
}
```

### Common causes

- Missing `Authorization: Bearer ...`
- Expired token

## 403 Forbidden

### Meaning

- Authenticated but not allowed.

### Example

```json
{
  "success": false,
  "error": "Only library owner can update library",
  "code": "PERMISSION_DENIED"
}
```

### Common causes

- Not owner of resource
- Email not verified (for endpoints requiring verification)
- Tier restrictions (in agent lambdas)

## 404 Not Found

### Meaning

- Resource not found.

### Example

```json
{
  "success": false,
  "error": "Session SESSION_ID not found",
  "code": "SESSION_NOT_FOUND"
}
```

### Common causes

- Missing session
- Invalid deletion confirmation token
- Missing story in IP dispute endpoints

## 409 Conflict

### Meaning

- Concurrency conflict / duplicate.

### Example

```json
{
  "success": false,
  "error": "Conflict",
  "code": "CONFLICT"
}
```

### Common causes

- Duplicate operations
- Idempotency conflicts

## 422 Unprocessable Entity

### Meaning

- Business logic validation failed.

Example shape:

```json
{
  "success": false,
  "error": "Unprocessable entity",
  "code": "UNPROCESSABLE_ENTITY"
}
```

## 429 Too Many Requests

### Meaning

- Rate limit exceeded.

Example shape:

```json
{
  "success": false,
  "error": "Rate limit exceeded",
  "code": "RATE_LIMIT"
}
```

## 500 Internal Server Error

### Meaning

- Server-side failure.

### Example

```json
{
  "success": false,
  "error": "Failed to list stories",
  "code": "LIST_STORIES_FAILED"
}
```

### Common causes

- Supabase query failure
- Unhandled exception
- Downstream service error

## 503 Service Unavailable

### Meaning

- Dependency service unavailable.

### Example

```json
{
  "success": false,
  "error": "Conversation service not available",
  "code": "SERVICE_UNAVAILABLE"
}
```

### Common causes

- Storyteller API not injected or missing method
- Maintenance mode

## Retry Guidance

- Retryable codes (with backoff): 429, 500, 503
- Do not retry without changes: 400, 401, 403, 404, 409, 422

## Correlation IDs

If you supply `X-Request-Id`, the global error middleware echoes it in `requestId`.
