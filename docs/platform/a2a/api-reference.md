Status: Published  
Audience: Partner | Developer  
Last-Updated: 2025-12-17  
Owner: Documentation Team  
Verified-Against-Code: Yes  
Doc-ID: AUTO  

# A2A Protocol API Reference

## Base URL

**Production:** `https://storyintelligence.dev`  
**Staging:** `https://api-staging.storytailor.dev`

All A2A endpoints are prefixed with `/a2a/`

## Authentication

A2A supports multiple authentication schemes:

### API Key Authentication

Include your API key in the request header:

```
X-API-Key: [REDACTED_API_KEY]
```

### OAuth 2.0 Bearer Token

Include your OAuth 2.0 access token in the Authorization header:

```
Authorization: Bearer [REDACTED_JWT]
```

**Token Requirements:**
- Token must be a valid JWT signed by the configured issuer
- Token must include `sub` or `agent_id` claim for agent identification
- Token must include `scope` claim with required permissions:
  - `a2a:read` - Required for read operations (e.g., `library.list`)
  - `a2a:write` - Required for write operations (e.g., `story.generate`)

### OpenID Connect

For OpenID Connect, configure:
- `A2A_JWKS_URL` - JWKS endpoint URL for public key discovery
- `A2A_TOKEN_ISSUER` - Expected token issuer
- `A2A_TOKEN_AUDIENCE` - Expected token audience

Tokens are automatically verified using JWKS with full signature verification.

## Endpoints

### 1. Agent Discovery

Discover the Storytailor agent's capabilities and endpoints.

**Endpoint:** `GET /a2a/discovery`

**Authentication:** Optional (public endpoint)

**Response:**
```json
{
  "agentCard": {
    "id": "storytailor-agent",
    "name": "Storytailor Agent",
    "version": "1.0.0",
    "description": "Therapeutic storytelling and emotional wellness agent",
    "capabilities": [
      "storytelling",
      "emotional-check-in",
      "crisis-detection"
    ],
    "endpoints": {
      "service": "https://storyintelligence.dev/a2a",
      "webhook": "https://storyintelligence.dev/a2a/webhook",
      "health": "https://storyintelligence.dev/health"
    },
    "authentication": {
      "schemes": [
        {
          "type": "apiKey",
          "name": "X-API-Key",
          "in": "header"
        },
        {
          "type": "oauth2",
          "name": "Authorization",
          "in": "header",
          "flows": {
            "clientCredentials": {
              "tokenUrl": "[your-oauth-provider-url]/oauth/token",
              "scopes": {
                "a2a:read": "Read access to A2A methods",
                "a2a:write": "Write access to A2A methods"
              }
            }
          }
        }
      ]
    }
  }
}
```

### 2. JSON-RPC 2.0 Message

Send a JSON-RPC 2.0 message to execute a method.

**Endpoint:** `POST /a2a/message`

**Authentication:** Required (API Key or OAuth 2.0 Bearer Token)

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": "msg-123",
  "method": "story.generate",
  "params": {
    "characterId": "char_123",
    "storyType": "Adventure",
    "theme": "friendship"
  }
}
```

**Response (Success):**
```json
{
  "jsonrpc": "2.0",
  "id": "msg-123",
  "result": {
    "storyId": "story_123",
    "status": "generated",
    "content": "..."
  }
}
```

**Response (Error):**
```json
{
  "jsonrpc": "2.0",
  "id": "msg-123",
  "error": {
    "code": -32602,
    "message": "Invalid params",
    "data": {
      "field": "characterId",
      "reason": "Character not found"
    }
  }
}
```

**Available Methods:**

| Method | Description | Required Scope | Target Agent |
|--------|-------------|----------------|--------------|
| `story.generate` | Generate a therapeutic story | `a2a:write` | Content Agent |
| `emotion.checkin` | Perform emotional check-in | `a2a:write` | Emotion Agent |
| `crisis.detect` | Detect crisis indicators | `a2a:write` | Emotion Agent |
| `library.list` | List user's library items | `a2a:read` | Library Agent |

### 3. Task Delegation

Create a long-running task for asynchronous execution.

**Endpoint:** `POST /a2a/task`

**Authentication:** Required (API Key or OAuth 2.0 Bearer Token)

**Request:**
```json
{
  "method": "story.generate",
  "params": {
    "characterId": "char_123",
    "storyType": "Adventure"
  },
  "clientAgentId": "alexa-agent",
  "sessionId": "session-456"
}
```

**Response:**
```json
{
  "taskId": "task-789",
  "state": "submitted",
  "method": "story.generate",
  "createdAt": "2025-12-17T12:00:00Z",
  "estimatedCompletion": "2025-12-17T12:00:05Z"
}
```

### 4. Task Status

Get the current status of a task.

**Endpoint:** `GET /a2a/status?taskId={taskId}`

**Authentication:** Required (API Key or OAuth 2.0 Bearer Token)

**Query Parameters:**
- `taskId` (required) - The task ID returned from task creation
- `stream` (optional) - Set to `true` to enable SSE streaming

**Response (Standard):**
```json
{
  "taskId": "task-789",
  "state": "working",
  "method": "story.generate",
  "progress": 50,
  "createdAt": "2025-12-17T12:00:00Z",
  "updatedAt": "2025-12-17T12:00:02Z"
}
```

**Response (Completed):**
```json
{
  "taskId": "task-789",
  "state": "completed",
  "method": "story.generate",
  "result": {
    "storyId": "story_123",
    "status": "generated"
  },
  "createdAt": "2025-12-17T12:00:00Z",
  "completedAt": "2025-12-17T12:00:05Z"
}
```

**SSE Streaming:**

To receive real-time updates, include `?stream=true`:

```
GET /a2a/status?taskId=task-789&stream=true
Accept: text/event-stream
```

**SSE Response Format:**
```
data: {"taskId": "task-789", "state": "working", "progress": 25}

data: {"taskId": "task-789", "state": "working", "progress": 50}

data: {"taskId": "task-789", "state": "completed", "result": {...}}
```

### 5. Webhook Notifications

Receive webhook notifications for task events.

**Endpoint:** `POST /a2a/webhook`

**Authentication:** HMAC-SHA256 signature verification

**Request Headers:**
```
X-A2A-Signature: sha256=signature-here
X-A2A-Timestamp: 1702819200
```

**Request Body:**
```json
{
  "event": "task.completed",
  "taskId": "task-789",
  "data": {
    "storyId": "story_123",
    "status": "completed"
  },
  "timestamp": "2025-12-17T12:00:05Z"
}
```

**Webhook Events:**
- `task.completed` - Task completed successfully
- `task.failed` - Task failed with error
- `task.canceled` - Task was canceled
- `task.input_required` - Task requires additional input

## Error Codes

### Standard JSON-RPC 2.0 Error Codes

| Code | Name | Description |
|------|------|-------------|
| -32700 | Parse error | Invalid JSON was received |
| -32600 | Invalid Request | The JSON sent is not a valid Request object |
| -32601 | Method not found | The method does not exist |
| -32602 | Invalid params | Invalid method parameter(s) |
| -32603 | Internal error | Internal JSON-RPC error |

### A2A-Specific Error Codes

| Code | Name | Description |
|------|------|-------------|
| -32000 | Task not found | The specified task ID does not exist |
| -32001 | Task already completed | Task has already been completed |
| -32002 | Task canceled | Task has been canceled |
| -32003 | Invalid task state | Invalid state transition attempted |
| -32004 | Agent not found | The specified agent does not exist |
| -32005 | Capability not supported | The requested capability is not supported |
| -32006 | Authentication failed | Authentication credentials are invalid |
| -32007 | Rate limit exceeded | Rate limit has been exceeded |
| -32008 | Webhook delivery failed | Failed to deliver webhook notification |
| -32009 | Invalid agent card | Agent card validation failed |
| -32010 | Task timeout | Task execution timed out |

## Rate Limiting

Rate limits are enforced per agent (identified by API key or OAuth token):

- **Default:** 60 requests per minute per agent
- **Configurable:** Set via `A2A_RATE_LIMIT_PER_MINUTE` environment variable

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1702819260
```

## Task Lifecycle

Tasks progress through the following states:

1. **submitted** - Task has been created and queued
2. **working** - Task is being processed
3. **input-required** - Task needs additional input from client
4. **completed** - Task completed successfully
5. **failed** - Task failed with an error
6. **canceled** - Task was canceled

**Valid State Transitions:**
- `submitted` → `working`, `canceled`, `failed`
- `working` → `completed`, `failed`, `input-required`, `canceled`
- `input-required` → `working`, `canceled`, `failed`
- Terminal states: `completed`, `failed`, `canceled` (no further transitions)

## Examples

### Example: Generate Story Synchronously

```bash
curl -X POST https://storyintelligence.dev/a2a/message \
  -H "Content-Type: application/json" \
  -H "X-API-Key: [REDACTED_API_KEY]" \
  -d '{
    "jsonrpc": "2.0",
    "id": "req-1",
    "method": "story.generate",
    "params": {
      "characterId": "char_123",
      "storyType": "Adventure"
    }
  }'
```

### Example: Create Asynchronous Task

```bash
curl -X POST https://storyintelligence.dev/a2a/task \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer [REDACTED_JWT]" \
  -d '{
    "method": "story.generate",
    "params": {
      "characterId": "char_123",
      "storyType": "Adventure"
    },
    "clientAgentId": "alexa-agent"
  }'
```

### Example: Check Task Status

```bash
curl -X GET "https://storyintelligence.dev/a2a/status?taskId=task-789" \
  -H "X-API-Key: [REDACTED_API_KEY]"
```

### Example: Stream Task Updates (SSE)

```bash
curl -X GET "https://storyintelligence.dev/a2a/status?taskId=task-789&stream=true" \
  -H "Accept: text/event-stream" \
  -H "X-API-Key: [REDACTED_API_KEY]"
```

## Related Documentation

- **Overview:** `docs/platform/a2a/overview.md`
- **Integration Guide:** `docs/platform/a2a/integration-guide.md`
- **Protocol Specification:** https://a2a-protocol.org/v0.2.0/specification
