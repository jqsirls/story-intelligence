# Edge Cases — Circuit Breakers

## Status

No explicit circuit breaker implementation is present in the gateway or A2A adapter code paths documented here.

## Recommended pattern

Introduce circuit breakers around:
- OpenAI calls
- ElevenLabs calls
- Supabase calls (where appropriate)

Provide fallback behaviors:
- cached responses
- degraded responses
- fast-fail with 503
