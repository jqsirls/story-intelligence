# A2A — `POST /a2a/task` (Task Delegation) — Exhaustive

This endpoint creates an A2A **Task** for asynchronous execution. Long-running methods are executed automatically; other methods may remain queued/submitted depending on method classification.

Source of truth:
- Route wiring + validation: [`packages/universal-agent/src/api/RESTAPIGateway.ts`](../../../../packages/universal-agent/src/api/RESTAPIGateway.ts)
- A2A adapter orchestration: [`packages/a2a-adapter/src/A2AAdapter.ts`](../../../../packages/a2a-adapter/src/A2AAdapter.ts)
- Task state machine + storage: [`packages/a2a-adapter/src/TaskManager.ts`](../../../../packages/a2a-adapter/src/TaskManager.ts)
- Canonical types: [`packages/a2a-adapter/src/types.ts`](../../../../packages/a2a-adapter/src/types.ts)

> Important (production behavior): the current gateway does not call the Authentication subsystem for this endpoint. Clients should still send credentials for policy compliance and future enforcement. See `01-authentication.md`.

## Endpoint

- **Method**: `POST`
- **Path**: `/a2a/task`
- **Content-Type**: `application/json`

## Request Body (Complete)

The gateway parses the request body as:

```json
{
  "method": "string",
  "params": {"any": "json"},
  "clientAgentId": "string",
  "sessionId": "string (optional)"
}
```

### Field requirements

- `method` (required): string
- `clientAgentId` (required): string
- `params` (optional): object; defaults to `{}` if omitted
- `sessionId` (optional): string

### Example request

```json
{
  "method": "story.generate",
  "params": {
    "characterId": "char_123",
    "storyType": "adventure",
    "userInput": "Make it about patience"
  },
  "clientAgentId": "partner-agent",
  "sessionId": "session-456"
}
```

### cURL

```bash
curl -sS -X POST "https://storyintelligence.dev/a2a/task" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: [REDACTED_API_KEY]" \
  -d '{
    "method": "story.generate",
    "params": {
      "characterId": "char_123",
      "storyType": "adventure",
      "userInput": "Make it about patience"
    },
    "clientAgentId": "partner-agent",
    "sessionId": "session-456"
  }'
```

## Response (Complete)

### 200 OK — Task created

The gateway returns the task object as JSON.

#### Task object (canonical)

```json
{
  "taskId": "uuid",
  "state": "submitted|working|input-required|completed|failed|canceled",
  "method": "string",
  "params": {"any": "json"},
  "result": {"any": "json"},
  "error": {"code": -32010, "message": "string", "data": {"any": "json"}},
  "sessionId": "string",
  "clientAgentId": "string",
  "remoteAgentId": "string",
  "createdAt": "ISO-8601",
  "updatedAt": "ISO-8601",
  "completedAt": "ISO-8601",
  "estimatedCompletion": "ISO-8601",
  "progress": 0
}
```

#### Example response (immediately after create)

```json
{
  "taskId": "7c52c6bd-1f6c-4c2f-9b8f-0a1ef0c2ef01",
  "state": "submitted",
  "method": "story.generate",
  "params": {
    "characterId": "char_123",
    "storyType": "adventure",
    "userInput": "Make it about patience"
  },
  "clientAgentId": "partner-agent",
  "remoteAgentId": "storytailor-agent",
  "sessionId": "session-456",
  "createdAt": "2025-12-18T12:00:00.000Z",
  "updatedAt": "2025-12-18T12:00:00.000Z"
}
```

### Automatic execution classification (Exact)

After the task is created, the adapter decides whether to execute it automatically based on:

```ts
return method.startsWith('story.') || method.startsWith('character.')
```

Therefore:

- Automatically executed (async) methods:
  - any `story.*`
  - any `character.*`

- Not automatically executed by this hook:
  - `emotion.checkin`
  - `crisis.detect`
  - `library.list`
  - `library.get`
  - `library.share`

If you submit a method that is **not** auto-executed, the task may remain in `submitted` unless another worker/process updates its state.

### Execution state race conditions (Complete)

Because async execution starts immediately after `createTask` returns, there are valid timing windows where:

- The create response is `submitted`, but within milliseconds the task becomes `working`.
- The client’s first status poll can observe:
  - `submitted` (if poll is very fast)
  - `working`
  - `completed` (if the operation finishes extremely fast)
  - `failed` (if it fails quickly)

Your client must treat these as normal and rely on state-machine semantics.

## Storage (Complete)

Tasks are stored in both Redis (fast cache) and Supabase (persistence).

### Redis

- Key format: `${redisKeyPrefix || 'a2a'}:task:${taskId}`
- TTL: 24 hours (`86400` seconds)

### Supabase

Tasks are upserted into table: `a2a_tasks` with `onConflict: 'task_id'`.

Field mapping (exact):

- `task.taskId` → `task_id`
- `task.state` → `state`
- `task.clientAgentId` → `client_agent_id`
- `task.remoteAgentId` → `remote_agent_id`
- `task.method` → `method`
- `task.params` → `params`
- `task.result || null` → `result`
- `task.error || null` → `error`
- `task.sessionId || null` → `session_id`
- `task.createdAt` → `created_at`
- `task.updatedAt` → `updated_at`
- `task.completedAt || null` → `completed_at`

Supabase persistence is **best-effort**:
- Supabase operations have a hard timeout of 10 seconds.
- Retries: up to 3 attempts with exponential backoff (max 5 seconds).
- If the final failure is a network error, the system **does not throw** and continues with **Redis-only storage**.

## Timeouts (Complete)

There are two distinct timeout mechanisms:

1) **TaskManager timeout** (timer scheduled on task creation)
- Enabled when `taskTimeoutMs` is configured (gateway sets it from `A2A_TASK_TIMEOUT_MS`, default `300000`)
- When the timer fires, it updates the task to:
  - `state: failed`
  - `error.code: -32010` (`TASK_TIMEOUT`)
  - `error.message: 'Task timed out'`
  - `error.data: { timeoutMs }`

2) **Async executor catch-all error mapping**
- If async execution throws for any reason, the adapter updates the task to failed with:
  - `error.code: -32010` (`TASK_TIMEOUT`) **even if the failure is not a timeout**
  - `error.message: <error message>`

Clients should therefore treat `-32010` as “task execution failed/timeout-class error” in the current implementation.

## Error Responses (All variants)

### 400 Bad Request — missing `method`

```json
{
  "error": "Method is required",
  "message": "Task must include method field"
}
```

### 400 Bad Request — missing `clientAgentId`

```json
{
  "error": "Client agent ID is required",
  "message": "Task must include clientAgentId field"
}
```

### 503 Service Unavailable — adapter unavailable

```json
{
  "error": "A2A adapter not available",
  "message": "A2A adapter not initialized"
}
```

### 500 Internal Server Error — task creation failed

```json
{
  "error": "Failed to create task",
  "message": "(error message)"
}
```

## Multi-language Examples

### JavaScript (fetch)

```js
export async function createA2ATask(baseUrl, apiKey, body) {
  const res = await fetch(`${baseUrl}/a2a/task`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey
    },
    body: JSON.stringify(body)
  })

  const json = await res.json().catch(() => null)
  if (!res.ok) {
    throw new Error(`task create failed: ${res.status} ${JSON.stringify(json)}`)
  }

  return json
}
```

### Python (requests)

```python
import requests

def create_a2a_task(base_url: str, api_key: str, body: dict) -> dict:
    r = requests.post(
        f"{base_url}/a2a/task",
        headers={
            "Content-Type": "application/json",
            "X-API-Key": api_key,
        },
        json=body,
        timeout=30,
    )
    r.raise_for_status()
    return r.json()
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

func CreateTask(baseUrl string, apiKey string, body any) (*http.Response, []byte, error) {
  b, err := json.Marshal(body)
  if err != nil {
    return nil, nil, err
  }

  req, err := http.NewRequest("POST", baseUrl+"/a2a/task", bytes.NewReader(b))
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

  out, err := io.ReadAll(res.Body)
  if err != nil {
    return res, nil, err
  }

  return res, out, nil
}
```

## Next

- Task status polling and SSE streaming: `05-task-status.md`
