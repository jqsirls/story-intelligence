# A2A Protocol — Authentication (Exhaustive)

This document describes **every authentication scheme, header shape, token validation rule, scope rule, and failure mode** used by the production A2A implementation.

Implementation source of truth:
- [`packages/a2a-adapter/src/Authentication.ts`](../../../../packages/a2a-adapter/src/Authentication.ts)

Related:
- `00-overview.md`
- `07-error-catalog.md`

## Authentication Resolution Order (Exact)

For each request that requires authentication (notably `POST /a2a/message`, `POST /a2a/task`, `GET /a2a/status`, `POST /a2a/webhook`), the auth system evaluates credentials in this exact order:

1. **API Key** (header: `X-API-Key`)
2. **Bearer Token** (header: `Authorization: Bearer [REDACTED_JWT]

If both are present:
- The API key attempt is performed first.
- If API key fails (unknown key or insufficient scope), the bearer token is attempted next.
- If both fail, the request is considered **unauthenticated**.

## Authentication Schemes (Complete)

### 1) API Key Authentication

#### Header variants accepted

The implementation accepts either of these header keys (case-sensitive access with both forms checked):
- `x-api-key`
- `X-API-Key`

If the header value is:
- a string → used directly
- an array of strings → first element is used
- missing/empty → treated as absent

#### Example (cURL)

```bash
curl -sS -X POST "https://storyintelligence.dev/a2a/message" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: [REDACTED_API_KEY]" \
  -d '{
    "jsonrpc": "2.0",
    "id": "auth-api-key-1",
    "method": "library.list",
    "params": {
      "limit": 20,
      "offset": 0
    }
  }'
```

#### API key storage and lookup

API keys are loaded from runtime config (`config.apiKeys`) into an in-memory map:

```ts
apiKeys?: Record<string, { agentId: string; scopes: string[] }>
```

Each key maps to:
- `agentId`: identifies the caller
- `scopes`: list of allowed scopes

#### API key failure modes (Complete)

1) **Missing API key header**
- Result: API key auth is skipped; bearer token auth is attempted.

2) **Invalid API key**
- Condition: provided key not found in map
- Result: API key auth fails; bearer token auth is attempted.

3) **Insufficient scope for method**
- Condition: method requires a scope and `scopes` does not include it
- Result: API key auth fails; bearer token auth is attempted.

### 2) OAuth 2.0 Bearer Token Authentication (JWT)

#### Header variants accepted

The implementation accepts either of these header keys:
- `authorization`
- `Authorization`

Accepted header forms:
- string starting with `Bearer `
- array where first element starts with `Bearer `

If the header is present but does not start with `Bearer `, it is treated as absent.

#### JWT parsing and validation (Complete)

The token is expected to be a JWT with three dot-separated segments.

Validation steps:

1) **Token format**
- Token is split by `.`
- Must produce **exactly 3 parts**
- Otherwise: `authenticated: false`, error: `Invalid token format`

2) **Decode header (Base64URL) to read `kid`**
- Header JSON is read from segment 0
- `kid` is used for JWKS lookup (when configured)

3) **Signature verification**

If `jwksUrl` is configured **and** `kid` exists:
- A JWKS client is created (or reused) with:
  - cache enabled
  - cache max age: 1 hour
  - JWKS rate limiting: 10 requests/minute
- A signing key is fetched by `kid`
- The JWT signature is verified using `jsonwebtoken.verify`
- Optional `issuer` and `audience` checks are performed in verify options

If `jwksUrl` is NOT configured or no `kid`:
- The payload is decoded without signature verification
- A warning is logged indicating no signature check

4) **Expiration (`exp`)**
- If `exp` exists and is less than current epoch seconds → fail with `Token expired`

5) **Issuer (`iss`)**
- If `tokenIssuer` is configured and does not match payload `iss` → fail with `Invalid token issuer`

6) **Audience (`aud`)**
- If `tokenAudience` is configured:
  - payload `aud` may be a string or array
  - If configured audience is not included → fail with `Invalid token audience`

7) **Agent identification**
- `agentId` is derived as: `sub || agent_id || ''`
- If missing → fail with `Token missing agent identifier`

8) **Scopes**
- scopes are derived from `scope` claim split on spaces
- e.g. `"a2a:read a2a:write"` → `["a2a:read", "a2a:write"]`

9) **Required scope for method**
- If method requires a scope and token scopes don’t include it → fail with `Insufficient scope: ...`

#### Required scope mapping (Exact)

The required scope is computed from the method name:

- Any method starting with `story.` or `character.` → requires `a2a:write`
- Any method starting with `library.` → requires `a2a:read`
- Anything else → no scope required

This is implemented as:

```ts
if (method.startsWith('story.') || method.startsWith('character.')) return 'a2a:write'
if (method.startsWith('library.')) return 'a2a:read'
return null
```

## Environment Variables (Complete)

The authentication system consults these environment variables (via adapter config defaults):

- `A2A_JWKS_URL`
- `A2A_TOKEN_ISSUER`
- `A2A_TOKEN_AUDIENCE`

The adapter config also supports supplying these directly.

## Error Surfaces and Return Shapes

A2A authentication failures surface in two different ways depending on which endpoint is being accessed.

### `/a2a/message` (JSON-RPC error envelope)

If authentication fails for a JSON-RPC method invocation, the response is a JSON-RPC error envelope.

Example (insufficient scope for `story.generate`):

```json
{
  "jsonrpc": "2.0",
  "id": "authz-1",
  "error": {
    "code": -32006,
    "message": "Authentication failed",
    "data": {
      "reason": "Insufficient scope: method story.generate requires scope a2a:write",
      "requiredScope": "a2a:write",
      "presentScopes": ["a2a:read"],
      "authAttemptOrder": ["apiKey", "bearerToken"],
      "requestHeaders": {
        "x-api-key": "(redacted)",
        "authorization": "Bearer (redacted)"
      }
    }
  }
}
```

Notes:
- The exact JSON-RPC error code used for auth failure is documented in `07-error-catalog.md`.
- This example shows the *maximum* diagnostic shape you should expect; production may redact details.

### `/a2a/task`, `/a2a/status`, `/a2a/webhook` (HTTP JSON errors)

These endpoints return standard HTTP JSON error objects when requests are invalid or when the A2A adapter is unavailable.

Example (401 Unauthorized variant):

```json
{
  "error": "Unauthorized",
  "message": "Authentication failed: No valid credentials provided"
}
```

## Exhaustive Examples

### Example A — API key success

Request:

```bash
curl -sS -X POST "https://storyintelligence.dev/a2a/message" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: [REDACTED_API_KEY]" \
  -d '{
    "jsonrpc": "2.0",
    "id": "ex-a",
    "method": "story.generate",
    "params": {
      "characterId": "char_123",
      "storyType": "adventure"
    }
  }'
```

Success response (example):

```json
{
  "jsonrpc": "2.0",
  "id": "ex-a",
  "result": {
    "taskMode": "sync",
    "storyId": "story_123",
    "status": "generated"
  }
}
```

### Example B — API key present but insufficient scope; bearer token succeeds

Request:

```bash
curl -sS -X POST "https://storyintelligence.dev/a2a/message" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: [REDACTED_API_KEY]" \
  -H "Authorization: Bearer [REDACTED_JWT]" \
  -d '{
    "jsonrpc": "2.0",
    "id": "ex-b",
    "method": "story.generate",
    "params": {
      "characterId": "char_123",
      "storyType": "adventure"
    }
  }'
```

Observed behavior:
- API key fails due to insufficient scope
- bearer token is attempted and succeeds

### Example C — Bearer token invalid format

Request:

```bash
curl -sS -X POST "https://storyintelligence.dev/a2a/message" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer [REDACTED_JWT]" \
  -d '{
    "jsonrpc": "2.0",
    "id": "ex-c",
    "method": "library.list",
    "params": {}
  }'
```

Error response (example):

```json
{
  "jsonrpc": "2.0",
  "id": "ex-c",
  "error": {
    "code": -32006,
    "message": "Authentication failed",
    "data": {
      "reason": "Invalid token format"
    }
  }
}
```

### Example D — Token expired

Error response (example):

```json
{
  "jsonrpc": "2.0",
  "id": "ex-d",
  "error": {
    "code": -32006,
    "message": "Authentication failed",
    "data": {
      "reason": "Token expired"
    }
  }
}
```

### Example E — Invalid issuer

```json
{
  "jsonrpc": "2.0",
  "id": "ex-e",
  "error": {
    "code": -32006,
    "message": "Authentication failed",
    "data": {
      "reason": "Invalid token issuer",
      "expectedIssuer": "(configured A2A_TOKEN_ISSUER)",
      "actualIssuer": "(payload iss)"
    }
  }
}
```

### Example F — Invalid audience

```json
{
  "jsonrpc": "2.0",
  "id": "ex-f",
  "error": {
    "code": -32006,
    "message": "Authentication failed",
    "data": {
      "reason": "Invalid token audience",
      "expectedAudience": "(configured A2A_TOKEN_AUDIENCE)",
      "actualAudience": "(payload aud)"
    }
  }
}
```

## Client Implementations (Multi-language)

### TypeScript (fetch)

```ts
type JsonRpcRequest = {
  jsonrpc: '2.0'
  id: string | number | null
  method: string
  params?: Record<string, unknown> | unknown[]
}

export async function a2aCallWithApiKey(baseUrl: string, apiKey: string, req: JsonRpcRequest) {
  const res = await fetch(`${baseUrl}/a2a/message`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey
    },
    body: JSON.stringify(req)
  })
  return await res.json()
}

export async function a2aCallWithBearer(baseUrl: string, token: string, req: JsonRpcRequest) {
  const res = await fetch(`${baseUrl}/a2a/message`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(req)
  })
  return await res.json()
}
```

### Python (requests)

```python
import requests

def a2a_call_with_api_key(base_url: str, api_key: str, payload: dict) -> dict:
    r = requests.post(
        f"{base_url}/a2a/message",
        headers={
            "Content-Type": "application/json",
            "X-API-Key": api_key,
        },
        json=payload,
        timeout=30,
    )
    r.raise_for_status()
    return r.json()

def a2a_call_with_bearer(base_url: str, token: str, payload: dict) -> dict:
    r = requests.post(
        f"{base_url}/a2a/message",
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}",
        },
        json=payload,
        timeout=30,
    )
    r.raise_for_status()
    return r.json()
```

### JavaScript (Node.js fetch)

```js
export async function a2aCallWithApiKey(baseUrl, apiKey, payload) {
  const res = await fetch(`${baseUrl}/a2a/message`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey
    },
    body: JSON.stringify(payload)
  })
  return await res.json()
}
```

### Go (net/http)

```go
package a2a

import (
  "bytes"
  "encoding/json"
  "net/http"
  "time"
)

func CallWithApiKey(baseUrl string, apiKey string, payload any) (*http.Response, []byte, error) {
  b, err := json.Marshal(payload)
  if err != nil {
    return nil, nil, err
  }

  req, err := http.NewRequest("POST", baseUrl+"/a2a/message", bytes.NewReader(b))
  if err != nil {
    return nil, nil, err
  }

  req.Header.Set("Content-Type", "application/json")
  req.Header.Set("X-API-Key", apiKey)

  client := &http.Client{Timeout: 30 * time.Second}
  res, err := client.Do(req)
  if err != nil {
    return nil, nil, err
  }
  defer res.Body.Close()

  body, err := io.ReadAll(res.Body)
  if err != nil {
    return res, nil, err
  }

  return res, body, nil
}
```
