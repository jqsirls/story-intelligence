# REST API — Story Endpoints — Exhaustive

> **Contract Precedence (Product REST API)**: Treat `docs/api/REST_API_EXPERIENCE_MASTER.md` as canonical for the product REST API contract.

Source of truth:
- Story routes: [`lambda-deployments/universal-agent/src/api/RESTAPIGateway.ts`](../../../../lambda-deployments/universal-agent/src/api/RESTAPIGateway.ts)
- Deletion scheduling: `DeletionService` and related services (called by gateway)

All story endpoints require:
- `Authorization: Bearer [REDACTED_JWT]`

## 1) List stories — `GET /api/v1/stories`

### Query parameters

- `libraryId` (optional, string)

### Response

#### 200 OK

```json
{
  "success": true,
  "data": [
    {"id": "...", "title": "...", "content": {}, "created_at": "..."}
  ]
}
```

#### 500 Internal Server Error

```json
{
  "success": false,
  "error": "(error message)",
  "code": "LIST_STORIES_FAILED"
}
```

### cURL

```bash
curl -sS "https://api.storytailor.dev/api/v1/stories" \
  -H "Authorization: Bearer [REDACTED_JWT]" \
  -H "Accept: application/json"
```

## 2) Get story — `GET /api/v1/stories/:id`

### Path parameters

- `id` (required): story id

### Response

#### 200 OK

```json
{
  "success": true,
  "data": {"id": "...", "title": "...", "content": {}}
}
```

#### 500 Internal Server Error (includes not-found)

The gateway throws Supabase errors directly; not-found can surface as a 500.

```json
{
  "success": false,
  "error": "(supabase error message)",
  "code": "GET_STORY_FAILED"
}
```

## 3) Create story — `POST /api/v1/stories`

### Request body (accepted)

**AI Generation Mode** (if `storyIdea` or `storyType` provided without `title`):
- `characterId` (optional, string): Character ID to use in story
- `libraryId` (optional, string): Target library ID
- `storyIdea` (optional, string): User's story idea/prompt
- `storyType` (optional, string): Type of story (e.g., "adventure", "fantasy", "mystery")
- `themes` (optional, array): Story themes (e.g., ["friendship", "courage"])
- `moralLesson` (optional, string): Moral lesson to teach
- `avoidTopics` (optional, array): Topics to avoid (e.g., ["violence", "scary"])
- `therapeuticGoals` (optional, array): Therapeutic goals (e.g., ["anxiety", "social-skills"])
- `emotionalContext` (optional, string): Emotional context for the story
- `childAge` (optional, number): Age of child (default: 7)
- `generateAssets` (optional, boolean): Generate assets automatically (default: true)

**Manual Creation Mode** (if `title` and `content` provided):
- `title` (required for manual mode, string): Story title
- `content` (required for manual mode, object): Story content
- `libraryId` (optional, string): Target library ID
- `metadata` (optional, object): Additional metadata

### Side effects (complete)

**AI Generation Mode:**
- Invokes Content Agent Lambda for AI story generation
- Creates story with AI-generated content
- If `generateAssets: true`, creates asset generation jobs for audio, cover, scenes, PDF, activities
- Returns story with Supabase Realtime metadata for progressive loading

**Manual Creation Mode:**
- If `libraryId` is omitted, queries `libraries` for `owner = userId`, `.limit(1).single()`
- If none found, inserts a new library: `{ "owner": "<userId>", "name": "My Stories" }`
- Inserts story: `{ "library_id": "<libraryId>", "title": "<title>", "content": {}, "status": "draft", "age_rating": 0 }`

### Response

#### 201 Created (AI Generation)

```json
{
  "success": true,
  "data": {
    "id": "...",
    "library_id": "...",
    "title": "...",
    "content": {...},
    "status": "draft",
    "realtimeChannel": "stories:id=<storyId>",
    "subscribePattern": {
      "table": "stories",
      "filter": "id=eq.<storyId>",
      "event": "UPDATE"
    }
  }
}
```

#### 201 Created (Manual Creation)

```json
{
  "success": true,
  "data": {"id": "...", "library_id": "...", "title": "...", "status": "draft"}
}
```

#### 500 Internal Server Error

```json
{
  "success": false,
  "error": "(error message)",
  "code": "CREATE_STORY_FAILED"
}
```

### cURL

```bash
curl -sS -X POST "https://api.storytailor.dev/api/v1/stories" \
  -H "Authorization: Bearer [REDACTED_JWT]" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "The Brave Little Cloud",
    "content": {"blocks": []}
  }'
```

## 4) Update story — `PUT /api/v1/stories/:id`

### Request body

Accepted fields:
- `title` (optional)
- `content` (optional)
- `metadata` (optional)

> Note: The update payload is typed as `content?: string` in the handler, but request bodies commonly send objects. The gateway forwards whatever is provided.

### Response

#### 200 OK

```json
{
  "success": true,
  "data": {"id": "...", "title": "...", "content": {}}
}
```

#### 500 Internal Server Error

```json
{
  "success": false,
  "error": "(error message)",
  "code": "UPDATE_STORY_FAILED"
}
```

## 5) Request story deletion — `DELETE /api/v1/stories/:id`

This endpoint schedules or triggers deletion via the deletion service.

### Request body

```json
{
  "immediate": false,
  "reason": "string (optional)"
}
```

Notes:
- This is a `DELETE` request that accepts a JSON body.

### Response

#### 200 OK

```json
{
  "success": true,
  "requestId": "string",
  "scheduledDeletionAt": "ISO-8601 or null",
  "message": "string"
}
```

#### 500 Internal Server Error

```json
{
  "success": false,
  "error": "(error message)",
  "code": "STORY_DELETION_FAILED"
}
```

## 6) Cancel story deletion — `POST /api/v1/stories/:id/delete/cancel`

### Request body

```json
{ "requestId": "string" }
```

### Responses

#### 200 OK

```json
{
  "success": true,
  "message": "Story deletion cancelled successfully"
}
```

#### 400 Bad Request — missing requestId

```json
{
  "success": false,
  "error": "Request ID required",
  "code": "REQUEST_ID_MISSING"
}
```

#### 500 Internal Server Error

```json
{
  "success": false,
  "error": "(error message)",
  "code": "STORY_DELETION_CANCELLATION_FAILED"
}
```

## 7) Generate assets for story — `POST /api/v1/stories/:storyId/assets`

### Path parameters

- `storyId` (required, string): Story ID

### Request body

```json
{
  "assetTypes": ["audio", "cover", "scene_1", "scene_2", "scene_3", "scene_4", "pdf", "activities"],
  "priority": "normal"
}
```

- `assetTypes` (optional, array): Asset types to generate (default: all)
- `priority` (optional, string): Job priority (default: "normal")

### Response

#### 202 Accepted

```json
{
  "success": true,
  "data": {
    "storyId": "...",
    "jobs": [
      {"jobId": "...", "assetType": "audio", "status": "queued"},
      {"jobId": "...", "assetType": "cover", "status": "queued"}
    ],
    "estimatedTime": 360,
    "realtimeChannel": "stories:id=<storyId>",
    "subscribePattern": {
      "table": "stories",
      "filter": "id=eq.<storyId>",
      "event": "UPDATE"
    }
  }
}
```

#### 403 Forbidden — Write permission required

```json
{
  "success": false,
  "error": "Editor, Admin, or Owner permission required",
  "code": "WRITE_PERMISSION_REQUIRED"
}
```

#### 404 Not Found

```json
{
  "success": false,
  "error": "Story not found",
  "code": "STORY_NOT_FOUND"
}
```

### cURL

```bash
curl -X POST "https://api.storytailor.dev/api/v1/stories/story_123/assets" \
  -H "Authorization: Bearer [REDACTED_JWT]" \
  -H "Content-Type: application/json" \
  -d '{
    "assetTypes": ["audio", "cover"],
    "priority": "high"
  }'
```

## 8) Continue story (sequel) — `POST /api/v1/stories/:storyId/continue`

### Path parameters

- `storyId` (required, string): Parent story ID

### Request body

```json
{
  "continuationType": "sequel",
  "userDirection": "Continue the adventure",
  "themes": ["friendship"],
  "generateAssets": true
}
```

- `continuationType` (optional, string): Type of continuation (default: "sequel")
- `userDirection` (optional, string): User's direction for the continuation
- `themes` (optional, array): Themes for the continuation
- `generateAssets` (optional, boolean): Generate assets automatically (default: true)

### Response

#### 201 Created

```json
{
  "success": true,
  "data": {
    "id": "...",
    "title": "Original Story - Part 2",
    "library_id": "...",
    "parent_story_id": "...",
    "realtimeChannel": "stories:id=<sequelId>",
    "subscribePattern": {
      "table": "stories",
      "filter": "id=eq.<sequelId>",
      "event": "UPDATE"
    }
  }
}
```

#### 403 Forbidden — Write permission required

```json
{
  "success": false,
  "error": "Editor, Admin, or Owner permission required",
  "code": "WRITE_PERMISSION_REQUIRED"
}
```

#### 404 Not Found

```json
{
  "success": false,
  "error": "Story not found",
  "code": "STORY_NOT_FOUND"
}
```

### cURL

```bash
curl -X POST "https://api.storytailor.dev/api/v1/stories/story_123/continue" \
  -H "Authorization: Bearer [REDACTED_JWT]" \
  -H "Content-Type: application/json" \
  -d '{
    "continuationType": "sequel",
    "userDirection": "The hero discovers a hidden treasure",
    "generateAssets": true
  }'
```

## 9) IP dispute reporting — `POST /api/v1/stories/:storyId/ip-disputes`

### Request body

```json
{
  "disputeType": "string",
  "characterName": "string",
  "franchise": "string (optional)",
  "owner": "string (optional)",
  "resolution": "string (optional)"
}
```

### Responses

#### 201 Created

```json
{
  "success": true,
  "data": {"id": "...", "story_id": "...", "status": "pending"}
}
```

#### 400 Bad Request — missing required fields

```json
{
  "success": false,
  "error": "disputeType and characterName are required",
  "code": "INVALID_REQUEST"
}
```

#### 404 Not Found — story not found

```json
{
  "success": false,
  "error": "Story not found",
  "code": "STORY_NOT_FOUND"
}
```

#### 500 Internal Server Error

```json
{
  "success": false,
  "error": "(error message)",
  "code": "CREATE_DISPUTE_FAILED"
}
```

## 8) List IP disputes — `GET /api/v1/stories/:storyId/ip-disputes`

### Responses

#### 200 OK

```json
{
  "success": true,
  "data": [{"id": "...", "story_id": "..."}]
}
```

#### 404 Not Found

```json
{
  "success": false,
  "error": "Story not found",
  "code": "STORY_NOT_FOUND"
}
```

#### 500 Internal Server Error

```json
{
  "success": false,
  "error": "(error message)",
  "code": "GET_DISPUTES_FAILED"
}
```

## 9) IP detection audit — `GET /api/v1/stories/:storyId/ip-detection-audit`

### Responses

#### 200 OK

```json
{
  "success": true,
  "data": [{"id": "...", "story_id": "...", "detection_method": "..."}]
}
```

#### 404 Not Found

```json
{
  "success": false,
  "error": "Story not found",
  "code": "STORY_NOT_FOUND"
}
```

#### 500 Internal Server Error

```json
{
  "success": false,
  "error": "(error message)",
  "code": "GET_AUDIT_FAILED"
}
```
