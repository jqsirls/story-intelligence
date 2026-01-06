# Edge Cases — Partial Failures

## A) Conversation start: session created but DB write fails

The gateway:
- creates an in-memory session via `storytellerAPI.startConversation`
- attempts Supabase upsert
- logs warning and still returns `201` if upsert fails

This is a deliberate partial failure mode.

## B) A2A tasks: Redis success, Supabase down

TaskManager:
- writes to Redis (best-effort)
- attempts Supabase upsert with retries
- on final network failure, continues with Redis-only

## C) Email tracking non-critical

Email tracking endpoint returns `success: true` even on failures to avoid impacting user flows.
