# REST API — Conversation Endpoints — Exhaustive

> **Contract Precedence (Product REST API)**: Treat `docs/api/REST_API_EXPERIENCE_MASTER.md` as canonical for the product REST API contract.

Source of truth:
- Conversation routes: [`lambda-deployments/universal-agent/src/api/RESTAPIGateway.ts`](../../../../lambda-deployments/universal-agent/src/api/RESTAPIGateway.ts)

All conversation endpoints require:
- `Authorization: Bearer [REDACTED_JWT]

## 1) Start conversation — `POST /api/v1/conversations/start`

### Request body (accepted)

```json
{
  "channel": "string (optional)",
  "sessionId": "string (optional)",
  "metadata": {"any": "json"}
}
```

Channel normalization (exact):
- `normalizedChannel = channel || 'api'`
- `normalizedPlatform = normalizedChannel === 'api' ? 'api' : normalizedChannel`

### Responses

#### 201 Created — success

```json
{
  "success": true,
  "data": {
    "sessionId": "string",
    "state": {
      "phase": "string",
      "currentStory": {},
      "context": {}
    },
    "startedAt": "ISO-8601",
    "expiresAt": "ISO-8601"
  }
}
```

#### 503 Service Unavailable — conversation service missing

If `storytellerAPI.startConversation` is not available:

```json
{
  "success": false,
  "error": "Conversation service not available",
  "code": "SERVICE_UNAVAILABLE"
}
```

#### 500 Internal Server Error

```json
{
  "success": false,
  "error": "(error message)",
  "code": "START_CONVERSATION_FAILED"
}
```

### Persistence side-effect

On success, the gateway *attempts* to upsert into `conversation_sessions`:

- `session_id`: `session.sessionId`
- `user_id`: `userId`
- `conversation_phase`: `session.state.phase || 'initial'`
- `story_state`: `session.state.currentStory || {}`
- `conversation_context`: `session.state.context || {}`
- `device_history`: `[]`
- `user_context`: `metadata || {}`
- `created_at`: `session.startedAt`
- `expires_at`: `session.expiresAt`

If persistence fails, the gateway logs a warning and **still returns 201**.

## 2) Send message — `POST /api/v1/conversations/:sessionId/message`

### Path parameter

- `sessionId` (required)

### Request body

```json
{
  "message": "string",
  "messageType": "string (optional)",
  "metadata": {"any": "json"}
}
```

The gateway calls `storytellerAPI.sendMessage(sessionId, { type, content, metadata })` with:
- `type = messageType || 'text'`
- `content = message`
- `metadata = metadata || {}`

### Responses

#### 200 OK

```json
{
  "success": true,
  "data": {
    "any": "conversation response object"
  }
}
```

#### 503 Service Unavailable

```json
{
  "success": false,
  "error": "Conversation service not available",
  "code": "SERVICE_UNAVAILABLE"
}
```

#### 500 Internal Server Error

```json
{
  "success": false,
  "error": "(error message)",
  "code": "SEND_MESSAGE_FAILED"
}
```

## 3) Get conversation session — `GET /api/v1/conversations/:sessionId`

### Path parameter

- `sessionId` (required)

### Behavior

Queries Supabase table `conversation_sessions` by:
- `session_id = :sessionId` (text)
- `user_id = current user`

### Responses

#### 200 OK

```json
{
  "success": true,
  "data": {"session_id": "...", "conversation_phase": "...", "story_state": {}}
}
```

#### 404 Not Found (intended)

```json
{
  "success": false,
  "error": "Session SESSION_ID not found",
  "code": "SESSION_NOT_FOUND"
}
```

#### 500 Internal Server Error

```json
{
  "success": false,
  "error": "(error message)",
  "code": "GET_SESSION_FAILED"
}
```

## 4) End conversation — `POST /api/v1/conversations/:sessionId/end`

### Behavior

- Calls `storytellerAPI.endConversation(sessionId)` if available.
- Updates Supabase `conversation_sessions` setting `conversation_phase: 'ended'` filtered by `session_id` and `user_id`.

### Response

#### 200 OK

```json
{
  "success": true,
  "message": "Conversation ended successfully"
}
```

#### 500 Internal Server Error

```json
{
  "success": false,
  "error": "(error message)",
  "code": "END_CONVERSATION_FAILED"
}
```

## 5) Clear conversation assets — `POST /api/v1/conversations/:sessionId/assets/clear`

### Request body

```json
{
  "assets": [
    {"type": "string", "id": "string", "url": "string"}
  ]
}
```

If `assets` is missing, an empty array is used.

### Response

#### 200 OK

```json
{
  "success": true,
  "message": "Conversation assets cleared successfully"
}
```

#### 500 Internal Server Error

```json
{
  "success": false,
  "error": "(error message)",
  "code": "ASSET_CLEANUP_FAILED"
}
```

## Examples

### cURL — start

```bash
curl -sS -X POST "https://api.storytailor.dev/api/v1/conversations/start" \
  -H "Authorization: Bearer [REDACTED_JWT]" \
  -H "Content-Type: application/json" \
  -d '{
    "channel": "api",
    "metadata": {"locale": "en-US"}
  }'
```

### cURL — send message

```bash
curl -sS -X POST "https://api.storytailor.dev/api/v1/conversations/SESSION_ID/message" \
  -H "Authorization: Bearer [REDACTED_JWT]" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Tell me a bedtime story",
    "messageType": "text",
    "metadata": {}
  }'
```
