# Internal — Health Diagnostics (Recommended)

## Goal

Provide deep, dependency-aware health signals beyond `/health`.

## Recommended endpoints

- `GET /internal/health`
- `GET /internal/health/dependencies`
- `GET /internal/health/runtime`

## Example response schema

```json
{
  "status": "healthy|degraded|unhealthy",
  "timestamp": "ISO-8601",
  "service": "universal-agent",
  "version": "...",
  "dependencies": {
    "supabase": {"status": "healthy", "latencyMs": 12},
    "redis": {"status": "degraded", "latencyMs": 50},
    "openai": {"status": "healthy", "latencyMs": 200}
  },
  "metrics": {
    "uptime": 123.4,
    "memoryRssBytes": 12345678
  }
}
```

## Security requirements

- Must be admin-only
- Must not return secrets
