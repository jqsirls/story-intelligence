# A2A — `GET /a2a/status` (Task Status + SSE) — Exhaustive

This endpoint retrieves the status of an A2A task either as:
- a standard JSON task object, or
- a Server-Sent Events (SSE) stream of task updates.

Source of truth:
- Route wiring + SSE switch: [`packages/universal-agent/src/api/RESTAPIGateway.ts`](../../../../packages/universal-agent/src/api/RESTAPIGateway.ts)
- Task status retrieval + polling: [`packages/a2a-adapter/src/A2AAdapter.ts`](../../../../packages/a2a-adapter/src/A2AAdapter.ts)
- SSE event formatting: [`packages/a2a-adapter/src/SSEStreamer.ts`](../../../../packages/a2a-adapter/src/SSEStreamer.ts)
- Task retrieval (Redis → Supabase fallback): [`packages/a2a-adapter/src/TaskManager.ts`](../../../../packages/a2a-adapter/src/TaskManager.ts)

> Important (production behavior): the gateway selects SSE **only** by inspecting the `Accept` header. There is no `stream=true` query param in the current implementation.

## Endpoint

- **Method**: `GET`
- **Path**: `/a2a/status`

## Request

### Query parameters (Complete)

- `taskId` (required, string)

### Headers (Complete)

For standard JSON:
- `Accept: application/json` (optional)

For SSE:
- `Accept: text/event-stream` (required to enter SSE mode)
- `Last-Event-ID: <string>` (optional; passed through to the SSE streamer)

### cURL — standard JSON

```bash
curl -sS "https://storyintelligence.dev/a2a/status?taskId=TASK_ID" \
  -H "Accept: application/json"
```

### cURL — SSE streaming

```bash
curl -N -sS "https://storyintelligence.dev/a2a/status?taskId=TASK_ID" \
  -H "Accept: text/event-stream"
```

## Response — Standard JSON

### 200 OK — Task status

The response body is a canonical `Task` object.

Example — `submitted`:

```json
{
  "taskId": "task-uuid",
  "state": "submitted",
  "method": "story.generate",
  "params": {"characterId": "char_123", "storyType": "adventure"},
  "clientAgentId": "partner-agent",
  "remoteAgentId": "storytailor-agent",
  "createdAt": "2025-12-18T12:00:00.000Z",
  "updatedAt": "2025-12-18T12:00:00.000Z"
}
```

Example — `working` with progress:

```json
{
  "taskId": "task-uuid",
  "state": "working",
  "method": "story.generate",
  "params": {"characterId": "char_123", "storyType": "adventure"},
  "progress": 50,
  "clientAgentId": "partner-agent",
  "remoteAgentId": "storytailor-agent",
  "createdAt": "2025-12-18T12:00:00.000Z",
  "updatedAt": "2025-12-18T12:00:02.000Z"
}
```

Example — `input-required`:

```json
{
  "taskId": "task-uuid",
  "state": "input-required",
  "method": "story.generate",
  "params": {"characterId": "char_123", "storyType": "adventure"},
  "result": {
    "message": "Which friend should join the hero next?",
    "requiredInput": {
      "field": "friendName",
      "type": "string"
    }
  },
  "clientAgentId": "partner-agent",
  "remoteAgentId": "storytailor-agent",
  "createdAt": "2025-12-18T12:00:00.000Z",
  "updatedAt": "2025-12-18T12:00:05.000Z"
}
```

Example — `completed`:

```json
{
  "taskId": "task-uuid",
  "state": "completed",
  "method": "story.generate",
  "params": {"characterId": "char_123", "storyType": "adventure"},
  "result": {
    "message": "Here’s your story!",
    "speechText": "Here’s your story!",
    "audioUrl": "https://...",
    "conversationPhase": "story_building"
  },
  "clientAgentId": "partner-agent",
  "remoteAgentId": "storytailor-agent",
  "createdAt": "2025-12-18T12:00:00.000Z",
  "updatedAt": "2025-12-18T12:00:10.000Z",
  "completedAt": "2025-12-18T12:00:10.000Z"
}
```

Example — `failed`:

```json
{
  "taskId": "task-uuid",
  "state": "failed",
  "method": "story.generate",
  "params": {"characterId": "char_123", "storyType": "adventure"},
  "error": {
    "code": -32010,
    "message": "Task timed out",
    "data": {"timeoutMs": 300000}
  },
  "clientAgentId": "partner-agent",
  "remoteAgentId": "storytailor-agent",
  "createdAt": "2025-12-18T12:00:00.000Z",
  "updatedAt": "2025-12-18T12:05:00.000Z",
  "completedAt": "2025-12-18T12:05:00.000Z"
}
```

Example — `canceled`:

```json
{
  "taskId": "task-uuid",
  "state": "canceled",
  "method": "story.generate",
  "params": {"characterId": "char_123", "storyType": "adventure"},
  "clientAgentId": "partner-agent",
  "remoteAgentId": "storytailor-agent",
  "createdAt": "2025-12-18T12:00:00.000Z",
  "updatedAt": "2025-12-18T12:00:03.000Z",
  "completedAt": "2025-12-18T12:00:03.000Z"
}
```

### 400 Bad Request — missing `taskId`

```json
{
  "error": "Task ID is required",
  "message": "Query parameter taskId is required"
}
```

### 503 Service Unavailable — adapter unavailable

```json
{
  "error": "A2A adapter not available",
  "message": "A2A adapter not initialized"
}
```

### 500 Internal Server Error — status check failed (includes task-not-found)

In the non-SSE path, *any* thrown error becomes a 500 with a string message. This includes `Task not found`.

```json
{
  "error": "Failed to get task status",
  "message": "Task TASK_ID not found"
}
```

## Response — SSE Streaming

### Triggering SSE mode

SSE mode is selected when the gateway sees `Accept` containing `text/event-stream`.

SSE headers are set by both the gateway and the streamer:
- `Content-Type: text/event-stream`
- `Cache-Control: no-cache`
- `Connection: keep-alive`
- `X-Accel-Buffering: no`

### SSE event types (Complete)

The streamer emits these event types:

1) `connected`
- emitted once immediately upon stream setup
- data: `{ "taskId": "..." }`

2) `reconnected`
- emitted if the client provides `Last-Event-ID`
- data: `{ "taskId": "...", "lastEventId": "..." }`

3) `heartbeat`
- emitted every 30 seconds
- data: `{ "timestamp": "ISO-8601" }`

4) `task.update`
- emitted when the polling loop fetches a task object
- data includes:
  - `taskId`, `state`, `progress`, `result`, `error`, `updatedAt`

5) `task.complete`
- emitted when the task reaches a terminal state (`completed`, `failed`, `canceled`)
- emitted once and then the server closes the stream ~1 second later

### SSE event IDs (Important)

For `task.update` and `task.complete`, the streamer uses `id: <taskId>`.

That means:
- All updates share the same `id`.
- `Last-Event-ID` reconnection does not allow replaying “missed” updates (there is no per-update ID).

### Example raw SSE stream

```text
event: connected
data: {"taskId":"task-uuid"}


event: heartbeat
data: {"timestamp":"2025-12-18T12:00:30.000Z"}

id: task-uuid
event: task.update
data: {"taskId":"task-uuid","state":"working","progress":25,"result":null,"error":null,"updatedAt":"2025-12-18T12:00:01.000Z"}

id: task-uuid
event: task.update
data: {"taskId":"task-uuid","state":"working","progress":50,"result":null,"error":null,"updatedAt":"2025-12-18T12:00:02.000Z"}

id: task-uuid
event: task.update
data: {"taskId":"task-uuid","state":"completed","progress":100,"result":{"message":"Here’s your story!"},"error":null,"updatedAt":"2025-12-18T12:00:05.000Z"}

id: task-uuid
event: task.complete
data: {"taskId":"task-uuid","state":"completed","progress":100,"result":{"message":"Here’s your story!"},"error":null,"updatedAt":"2025-12-18T12:00:05.000Z"}

```

### SSE edge cases (Complete)

#### Task does not exist

Current behavior:
- The stream still sends `connected` and heartbeats.
- The polling loop clears its interval when `getTask` returns null.
- The stream remains open (heartbeats continue) until the client disconnects.

Clients SHOULD implement a client-side timeout if no `task.update` arrives within an expected window.

#### Polling frequency

The adapter polls once per second.

## Multi-language SSE clients

### JavaScript (EventSource)

```js
export function streamTask(baseUrl, taskId) {
  const url = `${baseUrl}/a2a/status?taskId=${encodeURIComponent(taskId)}`
  const es = new EventSource(url)

  es.addEventListener('connected', (e) => console.log('connected', e.data))
  es.addEventListener('reconnected', (e) => console.log('reconnected', e.data))
  es.addEventListener('heartbeat', (e) => console.log('heartbeat', e.data))
  es.addEventListener('task.update', (e) => console.log('update', e.data))
  es.addEventListener('task.complete', (e) => {
    console.log('complete', e.data)
    es.close()
  })

  es.onerror = (err) => {
    console.error('sse error', err)
    es.close()
  }

  return es
}
```

### Python (sseclient)

```python
import requests

# Example: basic manual SSE loop (no external deps)

def stream_task(base_url: str, task_id: str):
    url = f"{base_url}/a2a/status?taskId={task_id}"
    with requests.get(url, headers={"Accept": "text/event-stream"}, stream=True, timeout=60) as r:
        r.raise_for_status()
        for line in r.iter_lines(decode_unicode=True):
            if line:
                print(line)
```
