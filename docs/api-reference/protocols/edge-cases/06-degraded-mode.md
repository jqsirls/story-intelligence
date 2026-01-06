# Edge Cases — Degraded Mode

## Observed degraded-mode behaviors

- Conversation session persistence failure does not block session creation.
- A2A tasks continue with Redis-only persistence if Supabase is unavailable.
- Email tracking returns success even if tracking fails.

## Recommended degraded responses

- Return a reduced response with `status: degraded` in internal health.
- Prefer text-only responses when voice/image generation fails.
