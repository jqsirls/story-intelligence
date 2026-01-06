# REST API — Character Endpoints — Exhaustive

Source of truth:
- Character routes: [`packages/universal-agent/src/api/RESTAPIGateway.ts`](../../../../packages/universal-agent/src/api/RESTAPIGateway.ts)

All character endpoints require:
- `Authorization: Bearer [REDACTED_JWT]

## 1) List characters — `GET /api/v1/characters`

### Response

#### 200 OK

```json
{
  "success": true,
  "data": [{"id": "...", "name": "...", "created_at": "..."}]
}
```

#### 500 Internal Server Error

```json
{
  "success": false,
  "error": "(error message)",
  "code": "LIST_CHARACTERS_FAILED"
}
```

## 2) Get character — `GET /api/v1/characters/:id`

### Response

#### 200 OK

```json
{
  "success": true,
  "data": {
    "id": "...",
    "name": "...",
    "library_id": "...",
    "traits": {},
    "art_prompt": "...",
    "appearance_url": "...",
    "created_at": "...",
    "updated_at": "..."
  }
}
```

#### 500 Internal Server Error (includes not-found)

```json
{
  "success": false,
  "error": "(supabase error message)",
  "code": "GET_CHARACTER_FAILED"
}
```

## 3) Create character — `POST /api/v1/characters`

### Request body (accepted)

```json
{
  "name": "string (optional)",
  "libraryId": "string (optional, UUID)",
  "traits": {"any": "json"},
  "artPrompt": "string (optional)",
  "appearanceUrl": "string (optional)"
}
```

**Field Descriptions**:
- `name` (optional): Character name, defaults to `"Unnamed Character"`
- `libraryId` (optional): UUID of the library to create the character in. If not provided, uses the user's first library or creates a default library.
- `traits` (required): JSONB object containing character traits (e.g., `{"personality": ["brave", "curious"], "species": "human"}`)
- `artPrompt` (optional): Text description for character visualization/art generation
- `appearanceUrl` (optional): URL to character appearance image

**Note**: The old fields `description`, `personality`, `appearance`, and `metadata` are no longer supported. Use `traits` for all character data.

### Response

#### 201 Created

```json
{
  "success": true,
  "data": {
    "id": "...",
    "library_id": "...",
    "name": "...",
    "traits": {},
    "art_prompt": null,
    "appearance_url": null,
    "created_at": "...",
    "updated_at": "..."
  }
}
```

#### 500 Internal Server Error

```json
{
  "success": false,
  "error": "(error message)",
  "code": "CREATE_CHARACTER_FAILED"
}
```

## 4) Update character — `PUT /api/v1/characters/:id`

### Request body

Any subset of:

```json
{
  "name": "string",
  "traits": {"any": "json"},
  "artPrompt": "string (optional, null to clear)",
  "appearanceUrl": "string (optional, null to clear)"
}
```

**Note**: The old fields `description`, `personality`, `appearance`, and `metadata` are no longer supported. Use `traits` for all character data.

### Response

#### 200 OK

```json
{
  "success": true,
  "data": {"id": "...", "name": "..."}
}
```

#### 500 Internal Server Error

```json
{
  "success": false,
  "error": "(error message)",
  "code": "UPDATE_CHARACTER_FAILED"
}
```

## 5) Request character deletion — `DELETE /api/v1/characters/:id`

This endpoint schedules deletion through the deletion service.

### Request body

```json
{
  "immediate": false,
  "reason": "string (optional)",
  "deleteStories": false,
  "removeFromStories": false
}
```

Notes:
- `immediate` and `reason` are accepted but not currently used by the deletion call.
- Deletion options are passed as:
  - `deleteStories: deleteStories || false`
  - `removeFromStories: removeFromStories || false`

### Response

#### 200 OK

```json
{
  "success": true,
  "requestId": "string",
  "scheduledDeletionAt": "ISO-8601",
  "message": "Character deletion scheduled for (locale date string)"
}
```

#### 500 Internal Server Error

```json
{
  "success": false,
  "error": "(error message)",
  "code": "CHARACTER_DELETION_FAILED"
}
```

## AI Generation Options (Production)

The REST gateway character endpoints primarily persist character data.

AI generation of:
- character images
- voice selection
- personality scaffolding

is performed by specialized agents (e.g., content/character agent Lambdas) and is not directly exposed via these CRUD endpoints in the gateway.

## Examples

### cURL — create

```bash
curl -sS -X POST "https://api.storytailor.dev/api/v1/characters" \
  -H "Authorization: Bearer [REDACTED_JWT]" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Luna",
    "traits": {
      "personality": ["curious", "kind"],
      "species": "unicorn",
      "age": 7
    },
    "artPrompt": "A brave young unicorn with silver coat and rainbow mane"
  }'
```

### Python — list

```python
import requests

def list_characters(base_url: str, token: str) -> dict:
    r = requests.get(
        f"{base_url}/api/v1/characters",
        headers={"Authorization": f"Bearer {token}"},
        timeout=30,
    )
    r.raise_for_status()
    return r.json()
```
