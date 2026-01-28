# REST API — User / Account Endpoints — Exhaustive

This section documents user account operations, including COPPA-related flows where applicable.

> **Contract Precedence (Product REST API)**: Treat `docs/api/REST_API_EXPERIENCE_MASTER.md` as canonical for the product REST API contract.

Source of truth:
- Account routes: [`lambda-deployments/universal-agent/src/api/RESTAPIGateway.ts`](../../../../lambda-deployments/universal-agent/src/api/RESTAPIGateway.ts)
- Auth/COPPA fields: `rest/01-authentication.md`

## 1) Request account deletion — `POST /api/v1/account/delete`

### Auth requirements

- Requires auth: `AuthMiddleware.requireAuth`
- Requires email verification: `AuthMiddleware.requireEmailVerification`

### Request body

```json
{
  "immediate": false,
  "reason": "string (optional)"
}
```

### Response

#### 200 OK

```json
{
  "success": true,
  "requestId": "string",
  "scheduledDeletionAt": "ISO-8601 or null",
  "message": "string"
}
```

#### 500 Internal Server Error

```json
{
  "success": false,
  "error": "(error message)",
  "code": "DELETION_REQUEST_FAILED"
}
```

## 2) Confirm account deletion — `POST /api/v1/account/delete/confirm`

This endpoint is intended to be invoked from an email confirmation link.

### Auth

- No auth middleware on this route.

### Query parameters

- `token` (required)

### Responses

#### 200 OK

```json
{
  "success": true,
  "message": "Account deletion confirmed and will be processed immediately"
}
```

#### 400 Bad Request — missing token

```json
{
  "success": false,
  "error": "Confirmation token required",
  "code": "TOKEN_MISSING"
}
```

#### 404 Not Found — invalid/expired token

```json
{
  "success": false,
  "error": "Invalid or expired confirmation token",
  "code": "TOKEN_INVALID"
}
```

#### 500 Internal Server Error

```json
{
  "success": false,
  "error": "(error message)",
  "code": "DELETION_CONFIRMATION_FAILED"
}
```

## 3) Cancel deletion request — `POST /api/v1/account/delete/cancel`

### Request body

```json
{
  "requestId": "string"
}
```

### Responses

#### 200 OK

```json
{
  "success": true,
  "message": "Deletion request cancelled successfully"
}
```

#### 400 Bad Request — missing requestId

```json
{
  "success": false,
  "error": "Request ID required",
  "code": "REQUEST_ID_MISSING"
}
```

#### 500 Internal Server Error

```json
{
  "success": false,
  "error": "(error message)",
  "code": "DELETION_CANCELLATION_FAILED"
}
```

## 4) Export account data (GDPR) — `GET /api/v1/account/export`

### Response

#### 200 OK

```json
{
  "success": true,
  "data": {
    "user": {"id": "...", "email": "..."},
    "stories": [],
    "characters": [],
    "libraries": [],
    "exportedAt": "ISO-8601"
  }
}
```

#### 500 Internal Server Error

```json
{
  "success": false,
  "error": "(error message)",
  "code": "EXPORT_FAILED"
}
```

## COPPA Notes

COPPA-related fields are primarily surfaced through auth endpoints:
- `isCoppaProtected`
- `parentConsentRequired`
- `parentConsentVerified`

See `rest/01-authentication.md` for the complete auth request/response objects.

## Examples

### cURL — export

```bash
curl -sS "https://api.storytailor.dev/api/v1/account/export" \
  -H "Authorization: Bearer [REDACTED_JWT]" \
  -H "Accept: application/json"
```
