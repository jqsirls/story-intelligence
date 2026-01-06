# REST API — SDK / Client Guides — Exhaustive

This document provides client guidance for the production REST API (`/api/v1/*`) and the OpenAPI contract (`/v1/*`).

## 1) Base URL selection

Production (verified in internal docs):
- `https://api.storytailor.dev`

## 2) Authentication

- Use `POST /api/v1/auth/login` to obtain tokens.
- Send `Authorization: Bearer <accessToken>` to authenticated endpoints.

See `01-authentication.md`.

## 3) Standard fetch client (TypeScript)

```ts
export class StorytailorRestClient {
  constructor(private baseUrl: string, private accessToken?: string) {}

  setAccessToken(token: string) {
    this.accessToken = token
  }

  private headers(extra: Record<string, string> = {}) {
    const h: Record<string, string> = { ...extra }
    if (this.accessToken) h.Authorization = `Bearer ${this.accessToken}`
    return h
  }

  async listStories() {
    const res = await fetch(`${this.baseUrl}/api/v1/stories`, { headers: this.headers() })
    return await res.json()
  }

  async createStory(body: any) {
    const res = await fetch(`${this.baseUrl}/api/v1/stories`, {
      method: 'POST',
      headers: this.headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(body)
    })
    return await res.json()
  }

  async startConversation(body: any) {
    const res = await fetch(`${this.baseUrl}/api/v1/conversations/start`, {
      method: 'POST',
      headers: this.headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(body)
    })
    return await res.json()
  }
}
```

## 4) Python client (requests)

```python
import requests

class StorytailorRestClient:
    def __init__(self, base_url: str, access_token: str | None = None):
        self.base_url = base_url
        self.access_token = access_token

    def _headers(self, extra: dict | None = None) -> dict:
        h = dict(extra or {})
        if self.access_token:
            h["Authorization"] = f"Bearer {self.access_token}"
        return h

    def list_stories(self) -> dict:
        r = requests.get(f"{self.base_url}/api/v1/stories", headers=self._headers(), timeout=30)
        r.raise_for_status()
        return r.json()
```

## 5) Error handling

- Expect multiple error shapes (`10-error-catalog.md`).
- Retry only on `429`, `500`, `503`.

## 6) Pagination

- Gateway list endpoints generally do not paginate.
- OpenAPI contract uses `limit/offset`.

See `12-pagination.md`.
