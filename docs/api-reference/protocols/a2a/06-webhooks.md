# A2A — `POST /a2a/webhook` (Webhook Receipt) — Exhaustive

This endpoint receives webhook notifications.

Source of truth:
- Route wiring: [`packages/universal-agent/src/api/RESTAPIGateway.ts`](../../../../packages/universal-agent/src/api/RESTAPIGateway.ts)
- Webhook handler (receive + deliver): [`packages/a2a-adapter/src/WebhookHandler.ts`](../../../../packages/a2a-adapter/src/WebhookHandler.ts)

> Important (production behavior): the gateway calls `a2aAdapter.handleWebhook(req.body, req.headers)` which invokes `receiveWebhook(payload, headers)` **without a secret**, so **signature verification is not enforced** in the current implementation.

## Endpoint

- **Method**: `POST`
- **Path**: `/a2a/webhook`
- **Content-Type**: `application/json`

## Incoming Webhook Event (Canonical)

The receiver expects a JSON object with:

- `event` (required, string)
- `timestamp` (required, string; typically ISO-8601)
- `taskId` (optional, string)
- `data` (optional, object; defaults to `{}`)

Canonical type:

```ts
export interface A2AWebhookEvent {
  event: string
  taskId?: string
  data: Record<string, unknown>
  timestamp: string
}
```

### Example incoming webhook

```json
{
  "event": "task.completed",
  "taskId": "7c52c6bd-1f6c-4c2f-9b8f-0a1ef0c2ef01",
  "data": {
    "result": {
      "message": "Here’s your story!",
      "audioUrl": "https://..."
    }
  },
  "timestamp": "2025-12-18T12:00:05.000Z"
}
```

## Headers

### Accepted signature header (if signature verification is enabled)

If the receiver is configured to validate signatures (by passing a `secret` to `receiveWebhook`), it reads:

- `x-a2a-signature`
- `X-A2A-Signature`

Signature format:

- `sha256=<hex>`

Example:

```text
X-A2A-Signature: sha256=0123456789abcdef...
```

> Note: the current REST gateway does not pass a secret, so missing/invalid signature does not cause rejection.

## Response

### 200 OK — accepted

If the webhook payload validates (object + has `event` string + `timestamp` string):

```json
{ "success": true }
```

### 503 Service Unavailable — adapter unavailable

```json
{
  "error": "A2A adapter not available",
  "message": "A2A adapter not initialized"
}
```

### 500 Internal Server Error — invalid payload or processing error

If validation fails or the receiver throws:

```json
{
  "error": "Failed to process webhook",
  "message": "(error message)"
}
```

## Receiver-side Validation (Complete)

The webhook receiver rejects (throws) if:

1) Payload is not an object
- Error: `Invalid webhook payload: must be an object`

2) `event.event` is not a string
- Error: `Invalid webhook: missing or invalid event field`

3) `event.timestamp` missing or not a string
- Error: `Invalid webhook: missing or invalid timestamp field`

4) Signature verification enabled (secret provided) and signature missing
- Error: `Webhook signature missing`

5) Signature verification enabled and signature invalid
- Error: `Webhook signature verification failed`

## Outgoing Webhook Delivery (Complete)

The A2A adapter can deliver webhooks using `deliverWebhook(url, event, secret?, maxRetries?)`.

Outgoing delivery behavior:

- **HTTP method**: POST
- **Timeout**: 10 seconds
- **Success criteria**: any 2xx status code
- **Retries**:
  - default max retries: 3
  - exponential backoff (no jitter): `min(1000 * 2^(attempt-1), 30000)`
  - does not retry on 4xx

Outgoing headers:
- `Content-Type: application/json`
- `User-Agent: Storytailor-A2A-Webhook/1.0`
- optional `X-A2A-Signature` if secret provided

### Outgoing events (observed)

When async tasks complete successfully, the adapter sends:

- `event: task.completed`
- `taskId: <taskId>`
- `data: { result: <result> }`
- `timestamp: <ISO-8601>`

> Note: the current async executor does not send `task.failed` or `task.canceled` outgoing webhooks.

## Multi-language Examples

### cURL (send webhook to Storytailor)

```bash
curl -sS -X POST "https://storyintelligence.dev/a2a/webhook" \
  -H "Content-Type: application/json" \
  -d '{
    "event": "task.completed",
    "taskId": "7c52c6bd-1f6c-4c2f-9b8f-0a1ef0c2ef01",
    "data": {"result": {"message": "done"}},
    "timestamp": "2025-12-18T12:00:05.000Z"
  }'
```

### JavaScript (Express handler)

```js
import express from 'express'

const app = express()
app.use(express.json())

app.post('/a2a/webhook', (req, res) => {
  const evt = req.body
  // Validate and process
  res.json({ success: true })
})
```

### Python (FastAPI handler)

```python
from fastapi import FastAPI

app = FastAPI()

@app.post("/a2a/webhook")
def webhook(evt: dict):
    # Validate and process
    return {"success": True}
```

## Signature Algorithm (Exact)

If enabled, signatures are HMAC-SHA256 over the raw JSON payload string:

- Signature header value: `sha256=<hex>`
- Comparison uses timing-safe equality

Pseudo:

```text
expected = "sha256=" + HMAC_SHA256(secret, payload_json_string).hex()
valid = timingSafeEqual(signature_header, expected)
```
