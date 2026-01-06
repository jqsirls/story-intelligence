# Edge Cases — Retry Strategies (Observed)

## A) Supabase retry (A2A TaskManager)

- Retries up to 3 times on network errors.
- Backoff: `min(1000 * 2^(attempt-1), 5000)`

## B) Webhook delivery retries

- Retries up to 3 times.
- Backoff: `min(1000 * 2^(attempt-1), 30000)`
- No retry on 4xx.

## Client retry guidance

- Retry only on transient failures:
  - 429, 500, 503
  - JSON-RPC -32603
- Use exponential backoff + jitter.
