# REST API — Rate Limiting — Exhaustive

> **Contract Precedence (Product REST API)**: Treat `docs/api/REST_API_EXPERIENCE_MASTER.md` as canonical for the product REST API contract.

Source of truth:
- Rate limit middleware implementation: [`lambda-deployments/universal-agent/src/middleware/AuthMiddleware.ts`](../../../../lambda-deployments/universal-agent/src/middleware/AuthMiddleware.ts)
- Gateway route wiring: [`lambda-deployments/universal-agent/src/api/RESTAPIGateway.ts`](../../../../lambda-deployments/universal-agent/src/api/RESTAPIGateway.ts)

## Status (Production)

The production REST gateway currently does **not** apply `AuthMiddleware.userRateLimit(...)` to routes by default.

However, the middleware exists and can be attached at the route or router level.

External rate limiting may also occur at infrastructure layers (API Gateway / CloudFront), which is outside the scope of this file.

## Middleware: `userRateLimit(maxRequests, windowMs)`

### Keying

Requests are keyed by:
- `req.user.id` if authenticated
- otherwise `req.ip`

### Default settings

- `maxRequests`: 100
- `windowMs`: 60000 (60 seconds)

### Response on limit exceeded

#### 429 Too Many Requests

```json
{
  "success": false,
  "error": "Rate limit exceeded",
  "code": "RATE_LIMIT_EXCEEDED",
  "details": {
    "maxRequests": 100,
    "windowMs": 60000,
    "resetTime": 1734523200000
  }
}
```

### Rate limit headers

On successful (non-blocked) requests, the middleware sets:

- `X-RateLimit-Limit: <maxRequests>`
- `X-RateLimit-Remaining: <maxRequests - currentCount>`
- `X-RateLimit-Reset: <unix_seconds>`

Example:

```text
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 42
X-RateLimit-Reset: 1734523260
```

## Client Retry Guidance

When receiving `429`:
- Back off until after `X-RateLimit-Reset` (if present)
- Use exponential backoff with jitter
- Avoid concurrent retries from multiple clients

## Example: Applying the middleware

Example usage pattern (illustrative):

```ts
// this.app.get('/api/v1/stories', this.authMiddleware.requireAuth, this.authMiddleware.userRateLimit(), handler)
```

The middleware is not currently attached in the gateway file.
