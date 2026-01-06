# A2A — SDK / Client Guides — Exhaustive

This document provides practical client integration guidance for A2A:
- discovery
- JSON-RPC 2.0 message calls
- task delegation
- status polling and SSE streaming
- webhook integration

## 1) Base URL selection

Use:
- Production: `https://storyintelligence.dev`
- Staging: `https://api-staging.storytailor.dev`

## 2) HTTP client requirements

Your client must support:
- JSON request/response
- setting custom headers
- SSE (`text/event-stream`) for streaming task updates (optional)

## 3) Canonical TypeScript types

```ts
export type JsonRpcRequest = {
  jsonrpc: '2.0'
  id: string | number | null
  method: string
  params?: Record<string, unknown> | unknown[]
}

export type JsonRpcResponse = {
  jsonrpc: '2.0'
  id: string | number | null
  result?: unknown
  error?: { code: number; message: string; data?: unknown }
}

export type CreateTaskRequest = {
  method: string
  params?: Record<string, unknown>
  clientAgentId: string
  sessionId?: string
}

export type Task = {
  taskId: string
  state: 'submitted' | 'working' | 'input-required' | 'completed' | 'failed' | 'canceled'
  method: string
  params: Record<string, unknown>
  result?: unknown
  error?: { code: number; message: string; data?: unknown }
  sessionId?: string
  clientAgentId: string
  remoteAgentId: string
  createdAt: string
  updatedAt: string
  completedAt?: string
  estimatedCompletion?: string
  progress?: number
}
```

## 4) Node.js / Browser (fetch)

### JSON-RPC call

```js
export async function a2aMessage(baseUrl, payload, { apiKey, bearer } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  if (apiKey) headers['X-API-Key'] = apiKey
  if (bearer) headers['Authorization'] = `Bearer ${bearer}`

  const res = await fetch(`${baseUrl}/a2a/message`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  })

  return await res.json()
}
```

### Create task

```js
export async function a2aCreateTask(baseUrl, body, { apiKey, bearer } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  if (apiKey) headers['X-API-Key'] = apiKey
  if (bearer) headers['Authorization'] = `Bearer ${bearer}`

  const res = await fetch(`${baseUrl}/a2a/task`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  })

  if (!res.ok) throw new Error(`task create failed: ${res.status}`)
  return await res.json()
}
```

### Poll task status

```js
export async function a2aGetStatus(baseUrl, taskId, { apiKey, bearer } = {}) {
  const headers = { Accept: 'application/json' }
  if (apiKey) headers['X-API-Key'] = apiKey
  if (bearer) headers['Authorization'] = `Bearer ${bearer}`

  const res = await fetch(`${baseUrl}/a2a/status?taskId=${encodeURIComponent(taskId)}`, { headers })
  if (!res.ok) throw new Error(`status failed: ${res.status}`)
  return await res.json()
}
```

### SSE (EventSource)

```js
export function a2aStreamStatus(baseUrl, taskId) {
  const url = `${baseUrl}/a2a/status?taskId=${encodeURIComponent(taskId)}`
  const es = new EventSource(url)
  return es
}
```

## 5) Python

```python
import requests

def a2a_message(base_url: str, payload: dict, api_key: str | None = None) -> dict:
    headers = {"Content-Type": "application/json"}
    if api_key:
        headers["X-API-Key"] = api_key
    r = requests.post(f"{base_url}/a2a/message", headers=headers, json=payload, timeout=30)
    r.raise_for_status()
    return r.json()
```

## 6) Webhook receiver

Your service should expose `POST /a2a/webhook` and accept JSON. See `06-webhooks.md`.

## 7) Error handling

Implement handling for:
- JSON-RPC errors (`error.code`, `error.message`)
- HTTP errors for task/status/webhook endpoints

Use `07-error-catalog.md`.
