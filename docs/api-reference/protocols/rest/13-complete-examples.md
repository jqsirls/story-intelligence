# REST API — Complete Examples (End-to-End) — Exhaustive

These examples are copy/paste-ready flows that cover:
- authentication
- story and character CRUD
- library CRUD
- conversation lifecycle
- account export/deletion

## Example 1 — Register → Login → Me

### 1.1 Register

```bash
curl -sS -X POST "https://api.storytailor.dev/api/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "correct-horse-battery-staple",
    "age": 10,
    "userType": "child",
    "parentEmail": "parent@example.com",
    "firstName": "Ava",
    "lastName": "S"
  }'
```

### 1.2 Login

```bash
curl -sS -X POST "https://api.storytailor.dev/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "correct-horse-battery-staple"
  }'
```

### 1.3 Me

```bash
curl -sS "https://api.storytailor.dev/api/v1/auth/me" \
  -H "Authorization: Bearer [REDACTED_JWT]"
```

## Example 2 — Create character → Create story

### 2.1 Create character

```bash
curl -sS -X POST "https://api.storytailor.dev/api/v1/characters" \
  -H "Authorization: Bearer [REDACTED_JWT]" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Luna",
    "description": "A brave cloud",
    "personality": {"traits": ["curious", "kind"]},
    "appearance": {"color": "blue"},
    "metadata": {"source": "manual"}
  }'
```

### 2.2 Create story

```bash
curl -sS -X POST "https://api.storytailor.dev/api/v1/stories" \
  -H "Authorization: Bearer [REDACTED_JWT]" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "The Brave Little Cloud",
    "content": {"blocks": []}
  }'
```

## Example 3 — List stories → Get story → Update story

### 3.1 List

```bash
curl -sS "https://api.storytailor.dev/api/v1/stories" \
  -H "Authorization: Bearer [REDACTED_JWT]"
```

### 3.2 Get

```bash
curl -sS "https://api.storytailor.dev/api/v1/stories/STORY_ID" \
  -H "Authorization: Bearer [REDACTED_JWT]"
```

### 3.3 Update

```bash
curl -sS -X PUT "https://api.storytailor.dev/api/v1/stories/STORY_ID" \
  -H "Authorization: Bearer [REDACTED_JWT]" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Updated Title",
    "metadata": {"edited": true}
  }'
```

## Example 4 — Start conversation → Send message → End conversation

### 4.1 Start

```bash
curl -sS -X POST "https://api.storytailor.dev/api/v1/conversations/start" \
  -H "Authorization: Bearer [REDACTED_JWT]" \
  -H "Content-Type: application/json" \
  -d '{
    "channel": "api",
    "metadata": {"locale": "en-US"}
  }'
```

### 4.2 Send message

```bash
curl -sS -X POST "https://api.storytailor.dev/api/v1/conversations/SESSION_ID/message" \
  -H "Authorization: Bearer [REDACTED_JWT]" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Tell me a bedtime story",
    "messageType": "text",
    "metadata": {}
  }'
```

### 4.3 End

```bash
curl -sS -X POST "https://api.storytailor.dev/api/v1/conversations/SESSION_ID/end" \
  -H "Authorization: Bearer [REDACTED_JWT]"
```

## Example 5 — Account export

```bash
curl -sS "https://api.storytailor.dev/api/v1/account/export" \
  -H "Authorization: Bearer [REDACTED_JWT]"
```

## Example 6 — Request story deletion → Cancel deletion

### 6.1 Request deletion

```bash
curl -sS -X DELETE "https://api.storytailor.dev/api/v1/stories/STORY_ID" \
  -H "Authorization: Bearer [REDACTED_JWT]" \
  -H "Content-Type: application/json" \
  -d '{
    "immediate": false,
    "reason": "No longer needed"
  }'
```

### 6.2 Cancel deletion

```bash
curl -sS -X POST "https://api.storytailor.dev/api/v1/stories/STORY_ID/delete/cancel" \
  -H "Authorization: Bearer [REDACTED_JWT]" \
  -H "Content-Type: application/json" \
  -d '{
    "requestId": "REQUEST_ID"
  }'
```

## Example 7 — IP dispute report

```bash
curl -sS -X POST "https://api.storytailor.dev/api/v1/stories/STORY_ID/ip-disputes" \
  -H "Authorization: Bearer [REDACTED_JWT]" \
  -H "Content-Type: application/json" \
  -d '{
    "disputeType": "franchise_match",
    "characterName": "Mickey",
    "franchise": "Disney",
    "owner": "Disney"
  }'
```
