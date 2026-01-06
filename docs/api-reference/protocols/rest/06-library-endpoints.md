# REST API — Library Endpoints — Exhaustive

Source of truth:
- Library routes: [`packages/universal-agent/src/api/RESTAPIGateway.ts`](../../../../packages/universal-agent/src/api/RESTAPIGateway.ts)

All library endpoints require:
- `Authorization: Bearer [REDACTED_JWT]

## 1) List libraries — `GET /api/v1/libraries`

Lists libraries where the caller is the **owner**.

### Response

#### 200 OK

```json
{
  "success": true,
  "data": [{"id": "...", "owner": "...", "name": "...", "created_at": "..."}]
}
```

#### 500 Internal Server Error

```json
{
  "success": false,
  "error": "(error message)",
  "code": "LIST_LIBRARIES_FAILED"
}
```

## 2) Get library — `GET /api/v1/libraries/:id`

Returns a single library where `id` matches and `owner` matches the caller.

### Response

#### 200 OK

```json
{
  "success": true,
  "data": {"id": "...", "owner": "...", "name": "..."}
}
```

#### 500 Internal Server Error (includes not-found)

```json
{
  "success": false,
  "error": "(supabase error message)",
  "code": "GET_LIBRARY_FAILED"
}
```

## 3) Create library — `POST /api/v1/libraries`

### Request body (accepted)

```json
{
  "name": "string (optional)",
  "description": "string (ignored)",
  "isPublic": true,
  "metadata": {"any": "json"}
}
```

Implementation notes:
- The gateway comments that the `libraries` table only has: `id`, `owner`, `name`, `parent_library`, `created_at`.
- The handler inserts only:

```json
{
  "owner": "<userId>",
  "name": "<name or My Library>"
}
```

### Response

#### 201 Created

```json
{
  "success": true,
  "data": {"id": "...", "owner": "...", "name": "My Library"}
}
```

#### 500 Internal Server Error

```json
{
  "success": false,
  "error": "(error message)",
  "code": "CREATE_LIBRARY_FAILED"
}
```

## 4) Update library — `PUT /api/v1/libraries/:id`

### Request body

```json
{
  "name": "string (optional)",
  "description": "string (ignored)",
  "isPublic": true,
  "metadata": {"any": "json"}
}
```

Only `name` is currently applied.

### Permission checks (complete)

The handler:
1) fetches the library by `id` and selects `owner`
2) compares `existingLibrary.owner !== userId`
3) returns 403 if caller is not owner

### Responses

#### 200 OK

```json
{
  "success": true,
  "data": {"id": "...", "owner": "...", "name": "Updated"}
}
```

#### 403 Forbidden

```json
{
  "success": false,
  "error": "Only library owner can update library",
  "code": "PERMISSION_DENIED"
}
```

#### 500 Internal Server Error

```json
{
  "success": false,
  "error": "(error message)",
  "code": "UPDATE_LIBRARY_FAILED"
}
```

## 5) Remove library member — `POST /api/v1/libraries/:id/members/:userId/remove`

Removes a member from a library via `DeletionService.removeLibraryMember`.

### Path parameters

- `id`: library id
- `userId`: member user id to remove

### Response

#### 200 OK

```json
{
  "success": true,
  "message": "Library member removed successfully"
}
```

#### 500 Internal Server Error

```json
{
  "success": false,
  "error": "(error message)",
  "code": "LIBRARY_MEMBER_REMOVAL_FAILED"
}
```

## Examples

### cURL — create

```bash
curl -sS -X POST "https://api.storytailor.dev/api/v1/libraries" \
  -H "Authorization: Bearer [REDACTED_JWT]" \
  -H "Content-Type: application/json" \
  -d '{ "name": "Bedtime Stories" }'
```

### cURL — update

```bash
curl -sS -X PUT "https://api.storytailor.dev/api/v1/libraries/LIB_ID" \
  -H "Authorization: Bearer [REDACTED_JWT]" \
  -H "Content-Type: application/json" \
  -d '{ "name": "Updated Name" }'
```
