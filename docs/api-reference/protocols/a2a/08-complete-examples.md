# A2A — Complete Examples (End-to-End) — Exhaustive

This document provides copy/paste-ready A2A flows covering:
- discovery
- synchronous JSON-RPC messaging
- asynchronous task delegation
- task status polling and SSE
- webhook receipt and delivery patterns
- error and recovery flows

## Example 1 — Discovery → JSON-RPC call (`emotion.checkin`) → success

### 1.1 Discover

```bash
curl -sS -X GET "https://storyintelligence.dev/a2a/discovery" \
  -H "Accept: application/json"
```

Expected:
- `200` with `{ agentCard: ... }`

### 1.2 Call `emotion.checkin`

```bash
curl -sS -X POST "https://storyintelligence.dev/a2a/message" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": "flow1-emo-1",
    "method": "emotion.checkin",
    "params": {
      "message": "I feel nervous about tomorrow"
    }
  }'
```

Expected:

```json
{
  "jsonrpc": "2.0",
  "id": "flow1-emo-1",
  "result": {
    "message": "Thanks for telling me. Want to talk about what’s making you nervous?",
    "speechText": "Thanks for telling me. Want to talk about what’s making you nervous?",
    "displayText": "Thanks for telling me. Want to talk about what’s making you nervous?",
    "conversationPhase": "checkin",
    "visualElements": [],
    "audioUrl": null
  }
}
```

## Example 2 — JSON-RPC method not found → `-32601`

```bash
curl -sS -X POST "https://storyintelligence.dev/a2a/message" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": "flow2-nf-1",
    "method": "story.delete",
    "params": {}
  }'
```

Expected:

```json
{
  "jsonrpc": "2.0",
  "id": "flow2-nf-1",
  "error": {
    "code": -32601,
    "message": "Method not found: story.delete"
  }
}
```

## Example 3 — Asynchronous task (`story.generate`) → poll JSON until completed

### 3.1 Create task

```bash
curl -sS -X POST "https://storyintelligence.dev/a2a/task" \
  -H "Content-Type: application/json" \
  -d '{
    "method": "story.generate",
    "params": {
      "characterId": "char_123",
      "storyType": "adventure",
      "userInput": "Make it about bravery"
    },
    "clientAgentId": "partner-agent",
    "sessionId": "session-456"
  }'
```

Expected:

```json
{
  "taskId": "TASK_ID",
  "state": "submitted",
  "method": "story.generate",
  "params": {
    "characterId": "char_123",
    "storyType": "adventure",
    "userInput": "Make it about bravery"
  },
  "clientAgentId": "partner-agent",
  "remoteAgentId": "storytailor-agent",
  "sessionId": "session-456",
  "createdAt": "...",
  "updatedAt": "..."
}
```

### 3.2 Poll status

```bash
curl -sS "https://storyintelligence.dev/a2a/status?taskId=TASK_ID" \
  -H "Accept: application/json"
```

Possible intermediate response (`working`):

```json
{
  "taskId": "TASK_ID",
  "state": "working",
  "method": "story.generate",
  "params": {"characterId": "char_123", "storyType": "adventure", "userInput": "Make it about bravery"},
  "progress": 25,
  "clientAgentId": "partner-agent",
  "remoteAgentId": "storytailor-agent",
  "createdAt": "...",
  "updatedAt": "..."
}
```

Terminal response (`completed`):

```json
{
  "taskId": "TASK_ID",
  "state": "completed",
  "method": "story.generate",
  "params": {"characterId": "char_123", "storyType": "adventure", "userInput": "Make it about bravery"},
  "result": {
    "message": "Here’s your story!",
    "speechText": "Here’s your story!",
    "audioUrl": "https://...",
    "conversationPhase": "story_building"
  },
  "clientAgentId": "partner-agent",
  "remoteAgentId": "storytailor-agent",
  "createdAt": "...",
  "updatedAt": "...",
  "completedAt": "..."
}
```

## Example 4 — Asynchronous task → SSE streaming

```bash
curl -N -sS "https://storyintelligence.dev/a2a/status?taskId=TASK_ID" \
  -H "Accept: text/event-stream"
```

You should observe:
- `connected`
- periodic `heartbeat`
- one or more `task.update`
- terminal `task.complete`

## Example 5 — Task timeout

Task timeout can occur via:
- the task manager timer (configured by `A2A_TASK_TIMEOUT_MS`), or
- the async executor catch-all mapping (which uses the same code)

Terminal timeout error example:

```json
{
  "taskId": "TASK_ID",
  "state": "failed",
  "method": "story.generate",
  "params": {"characterId": "char_123", "storyType": "adventure"},
  "error": {
    "code": -32010,
    "message": "Task timed out",
    "data": {"timeoutMs": 300000}
  },
  "createdAt": "...",
  "updatedAt": "...",
  "completedAt": "..."
}
```

Recovery strategies:
- create a new task with identical params
- consider using shorter stories or fewer assets
- implement client-side retry with backoff

## Example 6 — Webhook receipt

### 6.1 Send webhook to Storytailor

```bash
curl -sS -X POST "https://storyintelligence.dev/a2a/webhook" \
  -H "Content-Type: application/json" \
  -d '{
    "event": "task.completed",
    "taskId": "TASK_ID",
    "data": {"result": {"message": "done"}},
    "timestamp": "2025-12-18T12:00:05.000Z"
  }'
```

Expected:

```json
{ "success": true }
```

### 6.2 Invalid webhook payload

```bash
curl -sS -X POST "https://storyintelligence.dev/a2a/webhook" \
  -H "Content-Type: application/json" \
  -d '"not-an-object"'
```

Expected:

```json
{
  "error": "Failed to process webhook",
  "message": "Invalid webhook payload: must be an object"
}
```

## Example 7 — Library list (JSON-RPC)

```bash
curl -sS -X POST "https://storyintelligence.dev/a2a/message" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": "lib-flow-1",
    "method": "library.list",
    "params": {
      "limit": 10,
      "offset": 0
    }
  }'
```

Expected result shape depends on downstream library agent. The adapter returns `agentResponse.data` only.

## Example 8 — JSON-RPC invalid request

```bash
curl -sS -X POST "https://storyintelligence.dev/a2a/message" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": {"not": "valid"},
    "method": "emotion.checkin",
    "params": {}
  }'
```

Expected:

```json
{
  "jsonrpc": "2.0",
  "id": null,
  "error": {
    "code": -32600,
    "message": "Invalid JSON-RPC request: id must be string, number, or null"
  }
}
```

## Multi-language end-to-end example (TypeScript)

```ts
type JsonRpcRequest = {
  jsonrpc: '2.0'
  id: string | number | null
  method: string
  params?: Record<string, unknown> | unknown[]
}

type JsonRpcResponse = {
  jsonrpc: '2.0'
  id: string | number | null
  result?: unknown
  error?: { code: number; message: string; data?: unknown }
}

export async function createTask(baseUrl: string, body: any) {
  const res = await fetch(`${baseUrl}/a2a/task`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  if (!res.ok) throw new Error(`task create failed: ${res.status}`)
  return await res.json()
}

export async function getStatus(baseUrl: string, taskId: string) {
  const res = await fetch(`${baseUrl}/a2a/status?taskId=${encodeURIComponent(taskId)}`, {
    headers: { Accept: 'application/json' }
  })
  if (!res.ok) throw new Error(`status failed: ${res.status}`)
  return await res.json()
}

export async function callMessage(baseUrl: string, req: JsonRpcRequest): Promise<JsonRpcResponse> {
  const res = await fetch(`${baseUrl}/a2a/message`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req)
  })
  return (await res.json()) as JsonRpcResponse
}
```
