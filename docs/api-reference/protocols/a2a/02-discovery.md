# A2A — `GET /a2a/discovery` (Agent Card) — Exhaustive

This endpoint returns the **Agent Card** describing the Storytailor agent’s identity, endpoints, authentication schemes, modalities, capabilities, and metadata.

Source of truth:
- Route wiring: [`packages/universal-agent/src/api/RESTAPIGateway.ts`](../../../../packages/universal-agent/src/api/RESTAPIGateway.ts)
- Agent Card generator: [`packages/a2a-adapter/src/AgentCard.ts`](../../../../packages/a2a-adapter/src/AgentCard.ts)
- Types: [`packages/a2a-adapter/src/types.ts`](../../../../packages/a2a-adapter/src/types.ts)

## Endpoint

- **Method**: `GET`
- **Path**: `/a2a/discovery`
- **Auth**: Optional (public)
- **Content-Type**: `application/json`

## Request

### Headers (All supported)

- `Accept: application/json` (optional)

No request body.

### cURL

```bash
curl -sS -X GET "https://storyintelligence.dev/a2a/discovery" \
  -H "Accept: application/json"
```

## Response

### 200 OK — Success (Complete object)

The response body is a wrapper with `agentCard`:

```json
{
  "agentCard": {
    "id": "storytailor-agent",
    "name": "Storytailor Agent",
    "version": "1.0.0",
    "description": "Storytailor Agent - Therapeutic storytelling for children with emotional intelligence and crisis detection",
    "capabilities": [
      "storytelling",
      "emotional-check-in",
      "crisis-detection"
    ],
    "endpoints": {
      "service": "https://storyintelligence.dev",
      "webhook": "https://storyintelligence.dev/a2a/webhook",
      "health": "https://storyintelligence.dev/health"
    },
    "authentication": {
      "schemes": [
        {
          "type": "apiKey",
          "name": "X-API-Key",
          "in": "header",
          "description": "API key authentication"
        },
        {
          "type": "oauth2",
          "name": "OAuth2",
          "in": "header",
          "description": "OAuth 2.0 Bearer token authentication",
          "flows": {
            "clientCredentials": {
              "tokenUrl": "https://storyintelligence.dev/api/v1/auth/token",
              "scopes": {
                "a2a:read": "Read access to A2A endpoints",
                "a2a:write": "Write access to A2A endpoints",
                "a2a:admin": "Admin access to A2A endpoints"
              }
            }
          }
        }
      ]
    },
    "modalities": [
      "text",
      "audio",
      "video"
    ],
    "metadata": {
      "provider": "Storytailor Inc",
      "documentation": "https://docs.storytailor.com/a2a",
      "support": "support@storytailor.com"
    }
  }
}
```

#### Notes on dynamic fields

- `version`:
  - Primary source: reads `../../package.json` relative to the built adapter and returns its `version`.
  - Fallback: `config.agentVersion`.
  - Fallback of fallback: `"1.0.0"`.

- `endpoints.service`: is `config.baseUrl`.
- `endpoints.webhook`: is `config.webhookUrl`.
- `endpoints.health`: is `config.healthUrl`.

These are set in the REST gateway config from environment variables:
- `A2A_BASE_URL` / `APP_URL`
- `A2A_WEBHOOK_URL`
- `A2A_HEALTH_URL`

### 503 Service Unavailable — Adapter not initialized

If the gateway did not successfully initialize the A2A adapter:

```json
{
  "error": "A2A adapter not available"
}
```

### 500 Internal Server Error — Agent card generation failed

If agent card generation throws (for example, missing required fields or missing required capability validation):

```json
{
  "error": "Failed to retrieve agent card"
}
```

#### Possible root causes (exhaustive)

The generator throws if:
- `id`, `name`, or `version` missing
- `endpoints.service` missing
- `capabilities` is not an array or empty
- Missing any required capability:
  - `storytelling`
  - `emotional-check-in`
  - `crisis-detection`

## TypeScript Types (Canonical)

These are the shapes used by production. (Copied directly from the A2A adapter types.)

```ts
export interface AgentCard {
  id: string
  name: string
  version: string
  description?: string
  capabilities: string[]
  endpoints: {
    service: string
    webhook?: string
    health?: string
  }
  authentication?: {
    schemes: AuthenticationScheme[]
  }
  modalities?: string[]
  metadata?: Record<string, unknown>
}

export interface AuthenticationScheme {
  type: 'apiKey' | 'oauth2' | 'openIdConnect'
  name: string
  in: 'header' | 'query' | 'cookie'
  description?: string
  flows?: OAuth2Flows
  openIdConnectUrl?: string
}

export interface OAuth2Flows {
  authorizationCode?: {
    authorizationUrl: string
    tokenUrl: string
    scopes: Record<string, string>
  }
  clientCredentials?: {
    tokenUrl: string
    scopes: Record<string, string>
  }
}
```

## Multi-language Examples

### JavaScript (fetch)

```js
export async function getAgentCard(baseUrl) {
  const res = await fetch(`${baseUrl}/a2a/discovery`, {
    method: 'GET',
    headers: { 'Accept': 'application/json' }
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`discovery failed: ${res.status} ${body}`)
  }

  return await res.json()
}
```

### TypeScript (fetch + typed response)

```ts
type AgentCardResponse = { agentCard: import('@alexa-multi-agent/a2a-adapter').AgentCard }

export async function getAgentCard(baseUrl: string): Promise<AgentCardResponse> {
  const res = await fetch(`${baseUrl}/a2a/discovery`, { headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error(`discovery failed: ${res.status}`)
  return (await res.json()) as AgentCardResponse
}
```

### Python (requests)

```python
import requests

def get_agent_card(base_url: str) -> dict:
    r = requests.get(
        f"{base_url}/a2a/discovery",
        headers={"Accept": "application/json"},
        timeout=10,
    )
    r.raise_for_status()
    return r.json()
```

### Go (net/http)

```go
package a2a

import (
  "encoding/json"
  "net/http"
  "time"
)

type AgentCardResponse struct {
  AgentCard any `json:"agentCard"`
}

func GetAgentCard(baseUrl string) (*AgentCardResponse, error) {
  client := &http.Client{Timeout: 10 * time.Second}
  req, err := http.NewRequest("GET", baseUrl+"/a2a/discovery", nil)
  if err != nil {
    return nil, err
  }
  req.Header.Set("Accept", "application/json")

  res, err := client.Do(req)
  if err != nil {
    return nil, err
  }
  defer res.Body.Close()

  if res.StatusCode < 200 || res.StatusCode > 299 {
    return nil, fmt.Errorf("discovery failed: %d", res.StatusCode)
  }

  var out AgentCardResponse
  if err := json.NewDecoder(res.Body).Decode(&out); err != nil {
    return nil, err
  }

  return &out, nil
}
```

## Cross-reference: Authentication schemes

For complete details on the auth behavior implied by the agent card schemes, see `01-authentication.md`.
