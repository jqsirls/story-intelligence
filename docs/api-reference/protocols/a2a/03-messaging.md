# A2A — `POST /a2a/message` (JSON-RPC 2.0) — Exhaustive

This endpoint executes an A2A method **synchronously** via JSON-RPC 2.0.

Source of truth:
- Route wiring: [`packages/universal-agent/src/api/RESTAPIGateway.ts`](../../../../packages/universal-agent/src/api/RESTAPIGateway.ts)
- JSON-RPC handler: [`packages/a2a-adapter/src/JsonRpcHandler.ts`](../../../../packages/a2a-adapter/src/JsonRpcHandler.ts)
- Method registrations + router bridge: [`packages/a2a-adapter/src/A2AAdapter.ts`](../../../../packages/a2a-adapter/src/A2AAdapter.ts)
- Router mapping + response conversion: [`packages/a2a-adapter/src/RouterIntegration.ts`](../../../../packages/a2a-adapter/src/RouterIntegration.ts)
- Canonical types: [`packages/a2a-adapter/src/types.ts`](../../../../packages/a2a-adapter/src/types.ts)

> Important (production behavior): the current REST gateway passes only `req.body` to `a2aAdapter.handleMessage(req.body)` and **does not provide headers**, so the existing Authentication subsystem is **not invoked for `/a2a/message`**.
>
> Clients should still send authentication headers for forward compatibility and policy compliance. See `01-authentication.md`.

## Endpoint

- **Method**: `POST`
- **Path**: `/a2a/message`
- **Content-Type**: `application/json`
- **Response Content-Type**: `application/json`

## Request (Complete)

### JSON-RPC Request Object (`JsonRpcRequest`)

```json
{
  "jsonrpc": "2.0",
  "id": "string-or-number-or-null",
  "method": "string",
  "params": {
    "any": "json"
  }
}
```

All valid shapes:

1) **Object params**

```json
{
  "jsonrpc": "2.0",
  "id": "req-obj-1",
  "method": "library.list",
  "params": {
    "limit": 20,
    "offset": 0
  }
}
```

2) **Array params** (per JSON-RPC 2.0)

```json
{
  "jsonrpc": "2.0",
  "id": "req-arr-1",
  "method": "library.list",
  "params": [20, 0]
}
```

Array param handling (exact): arrays are converted into an object with numeric string keys:

```json
{
  "0": 20,
  "1": 0
}
```

3) **No params**

```json
{
  "jsonrpc": "2.0",
  "id": "req-noparams-1",
  "method": "emotion.checkin"
}
```

### Headers

- `Content-Type: application/json` (required)
- `Accept: application/json` (optional)
- `X-API-Key: ...` (optional; not currently enforced for this route)
- `Authorization: Bearer ...` (optional; not currently enforced for this route)

## Response (Complete)

### JSON-RPC Success Response (`JsonRpcResponse` with `result`)

```json
{
  "jsonrpc": "2.0",
  "id": "same-as-request-id",
  "result": {
    "any": "json"
  }
}
```

### JSON-RPC Error Response (`JsonRpcResponse` with `error`)

```json
{
  "jsonrpc": "2.0",
  "id": "same-as-request-id-or-null",
  "error": {
    "code": -32603,
    "message": "string",
    "data": {
      "any": "json"
    }
  }
}
```

## HTTP Status Codes (All variants)

The REST gateway returns:

- `200 OK` for normal JSON-RPC handling (both success and JSON-RPC-level errors are returned as body)
- `503 Service Unavailable` if the A2A adapter is not initialized (gateway-level)
- `500 Internal Server Error` if the gateway itself throws while handling the request (gateway-level)

### 503 — Adapter not initialized

```json
{
  "jsonrpc": "2.0",
  "id": "(request id if present, else null)",
  "error": {
    "code": -32603,
    "message": "A2A adapter not available"
  }
}
```

### 500 — Gateway internal error

```json
{
  "jsonrpc": "2.0",
  "id": "(request id if present, else null)",
  "error": {
    "code": -32603,
    "message": "Internal error",
    "data": "(stringified error message)"
  }
}
```

## JSON-RPC Validation Rules (Exact)

The handler validates:

1) Request must be an object
- If not: `-32700` Parse error with message `Invalid JSON-RPC request: request must be an object`

2) `jsonrpc` must equal `"2.0"`
- If not: `-32600` Invalid Request

3) `method` must be a non-empty string
- If not: `-32600` Invalid Request

4) `id` must be `string | number | null`
- If not: `-32600` Invalid Request

No validation is performed on the shape of `params` beyond being carried forward.

## Supported Methods (Complete)

These methods are registered by the adapter (and only these methods):

- `story.generate`
- `character.create`
- `emotion.checkin`
- `crisis.detect`
- `library.list`
- `library.get`
- `library.share`
- `storytailor_id.create` (delegates to REST API)
- `storytailor_id.get` (delegates to REST API)
- `storytailor_id.transfer` (delegates to REST API)

If you call any other method, you get `-32601 Method not found`.

**Note**: Storytailor ID methods (`storytailor_id.*`) delegate directly to REST API endpoints via HTTP calls, rather than routing through the router. They require `userId` in the A2A context for authentication.

### Common execution pipeline

For each supported method:
1. JSON-RPC handler dispatches to the registered handler.
2. The adapter calls `routerIntegration.executeMethod(method, params, a2aContext)`.
3. The router integration:
   - validates the method is mapped
   - validates that the router exists
   - converts params + A2A context into a `TurnContext`
   - constructs a router `Intent`
   - calls `router.route(turnContext)`
   - converts the router response into a router-shaped `AgentResponse`
4. The adapter returns **only `agentResponse.data`** to JSON-RPC as the `result`.

### Result shape (maximum canonical)

Because the adapter returns `agentResponse.data`, the synchronous JSON-RPC `result` is, at maximum, a superset of:

```json
{
  "message": "string-or-null",
  "speechText": "string-or-null",
  "displayText": "string-or-null",
  "conversationPhase": "any",
  "visualElements": [],
  "audioUrl": "string-or-null"
}
```

The actual fields depend on which downstream agent handled the request.

### Method: `story.generate`

- **Target agent (router mapping)**: `content`
- **Router intent**: `IntentType.CREATE_STORY`
- **Scope (auth mapping)**: `a2a:write` (see `01-authentication.md`)

#### Minimum example request

```json
{
  "jsonrpc": "2.0",
  "id": "story-1",
  "method": "story.generate",
  "params": {
    "characterId": "char_123",
    "storyType": "adventure",
    "userInput": "Please make it about kindness"
  }
}
```

#### Example success response

```json
{
  "jsonrpc": "2.0",
  "id": "story-1",
  "result": {
    "message": "Here’s your story!",
    "speechText": "Here’s your story!",
    "displayText": "Here’s your story!",
    "conversationPhase": "story_building",
    "visualElements": [],
    "audioUrl": "https://..."
  }
}
```

### Method: `character.create`

- **Target agent**: `content`
- **Router intent**: `IntentType.CREATE_CHARACTER`
- **Scope**: `a2a:write`

#### Minimum example request

```json
{
  "jsonrpc": "2.0",
  "id": "char-1",
  "method": "character.create",
  "params": {
    "name": "Luna",
    "traits": ["brave", "curious"],
    "storyType": "adventure"
  }
}
```

### Method: `emotion.checkin`

- **Target agent**: `emotion`
- **Router intent**: `IntentType.EMOTION_CHECKIN`
- **Scope**: none (by method prefix)

#### Minimum example request

```json
{
  "jsonrpc": "2.0",
  "id": "emo-1",
  "method": "emotion.checkin",
  "params": {
    "message": "I feel worried today"
  }
}
```

### Method: `crisis.detect`

- **Target agent**: `emotion`
- **Router intent**: `IntentType.EMOTION_CHECKIN` (reused)
- **Scope**: none (by method prefix)

#### Minimum example request

```json
{
  "jsonrpc": "2.0",
  "id": "crisis-1",
  "method": "crisis.detect",
  "params": {
    "message": "I want to hurt myself"
  }
}
```

### Method: `library.list`

- **Target agent**: `library`
- **Router intent**: `IntentType.VIEW_LIBRARY`
- **requiresAuth**: true (router mapping)
- **Scope**: `a2a:read`

#### Minimum example request

```json
{
  "jsonrpc": "2.0",
  "id": "lib-1",
  "method": "library.list",
  "params": {
    "limit": 20,
    "offset": 0
  }
}
```

### Method: `library.get`

- **Target agent**: `library`
- **Router intent**: `IntentType.VIEW_LIBRARY`
- **requiresAuth**: true
- **Scope**: `a2a:read`

#### Minimum example request

```json
{
  "jsonrpc": "2.0",
  "id": "lib-2",
  "method": "library.get",
  "params": {
    "storyId": "story_123"
  }
}
```

### Method: `library.share`

- **Target agent**: `library`
- **Router intent**: `IntentType.SHARE_STORY`
- **requiresAuth**: true
- **Scope**: `a2a:read` (by prefix; note that share is a write-like operation but is currently classified as `library.*`)

#### Minimum example request

```json
{
  "jsonrpc": "2.0",
  "id": "lib-3",
  "method": "library.share",
  "params": {
    "storyId": "story_123",
    "recipient": "parent@example.com"
  }
}
```

### Method: `storytailor_id.create`

- **Target agent**: `library`
- **Router intent**: `IntentType.VIEW_LIBRARY` (delegates to REST API)
- **requiresAuth**: true
- **Scope**: `a2a:write`
- **Note**: This method delegates directly to REST API endpoint `POST /api/v1/storytailor-ids` (does not route through router)

#### Minimum example request

```json
{
  "jsonrpc": "2.0",
  "id": "stid-1",
  "method": "storytailor_id.create",
  "params": {
    "name": "Emma's Stories",
    "primary_character_id": "char-123",
    "age_range": "6-8",
    "is_minor": true
  }
}
```

#### Parameter Schema

- `name` (string, required) - Name of the Storytailor ID
- `primary_character_id` (string, UUID, optional) - Character to use as primary identity (character-first creation)
- `age_range` (string, optional) - One of: `"3-5"`, `"6-8"`, `"9-10"`, `"11-12"`, `"13-15"`, `"16-17"` (for child Storytailor IDs)
- `is_minor` (boolean, optional) - Whether this is a child Storytailor ID
- `parent_storytailor_id` (string, UUID, optional) - Parent Storytailor ID (creates child Storytailor ID)

#### Example success response

```json
{
  "jsonrpc": "2.0",
  "id": "stid-1",
  "result": {
    "storytailorId": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Emma's Stories",
      "primaryCharacterId": "char-123",
      "ageRange": "6-8",
      "isMinor": true,
      "consentStatus": "pending",
      "createdAt": "2025-12-26T12:00:00.000Z"
    }
  }
}
```

#### Error responses

- **-32006 Authentication Failed** - User ID required:
```json
{
  "jsonrpc": "2.0",
  "id": "stid-1",
  "error": {
    "code": -32006,
    "message": "User ID required for Storytailor ID creation"
  }
}
```

- **-32005 Capability Not Supported** - Validation error:
```json
{
  "jsonrpc": "2.0",
  "id": "stid-1",
  "error": {
    "code": -32005,
    "message": "Name is required for Storytailor ID creation"
  }
}
```

### Method: `storytailor_id.get`

- **Target agent**: `library`
- **Router intent**: `IntentType.VIEW_LIBRARY` (delegates to REST API)
- **requiresAuth**: true
- **Scope**: `a2a:read`
- **Note**: This method delegates directly to REST API endpoint `GET /api/v1/storytailor-ids/:id` (does not route through router)

#### Minimum example request

```json
{
  "jsonrpc": "2.0",
  "id": "stid-2",
  "method": "storytailor_id.get",
  "params": {
    "id": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

#### Parameter Schema

- `id` (string, UUID, required) - Storytailor ID UUID

#### Example success response

```json
{
  "jsonrpc": "2.0",
  "id": "stid-2",
  "result": {
    "storytailorId": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Emma's Stories",
      "primaryCharacterId": "char-123",
      "ageRange": "6-8",
      "isMinor": true,
      "consentStatus": "pending",
      "policyVersion": "2025-01",
      "evaluatedAt": "2025-12-26T12:00:00.000Z",
      "createdAt": "2025-12-26T12:00:00.000Z"
    }
  }
}
```

#### Error responses

- **-32005 Capability Not Supported** - Storytailor ID not found:
```json
{
  "jsonrpc": "2.0",
  "id": "stid-2",
  "error": {
    "code": -32005,
    "message": "Storytailor ID not found"
  }
}
```

### Method: `storytailor_id.transfer`

- **Target agent**: `library`
- **Router intent**: `IntentType.SHARE_STORY` (delegates to REST API)
- **requiresAuth**: true
- **Scope**: `a2a:write`
- **Note**: This method delegates directly to REST API endpoint `POST /api/v1/storytailor-ids/:id/transfer` (does not route through router)

#### Minimum example request

```json
{
  "jsonrpc": "2.0",
  "id": "stid-3",
  "method": "storytailor_id.transfer",
  "params": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "to_user_id": "660e8400-e29b-41d4-a716-446655440001"
  }
}
```

#### Parameter Schema

- `id` (string, UUID, required) - Storytailor ID UUID to transfer
- `to_user_id` (string, UUID, required) - Target user ID to transfer ownership to

#### Example success response

```json
{
  "jsonrpc": "2.0",
  "id": "stid-3",
  "result": {
    "message": "Storytailor ID transferred successfully",
    "data": {
      "storytailorId": "550e8400-e29b-41d4-a716-446655440000",
      "newOwnerId": "660e8400-e29b-41d4-a716-446655440001",
      "newOwnerEmail": "newowner@example.com"
    }
  }
}
```

#### Error responses

- **-32006 Authentication Failed** - Permission denied:
```json
{
  "jsonrpc": "2.0",
  "id": "stid-3",
  "error": {
    "code": -32006,
    "message": "Permission denied: Only the owner can transfer a Storytailor ID"
  }
}
```

- **-32005 Capability Not Supported** - Target user not found:
```json
{
  "jsonrpc": "2.0",
  "id": "stid-3",
  "error": {
    "code": -32005,
    "message": "Storytailor ID or target user not found"
  }
}
```

## Context Translation (A2A params → Router TurnContext)

The router integration creates a `TurnContext` as follows:

- `userId`: `context.userId || 'a2a-user'`
- `sessionId`: `context.sessionId || 'a2a-session-' + Date.now()`
- `requestId`: `context.correlationId`
- `userInput`:
  - `params.userInput` if string
  - else `params.message` if string
  - else `JSON.stringify(params)`
- `channel`: `'api'`
- `locale`: `'en-US'`
- `timestamp`: `context.timestamp`
- `metadata`:
  - `a2a: true`
  - `clientAgentId: context.clientAgentId`
  - `taskId: context.taskId`

Story type extraction:
- If `params.storyType` is a string, it’s mapped to a router StoryType enum using a fixed map (see `RouterIntegration.extractStoryType`).

## Error Handling (Complete)

### Standard JSON-RPC errors

- `-32700` Parse error
- `-32600` Invalid Request
- `-32601` Method not found
- `-32602` Invalid params
- `-32603` Internal error

### A2A-specific errors (may surface as JSON-RPC error codes)

- `-32004` Agent not found (router missing)
- `-32005` Capability not supported (mapping missing)

Full catalog and all examples: `07-error-catalog.md`.

#### Example: method not found

```json
{
  "jsonrpc": "2.0",
  "id": "err-1",
  "method": "unknown.method",
  "params": {}
}
```

Response:

```json
{
  "jsonrpc": "2.0",
  "id": "err-1",
  "error": {
    "code": -32601,
    "message": "Method not found: unknown.method"
  }
}
```

#### Example: router missing

If the router is not available, router integration throws `AGENT_NOT_FOUND`.

```json
{
  "jsonrpc": "2.0",
  "id": "err-2",
  "error": {
    "code": -32004,
    "message": "Router not available"
  }
}
```

## Multi-language request examples

### cURL

```bash
curl -sS -X POST "https://storyintelligence.dev/a2a/message" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": "curl-1",
    "method": "emotion.checkin",
    "params": { "message": "I feel excited" }
  }'
```

### Python

```python
import requests

payload = {
  "jsonrpc": "2.0",
  "id": "py-1",
  "method": "emotion.checkin",
  "params": {"message": "I feel excited"}
}

r = requests.post(
  "https://storyintelligence.dev/a2a/message",
  headers={"Content-Type": "application/json"},
  json=payload,
  timeout=30,
)
print(r.status_code, r.json())
```

### TypeScript

```ts
export type JsonRpcRequest = {
  jsonrpc: '2.0'
  id: string | number | null
  method: string
  params?: Record<string, unknown> | unknown[]
}

export async function a2aMessage(baseUrl: string, req: JsonRpcRequest) {
  const res = await fetch(`${baseUrl}/a2a/message`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req)
  })
  return await res.json()
}
```
