# REST API — Storytailor ID Endpoints — Complete Reference

> **Contract Precedence (Product REST API)**: Treat `docs/api/REST_API_EXPERIENCE_MASTER.md` as canonical for the product REST API contract.

**Date**: December 26, 2025  
**Base URL**: `https://api.storytailor.dev/api/v1/storytailor-ids`  
**Version**: 1.0

---

## Overview

Storytailor IDs are narrative identities for children, represented through characters rather than personal data. They are not accounts or logins - they are owned by adults and contain stories, characters, emotional themes, preferences, and history. Storytailor IDs are transferable as a unit.

**Key Concepts**:
- **Storytailor ID** = A protected profile representing a child through a character
- **Character** = The avatar, name, and face of the Storytailor ID
- **Character-First Creation** = Create character first, then link to Storytailor ID
- **Consent Workflow** = Parental consent required for child Storytailor IDs (sub-libraries)

**All endpoints require authentication**: `Authorization: Bearer <accessToken>`

---

## 1. Create Storytailor ID

**Endpoint**: `POST /api/v1/storytailor-ids`

**Description**: Create a new Storytailor ID (library) with optional character-first creation. Supports both adult Storytailor IDs and child Storytailor IDs (sub-libraries).

### Request Body

```json
{
  "name": "Emma's Stories",
  "primary_character_id": "char-123",  // Optional: character-first creation
  "age_range": "6-8",                   // Optional: for child Storytailor IDs
  "is_minor": true,                     // Optional: for child Storytailor IDs
  "parent_storytailor_id": "lib-456"   // Optional: creates child Storytailor ID
}
```

**Required Fields**:
- `name` (string, required) - Name of the Storytailor ID

**Optional Fields**:
- `primary_character_id` (string, UUID) - Character to use as primary identity (character-first creation)
- `age_range` (string) - One of: `"3-5"`, `"6-8"`, `"9-10"`, `"11-12"`, `"13-15"`, `"16-17"` (for child Storytailor IDs)
- `is_minor` (boolean) - Whether this is a child Storytailor ID (for child sub-libraries)
- `parent_storytailor_id` (string, UUID) - Parent Storytailor ID (creates child Storytailor ID)

### Character-First Creation Flow

1. Create character via `POST /api/v1/characters`
2. Create Storytailor ID with `primary_character_id` pointing to the character
3. Character is automatically marked as `is_primary = true` and linked to the library

### Success Response (201 Created)

```json
{
  "success": true,
  "storytailorId": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Emma's Stories",
    "primaryCharacterId": "char-123",
    "ageRange": "6-8",
    "isMinor": true,
    "consentStatus": "pending",
    "createdAt": "2025-12-26T12:00:00.000Z"
  }
}
```

### Error Responses

**400 Bad Request** - Validation error:
```json
{
  "success": false,
  "error": "Name is required",
  "code": "INVALID_INPUT"
}
```

**404 Not Found** - Primary character not found:
```json
{
  "success": false,
  "error": "Primary character not found",
  "code": "CHARACTER_NOT_FOUND"
}
```

**409 Conflict** - Character already primary:
```json
{
  "success": false,
  "error": "Character is already primary for another Storytailor ID",
  "code": "CHARACTER_ALREADY_PRIMARY"
}
```

**403 Forbidden** - COPPA consent required:
```json
{
  "success": false,
  "error": "Parent consent required for users under 13 creating child Storytailor IDs",
  "code": "COPPA_CONSENT_REQUIRED"
}
```

**500 Internal Server Error**:
```json
{
  "success": false,
  "error": "Failed to create Storytailor ID",
  "code": "CREATE_STORYTAILOR_ID_FAILED"
}
```

### cURL Example

```bash
curl -X POST "https://api.storytailor.dev/api/v1/storytailor-ids" \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Emma'\''s Stories",
    "primary_character_id": "char-123",
    "age_range": "6-8",
    "is_minor": true
  }'
```

---

## 2. List Storytailor IDs

**Endpoint**: `GET /api/v1/storytailor-ids`

**Description**: List all Storytailor IDs owned by the authenticated user.

### Success Response (200 OK)

```json
{
  "success": true,
  "storytailorIds": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "My Stories",
      "primaryCharacterId": null,
      "ageRange": null,
      "isMinor": false,
      "consentStatus": "none",
      "createdAt": "2025-12-20T10:00:00.000Z"
    },
    {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "name": "Emma's Stories",
      "primaryCharacterId": "char-123",
      "ageRange": "6-8",
      "isMinor": true,
      "consentStatus": "pending",
      "createdAt": "2025-12-26T12:00:00.000Z"
    }
  ]
}
```

### Error Responses

**500 Internal Server Error**:
```json
{
  "success": false,
  "error": "Failed to list Storytailor IDs",
  "code": "LIST_STORYTAILOR_IDS_FAILED"
}
```

### cURL Example

```bash
curl -X GET "https://api.storytailor.dev/api/v1/storytailor-ids" \
  -H "Authorization: Bearer <accessToken>"
```

---

## 3. Get Storytailor ID

**Endpoint**: `GET /api/v1/storytailor-ids/:id`

**Description**: Get a single Storytailor ID by ID.

### Path Parameters

- `id` (string, UUID, required) - Storytailor ID UUID

### Success Response (200 OK)

```json
{
  "success": true,
  "storytailorId": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Emma's Stories",
    "primaryCharacterId": "char-123",
    "ageRange": "6-8",
    "isMinor": true,
    "consentStatus": "pending",
    "policyVersion": "2025-01",
    "evaluatedAt": "2025-12-26T12:00:00.000Z",
    "createdAt": "2025-12-26T12:00:00.000Z"
  }
}
```

### Error Responses

**404 Not Found**:
```json
{
  "success": false,
  "error": "Storytailor ID not found",
  "code": "STORYTAILOR_ID_NOT_FOUND"
}
```

**500 Internal Server Error**:
```json
{
  "success": false,
  "error": "Failed to get Storytailor ID",
  "code": "GET_STORYTAILOR_ID_FAILED"
}
```

### cURL Example

```bash
curl -X GET "https://api.storytailor.dev/api/v1/storytailor-ids/550e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer <accessToken>"
```

---

## 4. Request Parental Consent

**Endpoint**: `POST /api/v1/storytailor-ids/:id/consent`

**Description**: Request parental consent for a child Storytailor ID (sub-library). Sends consent email to the adult user.

### Path Parameters

- `id` (string, UUID, required) - Child Storytailor ID UUID

### Request Body

```json
{
  "consent_method": "email",
  "consent_scope": {}
}
```

**Required Fields**:
- None (defaults used if not provided)

**Optional Fields**:
- `consent_method` (string) - One of: `"email"`, `"sms"`, `"video_call"`, `"id_verification"`, `"voice"`, `"app"` (default: `"email"`)
- `consent_scope` (object) - Consent permissions being requested (default: `{}`)

### Success Response (201 Created)

```json
{
  "success": true,
  "consent": {
    "id": "consent-123",
    "status": "pending",
    "method": "email",
    "requestedAt": "2025-12-26T12:00:00.000Z",
    "expiresAt": "2026-01-02T12:00:00.000Z"
  }
}
```

### Error Responses

**400 Bad Request** - Not a child Storytailor ID:
```json
{
  "success": false,
  "error": "Consent workflow only applies to child Storytailor IDs",
  "code": "NOT_CHILD_STORYTAILOR_ID"
}
```

**400 Bad Request** - Invalid consent method:
```json
{
  "success": false,
  "error": "Invalid consent method. Must be one of: email, sms, video_call, id_verification, voice, app",
  "code": "INVALID_CONSENT_METHOD"
}
```

**500 Internal Server Error**:
```json
{
  "success": false,
  "error": "Failed to request consent",
  "code": "CONSENT_REQUEST_FAILED"
}
```

### cURL Example

```bash
curl -X POST "https://api.storytailor.dev/api/v1/storytailor-ids/550e8400-e29b-41d4-a716-446655440000/consent" \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{
    "consent_method": "email"
  }'
```

---

## 5. Transfer Storytailor ID

**Endpoint**: `POST /api/v1/storytailor-ids/:id/transfer`

**Description**: Transfer ownership of a Storytailor ID to another user. Only the owner can transfer.

### Path Parameters

- `id` (string, UUID, required) - Storytailor ID UUID to transfer

### Request Body

```json
{
  "to_user_id": "660e8400-e29b-41d4-a716-446655440001"
}
```

**Required Fields**:
- `to_user_id` (string, UUID, required) - Target user ID to transfer ownership to

### Success Response (200 OK)

```json
{
  "success": true,
  "message": "Storytailor ID transferred successfully",
  "data": {
    "storytailorId": "550e8400-e29b-41d4-a716-446655440000",
    "newOwnerId": "660e8400-e29b-41d4-a716-446655440001",
    "newOwnerEmail": "newowner@example.com"
  }
}
```

### Error Responses

**400 Bad Request** - Missing target user:
```json
{
  "success": false,
  "error": "to_user_id is required",
  "code": "TARGET_USER_REQUIRED"
}
```

**403 Forbidden** - Not owner:
```json
{
  "success": false,
  "error": "Only the owner can transfer a Storytailor ID",
  "code": "PERMISSION_DENIED"
}
```

**404 Not Found** - Target user not found:
```json
{
  "success": false,
  "error": "Target user not found",
  "code": "TARGET_USER_NOT_FOUND"
}
```

**500 Internal Server Error**:
```json
{
  "success": false,
  "error": "Failed to transfer Storytailor ID",
  "code": "TRANSFER_STORYTAILOR_ID_FAILED"
}
```

### cURL Example

```bash
curl -X POST "https://api.storytailor.dev/api/v1/storytailor-ids/550e8400-e29b-41d4-a716-446655440000/transfer" \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{
    "to_user_id": "660e8400-e29b-41d4-a716-446655440001"
  }'
```

---

## Response Object Reference

### StorytailorId Object

```typescript
interface StorytailorId {
  id: string;                    // UUID
  name: string;                  // Display name
  primaryCharacterId?: string | null;  // UUID of primary character (if character-first)
  ageRange?: '3-5' | '6-8' | '9-10' | '11-12' | '13-15' | '16-17' | null;
  isMinor?: boolean | null;      // Whether this is a child Storytailor ID
  consentStatus?: 'none' | 'pending' | 'verified' | 'revoked' | null;
  policyVersion?: string | null; // Policy version used for evaluation (e.g., "2025-01")
  evaluatedAt?: string | null;   // ISO 8601 timestamp of age evaluation
  createdAt: string;             // ISO 8601 timestamp
}
```

### Consent Object

```typescript
interface Consent {
  id: string;                    // UUID
  status: 'pending' | 'verified' | 'revoked';
  method: 'email' | 'sms' | 'video_call' | 'id_verification' | 'voice' | 'app';
  requestedAt: string;           // ISO 8601 timestamp
  expiresAt: string;             // ISO 8601 timestamp (7 days from request)
}
```

---

## Error Codes

| Code | Description | Solution |
|------|-------------|----------|
| `INVALID_INPUT` | Name is required | Provide `name` field |
| `CHARACTER_NOT_FOUND` | Primary character not found | Verify character ID exists |
| `CHARACTER_ALREADY_PRIMARY` | Character is already primary for another Storytailor ID | Use a different character or create a new one |
| `COPPA_CONSENT_REQUIRED` | Parent consent required for users under 13 | Request consent via `/consent` endpoint |
| `NOT_CHILD_STORYTAILOR_ID` | Consent workflow only applies to child Storytailor IDs | Ensure `parent_storytailor_id` is set |
| `INVALID_CONSENT_METHOD` | Invalid consent method | Use one of: email, sms, video_call, id_verification, voice, app |
| `PERMISSION_DENIED` | Only owner can transfer | Verify you are the owner |
| `TARGET_USER_REQUIRED` | to_user_id is required | Provide target user ID |
| `TARGET_USER_NOT_FOUND` | Target user does not exist | Verify user ID |
| `STORYTAILOR_ID_NOT_FOUND` | Storytailor ID not found | Verify ID and ownership |

---

## Integration Examples

### Character-First Creation Flow

```javascript
// Step 1: Create character
const characterResponse = await fetch('https://api.storytailor.dev/api/v1/characters', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'Emma',
    species: 'human',
    age: 7,
    personality: ['brave', 'curious']
  })
});
const character = await characterResponse.json();

// Step 2: Create Storytailor ID with character
const storytailorIdResponse = await fetch('https://api.storytailor.dev/api/v1/storytailor-ids', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: "Emma's Stories",
    primary_character_id: character.data.id,
    age_range: '6-8',
    is_minor: true
  })
});
const storytailorId = await storytailorIdResponse.json();
```

### Request Consent for Child Storytailor ID

```javascript
const consentResponse = await fetch(
  `https://api.storytailor.dev/api/v1/storytailor-ids/${storytailorIdId}/consent`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      consent_method: 'email'
    })
  }
);
const consent = await consentResponse.json();
// Parent receives email with verification link
```

---

**Last Updated**: December 26, 2025

