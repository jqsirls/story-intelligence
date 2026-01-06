# REST API — Authentication (JWT) — Exhaustive

This document covers **every authentication endpoint** and the **exact request/response shapes** used by the production REST gateway.

Source of truth:
- Auth router: [`packages/universal-agent/src/api/AuthRoutes.ts`](../../../../packages/universal-agent/src/api/AuthRoutes.ts)
- Auth middleware usage in gateway routes: [`packages/universal-agent/src/api/RESTAPIGateway.ts`](../../../../packages/universal-agent/src/api/RESTAPIGateway.ts)

## Base path

All auth endpoints are mounted under:

- `/api/v1/auth`

So the full endpoints are:

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`
- `POST /api/v1/auth/forgot-password`

## Authentication Header (Bearer)

Endpoints requiring auth use:

- `Authorization: Bearer <accessToken>`

If the header is missing or does not start with `Bearer `, the server returns `401`.

## Token Objects

Tokens are returned as:

```json
{
  "accessToken": "string",
  "refreshToken": "string",
  "expiresIn": 3600
}
```

- `expiresIn` is seconds.

## 1) Register — `POST /api/v1/auth/register` (Adult-Only)

**⚠️ COPPA/GDPR-K COMPLIANT**: Registration is **adults-only**. Minors are hard-blocked. Child profiles (Storytailor IDs) are created separately via `/api/v1/storytailor-ids`.

### Request body (validated)

```json
{
  "email": "string (email)",
  "password": "string (min 8)",
  "userType": "parent|guardian|grandparent|aunt_uncle|older_sibling|foster_caregiver|teacher|librarian|afterschool_leader|childcare_provider|nanny|child_life_specialist|therapist|medical_professional|coach_mentor|enthusiast|other",
  "country": "string (ISO-3166-1 alpha-2, e.g., US, GB, FR)",
  "locale": "string (optional, e.g., en-US, fr-FR)",
  "ageVerification": {
    "method": "confirmation|birthYear|ageRange",
    "value": "optional (required for birthYear and ageRange)"
  },
  "firstName": "string (max 50)",
  "lastName": "string (max 50)"
}
```

**REMOVED FIELDS**: `age`, `parentEmail`, `userType: 'child'`

### Responses

#### 201 Created — success

```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "userType": "parent",
    "country": "US",
    "locale": "en-US",
    "isMinor": false,
    "minorThreshold": 13,
    "applicableFramework": "COPPA"
  },
  "defaultStorytailorId": {
    "id": "library-123",
    "name": "My Stories"
  },
  "tokens": {
    "accessToken": "...",
    "refreshToken": "...",
    "expiresIn": 3600
  }
}
```

#### 403 Forbidden — minor detected (hard-block)

```json
{
  "success": false,
  "error": "ADULT_REQUIRED",
  "code": "ADULT_REQUIRED",
  "message": "Registration is restricted to adults only. Users must meet the minimum age requirement in their country.",
  "details": {
    "country": "US",
    "minorThreshold": 13,
    "applicableFramework": "COPPA"
  }
}
```

#### 400 Bad Request — validation error

Validation errors return:

```json
{
  "success": false,
  "error": "Validation Error",
  "details": "(Joi message)"
}
```

#### 400 Bad Request — create user failed

If account creation fails but request body validates:

```json
{
  "success": false,
  "error": "(supabase/auth error message)"
}
```

#### 500 Internal Server Error

```json
{
  "success": false,
  "error": "Registration failed"
}
```

### cURL

```bash
curl -sS -X POST "https://api.storytailor.dev/api/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "correct-horse-battery-staple",
    "userType": "parent",
    "country": "US",
    "locale": "en-US",
    "ageVerification": {
      "method": "confirmation"
    },
    "firstName": "John",
    "lastName": "Doe"
  }'
```

## 2) Login — `POST /api/v1/auth/login`

### Request body

```json
{
  "email": "string (email)",
  "password": "string"
}
```

### Responses

#### 200 OK — success

```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "userType": "parent",
    "country": "US",
    "locale": "en-US",
    "isMinor": false,
    "minorThreshold": 13,
    "applicableFramework": "COPPA",
    "lastLoginAt": "ISO-8601"
  },
  "tokens": {
    "accessToken": "...",
    "refreshToken": "...",
    "expiresIn": 3600
  }
}
```

**Note**: `age`, `isCoppaProtected`, and `parentConsentVerified` fields have been removed. Use `isMinor`, `minorThreshold`, and `applicableFramework` instead.

#### 401 Unauthorized — invalid credentials

```json
{
  "success": false,
  "error": "(auth error message)"
}
```

#### 400 Bad Request — validation error

```json
{
  "success": false,
  "error": "Validation Error",
  "details": "(Joi message)"
}
```

#### 500 Internal Server Error

```json
{
  "success": false,
  "error": "Login failed"
}
```

## 3) Refresh — `POST /api/v1/auth/refresh`

### Request body

```json
{
  "refreshToken": "string"
}
```

### Responses

#### 200 OK — success

```json
{
  "success": true,
  "tokens": {
    "accessToken": "...",
    "refreshToken": "...",
    "expiresIn": 3600
  }
}
```

#### 401 Unauthorized — invalid refresh token

```json
{
  "success": false,
  "error": "(refresh error message)"
}
```

#### 400 Bad Request — validation error

```json
{
  "success": false,
  "error": "Validation Error",
  "details": "(Joi message)"
}
```

#### 500 Internal Server Error

```json
{
  "success": false,
  "error": "Token refresh failed"
}
```

## 4) Logout — `POST /api/v1/auth/logout`

### Request body

```json
{
  "refreshToken": "string"
}
```

### Responses

#### 200 OK — success

```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

#### 400 Bad Request — validation error

```json
{
  "success": false,
  "error": "Validation Error",
  "details": "(Joi message)"
}
```

#### 500 Internal Server Error

```json
{
  "success": false,
  "error": "Logout failed"
}
```

## 5) Me — `GET /api/v1/auth/me`

### Request headers

- `Authorization: Bearer <accessToken>`

### Responses

#### 200 OK — success

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "Ava",
    "lastName": "S",
    "age": 10,
    "userType": "child",
    "isCoppaProtected": true,
    "parentConsentVerified": false,
    "isEmailConfirmed": false,
    "lastLoginAt": "ISO-8601",
    "createdAt": "ISO-8601"
  }
}
```

#### 401 Unauthorized — missing header

```json
{
  "success": false,
  "error": "Authorization token required"
}
```

#### 401 Unauthorized — invalid/expired token

```json
{
  "success": false,
  "error": "Invalid or expired token"
}
```

#### 500 Internal Server Error

```json
{
  "success": false,
  "error": "Failed to get user profile"
}
```

## 6) Forgot password — `POST /api/v1/auth/forgot-password`

### Request body

```json
{
  "email": "string (email)"
}
```

### Response behavior (anti-enumeration)

This endpoint returns success **even if** the email does not exist or the action fails.

#### 200 OK — always

```json
{
  "success": true,
  "message": "If an account with that email exists, a password reset link has been sent."
}
```

#### 400 Bad Request — validation error

If the request body fails Joi validation:

```json
{
  "success": false,
  "error": "Validation Error",
  "details": "(Joi message)"
}
```

## Multi-language Examples

### TypeScript (login + me)

```ts
export async function login(baseUrl: string, email: string, password: string) {
  const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  })
  return await res.json()
}

export async function me(baseUrl: string, accessToken: string) {
  const res = await fetch(`${baseUrl}/api/v1/auth/me`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  })
  return await res.json()
}
```

### Python (register)

```python
import requests

def register(base_url: str, payload: dict) -> dict:
    r = requests.post(
        f"{base_url}/api/v1/auth/register",
        headers={"Content-Type": "application/json"},
        json=payload,
        timeout=30,
    )
    return r.json()
```

### JavaScript (refresh)

```js
export async function refresh(baseUrl, refreshToken) {
  const res = await fetch(`${baseUrl}/api/v1/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken })
  })
  return await res.json()
}
```
