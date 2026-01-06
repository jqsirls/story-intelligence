# Edge Cases — Timeouts (Observed)

## A) A2A task timeout

Configured by:
- `A2A_TASK_TIMEOUT_MS` (default 300000)

Implementation:
- TaskManager schedules a timeout that transitions task to `failed` with `code: -32010`.

Example task error:

```json
{
  "code": -32010,
  "message": "Task timed out",
  "data": {"timeoutMs": 300000}
}
```

## B) Supabase operation timeout (A2A)

TaskManager wraps Supabase operations in a 10s timeout:
- `Supabase operation timeout after 10 seconds`

On persistent network failure, tasks continue with Redis-only storage.

## C) Conversation persistence timeout

Conversation session persistence is best-effort; failures are logged and do not prevent returning `201`.
