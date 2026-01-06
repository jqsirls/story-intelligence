# A2A — Error Catalog (JSON-RPC + A2A-specific) — Exhaustive

This is the complete catalog of **all A2A error codes** defined by the production type system, plus the **transport-level HTTP error variants** used by A2A endpoints.

Source of truth:
- Enumerations + error mapping: [`packages/a2a-adapter/src/types.ts`](../../../../packages/a2a-adapter/src/types.ts)
- JSON-RPC request validation and dispatch: [`packages/a2a-adapter/src/JsonRpcHandler.ts`](../../../../packages/a2a-adapter/src/JsonRpcHandler.ts)
- Task lifecycle and state machine errors: [`packages/a2a-adapter/src/TaskManager.ts`](../../../../packages/a2a-adapter/src/TaskManager.ts)
- Router mapping errors: [`packages/a2a-adapter/src/RouterIntegration.ts`](../../../../packages/a2a-adapter/src/RouterIntegration.ts)
- Gateway-level A2A endpoint wrappers: [`packages/universal-agent/src/api/RESTAPIGateway.ts`](../../../../packages/universal-agent/src/api/RESTAPIGateway.ts)

## Error Formats (Canonical)

### JSON-RPC error envelope

Used by `POST /a2a/message`:

```json
{
  "jsonrpc": "2.0",
  "id": "string|number|null",
  "error": {
    "code": -32603,
    "message": "string",
    "data": {
      "any": "json"
    }
  }
}
```

### Task error object

Tasks store errors as `JsonRpcError` objects:

```json
{
  "code": -32010,
  "message": "Task timed out",
  "data": {"timeoutMs": 300000}
}
```

### Gateway HTTP error object

Used by non-JSON-RPC endpoints (`/a2a/task`, `/a2a/status`, `/a2a/webhook`, `/a2a/discovery`):

```json
{
  "error": "string",
  "message": "string"
}
```

## JSON-RPC Standard Error Codes (Complete)

These codes are emitted by the JSON-RPC handler.

### -32700 — Parse error

**Name**: `PARSE_ERROR`

**Where emitted**:
- `JsonRpcHandler.validateRequest()` when the request is not an object.

**Example request** (invalid):

```json
"not-an-object"
```

**Example response**:

```json
{
  "jsonrpc": "2.0",
  "id": null,
  "error": {
    "code": -32700,
    "message": "Invalid JSON-RPC request: request must be an object"
  }
}
```

**Common causes (exhaustive)**
- Client sends JSON string instead of object
- Client sends number/boolean/null
- Client sends empty body but gateway still forwards an invalid value

### -32600 — Invalid Request

**Name**: `INVALID_REQUEST`

**Where emitted**:
- Wrong `jsonrpc` version
- Missing/invalid `method`
- Invalid `id` type

**Example request** (wrong version):

```json
{
  "jsonrpc": "1.0",
  "id": "inv-1",
  "method": "emotion.checkin",
  "params": {}
}
```

**Example response**:

```json
{
  "jsonrpc": "2.0",
  "id": "inv-1",
  "error": {
    "code": -32600,
    "message": "Invalid JSON-RPC version: must be \"2.0\""
  }
}
```

**Example request** (invalid method):

```json
{
  "jsonrpc": "2.0",
  "id": "inv-2",
  "method": "",
  "params": {}
}
```

**Example response**:

```json
{
  "jsonrpc": "2.0",
  "id": "inv-2",
  "error": {
    "code": -32600,
    "message": "Invalid JSON-RPC request: method must be a non-empty string"
  }
}
```

### -32601 — Method not found

**Name**: `METHOD_NOT_FOUND`

**Where emitted**:
- JSON-RPC handler when the method is not registered.

**Example request**:

```json
{
  "jsonrpc": "2.0",
  "id": "nf-1",
  "method": "story.delete",
  "params": {}
}
```

**Example response**:

```json
{
  "jsonrpc": "2.0",
  "id": "nf-1",
  "error": {
    "code": -32601,
    "message": "Method not found: story.delete"
  }
}
```

### -32602 — Invalid params

**Name**: `INVALID_PARAMS`

**Where emitted**:
- When a registered method handler throws a non-A2A error whose message includes the substring `params`.

**Example response** (shape):

```json
{
  "jsonrpc": "2.0",
  "id": "ip-1",
  "error": {
    "code": -32602,
    "message": "Invalid params: (handler error message)"
  }
}
```

**Important**: The JSON-RPC handler does not enforce parameter schemas; invalid params are detected indirectly from downstream errors.

### -32603 — Internal error

**Name**: `INTERNAL_ERROR`

**Where emitted**:
- When the handler throws a non-A2A error not classified as invalid params
- When gateway-level wrapper throws for `/a2a/message`

**Example response**:

```json
{
  "jsonrpc": "2.0",
  "id": "ie-1",
  "error": {
    "code": -32603,
    "message": "Internal error executing method emotion.checkin: (details)"
  }
}
```

**Mapping rule**: non-A2A errors become:

```json
{
  "code": -32603,
  "message": "<error.message or 'Internal error'>",
  "data": { "type": "<ErrorConstructorName>" }
}
```

## A2A-Specific Error Codes (Complete)

These are defined by the type system. Some are emitted by current code; others are reserved.

### -32000 — Task not found

**Name**: `TASK_NOT_FOUND`

**Where emitted**:
- `A2AAdapter.getTaskStatus(taskId)` if `TaskManager.getTask()` returns null.
- `TaskManager.updateTaskState`, `cancelTask`, `updateProgress` if task doesn’t exist.

**JSON-RPC example** (if surfaced via JSON-RPC context):

```json
{
  "jsonrpc": "2.0",
  "id": "tnf-1",
  "error": {
    "code": -32000,
    "message": "Task task-uuid not found"
  }
}
```

**HTTP status endpoint behavior** (current): task-not-found becomes HTTP 500 with string message (see `05-task-status.md`).

### -32001 — Task already completed

**Name**: `TASK_ALREADY_COMPLETED`

**Where emitted**:
- `TaskManager.cancelTask(taskId)` if task state is `completed`.

**Example**:

```json
{
  "code": -32001,
  "message": "Task task-uuid is already completed"
}
```

### -32002 — Task canceled

**Name**: `TASK_CANCELED`

**Where emitted**:
- Reserved/defined; not directly thrown by the current task manager for status retrieval.

**Example**:

```json
{
  "code": -32002,
  "message": "Task task-uuid has been canceled"
}
```

### -32003 — Invalid task state

**Name**: `INVALID_TASK_STATE`

**Where emitted**:
- Invalid state transition attempts in `TaskManager.validateStateTransition`.
- `TaskManager.updateProgress` when task state is not `working`.

**Example**:

```json
{
  "code": -32003,
  "message": "Invalid state transition from submitted to completed"
}
```

### -32004 — Agent not found

**Name**: `AGENT_NOT_FOUND`

**Where emitted**:
- `RouterIntegration.executeMethod()` when router is not available.

**Example**:

```json
{
  "jsonrpc": "2.0",
  "id": "anf-1",
  "error": {
    "code": -32004,
    "message": "Router not available"
  }
}
```

### -32005 — Capability not supported

**Name**: `CAPABILITY_NOT_SUPPORTED`

**Where emitted**:
- `RouterIntegration.executeMethod()` if the method mapping is missing.

**Example**:

```json
{
  "jsonrpc": "2.0",
  "id": "cns-1",
  "error": {
    "code": -32005,
    "message": "Method story.delete not found"
  }
}
```

Note: calling an unregistered JSON-RPC method typically yields `-32601` before this error can occur.

### -32006 — Authentication failed

**Name**: `AUTHENTICATION_FAILED`

**Where emitted**:
- Defined and documented; not currently invoked by `/a2a/message` or `/a2a/task` gateway wiring.

**Example**:

```json
{
  "jsonrpc": "2.0",
  "id": "auth-1",
  "error": {
    "code": -32006,
    "message": "Authentication failed",
    "data": {
      "reason": "Invalid API key"
    }
  }
}
```

### -32007 — Rate limit exceeded

**Name**: `RATE_LIMIT_EXCEEDED`

**Where emitted**:
- Defined; rate limit enforcement is not emitted as A2AError by the current gateway wrapper.

**Example**:

```json
{
  "jsonrpc": "2.0",
  "id": "rl-1",
  "error": {
    "code": -32007,
    "message": "Rate limit exceeded",
    "data": {
      "limitPerMinute": 60,
      "retryAfterSeconds": 30
    }
  }
}
```

### -32008 — Webhook delivery failed

**Name**: `WEBHOOK_DELIVERY_FAILED`

**Where emitted**:
- Defined; outgoing webhook delivery returns a delivery result object, not an A2AError.

**Example**:

```json
{
  "code": -32008,
  "message": "Webhook delivery failed",
  "data": {
    "attempt": 3,
    "statusCode": 503
  }
}
```

### -32009 — Invalid agent card

**Name**: `INVALID_AGENT_CARD`

**Where emitted**:
- Defined; agent card validation currently throws generic Errors which surface as HTTP 500 on `/a2a/discovery`.

**Example**:

```json
{
  "code": -32009,
  "message": "Invalid agent card",
  "data": {
    "reason": "Agent Card missing required capability: crisis-detection"
  }
}
```

### -32010 — Task timeout

**Name**: `TASK_TIMEOUT`

**Where emitted**:
- TaskManager timeout handler marks tasks failed with `TASK_TIMEOUT`.
- Async executor catch-all sets `TASK_TIMEOUT` even for non-timeout errors.

**Example (Task error)**:

```json
{
  "code": -32010,
  "message": "Task timed out",
  "data": {"timeoutMs": 300000}
}
```

## Transport-Level HTTP Error Variants (Complete)

These are not JSON-RPC codes; they are HTTP status responses used by A2A endpoints.

### `GET /a2a/discovery`
- 200: `{ "agentCard": ... }`
- 503: `{ "error": "A2A adapter not available" }`
- 500: `{ "error": "Failed to retrieve agent card" }`

### `POST /a2a/task`
- 200: `Task`
- 400: missing method / missing clientAgentId
- 503: adapter not available
- 500: create failed

### `GET /a2a/status`
- 200: `Task`
- 200 (SSE): event-stream
- 400: missing taskId
- 503: adapter not available
- 500: status check failed (includes task-not-found)

### `POST /a2a/webhook`
- 200: `{ "success": true }`
- 503: adapter not available
- 500: invalid webhook payload or handler failure

## Retry Guidance (Complete)

- Retryable JSON-RPC codes (client perspective):
  - `-32603` Internal error (with backoff)
  - `-32010` Task timeout / execution failure (consider re-issuing task)

- Not retryable without fixing input:
  - `-32600` Invalid Request
  - `-32601` Method not found
  - `-32602` Invalid params
  - `-32003` Invalid task state

- Conditional:
  - `-32000` Task not found: don’t retry unless you suspect eventual consistency; verify taskId

See also:
- `04-task-delegation.md` (timeouts + storage)
- `05-task-status.md` (SSE behavior)
