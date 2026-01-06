# REST API — Health Endpoints — Exhaustive

Source of truth:
- [`packages/universal-agent/src/api/RESTAPIGateway.ts`](../../../../packages/universal-agent/src/api/RESTAPIGateway.ts)

## `GET /health`

### Purpose

Returns a lightweight health response from the REST gateway process.

### Request

- Method: `GET`
- Path: `/health`
- Auth: none

### Response

#### 200 OK

```json
{
  "status": "healthy",
  "version": "1.0.0",
  "timestamp": "ISO-8601",
  "uptime": 123.456
}
```

Field meanings:
- `status`: constant string `healthy`
- `version`: constant string `1.0.0`
- `timestamp`: current ISO-8601 timestamp
- `uptime`: `process.uptime()` seconds

### cURL

```bash
curl -sS -X GET "https://api.storytailor.dev/health" \
  -H "Accept: application/json"
```

### JavaScript (fetch)

```js
export async function health(baseUrl) {
  const res = await fetch(`${baseUrl}/health`)
  return await res.json()
}
```

### Python

```python
import requests

def health(base_url: str) -> dict:
    r = requests.get(f"{base_url}/health", timeout=10)
    r.raise_for_status()
    return r.json()
```

## Notes

- This endpoint reports gateway process health, not deep dependency health.
- Deep dependency checks (Supabase/Redis/OpenAI/etc.) should be implemented under internal diagnostics. See `docs/api-reference/protocols/internal/*`.
