Status: Submission Ready  
Audience: PRIVO Auditor | Developer  
Last-Updated: 2025-01-15  
Owner: Storytailor Compliance Team  
Verified-Against-Code: Yes  
Doc-ID: PRIVO-API-REF-2025-001

# PRIVO Compliance API Reference

## Overview

This document provides detailed API reference for all COPPA compliance-related endpoints in the Storytailor platform. All endpoints are RESTful and return JSON responses.

**Base URL:** `https://api.storytailor.com/v1/`  
**Authentication:** Bearer token in `Authorization` header  
**Content-Type:** `application/json`

## Authentication

All endpoints (except health checks) require authentication via JWT Bearer token:

```
Authorization: Bearer <JWT_TOKEN>
```

**Token Format:** JWT (JSON Web Token)  
**Token Validation:** Tokens are validated on every request  
**Token Expiration:** Tokens expire after configured TTL (typically 24 hours)

**Code References:**
- `packages/universal-agent/src/middleware/AuthMiddleware.ts:29-78` - Authentication middleware
- `packages/token-service/src/TokenServiceAgent.ts` - Token service implementation

## Error Response Format

All error responses follow this format:

```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {
    // Additional error context
  }
}
```

**HTTP Status Codes:**
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `410` - Gone (expired resource)
- `500` - Internal Server Error

## Compliance Endpoints

### 1. User Registration with Age Verification

**Endpoint:** `POST /v1/auth/register`

**Description:** Register a new user with automatic COPPA protection for users under 13.

**Request Body:**
```json
{
  "email": "user@example.com",
  "age": 8,
  "parentEmail": "parent@example.com",
  "userType": "child",
  "name": "Child Name"
}
```

**Request Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `email` | string | Yes | User email address |
| `age` | integer | Yes | User age (1-120) |
| `parentEmail` | string | Conditional | Required if age < 13 |
| `userType` | string | Yes | `"child"` or `"parent"` |
| `name` | string | No | User display name |

**Response (Age < 13, with parentEmail):**
```json
{
  "success": true,
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "isCoppaProtected": true,
  "requiresConsent": true,
  "message": "Parent consent required"
}
```

**Response (Age >= 13):**
```json
{
  "success": true,
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "isCoppaProtected": false,
  "requiresConsent": false
}
```

**Error Response (Age < 13, no parentEmail):**
```json
{
  "success": false,
  "error": "Children under 13 require parent email for COPPA compliance",
  "code": "PARENT_EMAIL_REQUIRED"
}
```

**Database Enforcement:**
The database enforces parent email requirement at the schema level:

```sql
-- From migration 20240101000017_add_user_type_support.sql:76-78
IF p_age < 13 AND (p_parent_email IS NULL OR p_parent_email = '') THEN
  RAISE EXCEPTION 'Children under 13 require parent email for COPPA compliance';
END IF;
```

**Code References:**
- `packages/auth-agent/src/auth-agent.ts:99-100` - Registration handler
- `supabase/migrations/20240101000017_add_user_type_support.sql:76-78` - Database constraint

### 2. Request Parental Consent

**Endpoint:** `POST /v1/consent/request`

**Description:** Create a parental consent request for a child user.

**Request Body:**
```json
{
  "parentEmail": "parent@example.com",
  "childAge": 8,
  "method": "signed_form"
}
```

**Request Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `parentEmail` | string | Yes | Parent email address (must be valid email format) |
| `childAge` | integer | Yes | Child age (1-17) |
| `method` | string | No | Verification method (`"signed_form"`, `"email"`, `"sms"`) |

**Response:**
```json
{
  "requestId": "consent-1705312200000-abc123",
  "status": "pending"
}
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `requestId` | string | Unique consent request ID |
| `status` | string | Request status (`"pending"`) |

**Error Responses:**

**Invalid Email:**
```json
{
  "error": "parentEmail invalid",
  "code": "VALIDATION_ERROR"
}
```

**Invalid Age:**
```json
{
  "error": "childAge invalid",
  "code": "VALIDATION_ERROR"
}
```

**Implementation Details:**
- Consent request stored in Redis with key: `parentConsent:meta:{userId}`
- Consent status stored with key: `parentConsent:{userId}`
- Request ID format: `consent-{timestamp}-{random}`
- Default expiration: 7 days

**Code References:**
- `lambda-deployments/router/src/lambda.ts:652-677` - Consent request handler
- `lambda-deployments/router/src/lambda.ts:834-924` - Lightweight consent HTTP handler

### 3. Verify Parental Consent

**Endpoint:** `POST /v1/consent/verify`

**Description:** Verify a parental consent request using the request ID.

**Request Body:**
```json
{
  "requestId": "consent-1705312200000-abc123"
}
```

**Request Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `requestId` | string | Yes | Consent request ID from request endpoint |

**Response:**
```json
{
  "success": true,
  "status": "verified",
  "consentAt": "2025-01-15T10:30:00Z"
}
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Verification success |
| `status` | string | Consent status (`"verified"`) |
| `consentAt` | string | ISO 8601 timestamp of consent |

**Error Responses:**

**Request Not Found:**
```json
{
  "error": "Consent request not found",
  "code": "CONSENT_NOT_FOUND"
}
```

**Missing Request ID:**
```json
{
  "error": "requestId required",
  "code": "VALIDATION_ERROR"
}
```

**Implementation Details:**
- Validates request ID matches stored consent request
- Updates consent status to `verified`
- Records consent timestamp
- Increments user's auth subject version (forces token refresh)

**Code References:**
- `lambda-deployments/router/src/lambda.ts:679-698` - Consent verification handler

### 4. Check Consent Status

**Endpoint:** `GET /v1/consent/status`

**Description:** Get the current parental consent status for the authenticated user.

**Request Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Response:**
```json
{
  "status": "verified",
  "meta": {
    "id": "consent-1705312200000-abc123",
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "parentEmail": "parent@example.com",
    "childAge": 8,
    "method": "signed_form",
    "status": "verified",
    "consentAt": "2025-01-15T10:30:00Z",
    "createdAt": "2025-01-15T10:00:00Z"
  }
}
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `status` | string | Consent status: `"none"`, `"pending"`, `"verified"`, `"revoked"` |
| `meta` | object | Consent request metadata (if available) |

**Status Values:**

| Status | Description |
|--------|-------------|
| `none` | No consent request exists |
| `pending` | Consent request created but not verified |
| `verified` | Consent has been verified |
| `revoked` | Consent has been revoked |

**Code References:**
- `lambda-deployments/router/src/lambda.ts:700-712` - Consent status handler

### 5. Revoke Parental Consent

**Endpoint:** `POST /v1/consent/revoke`

**Description:** Revoke parental consent for the authenticated user.

**Request Body:**
```json
{
  "reason": "user_request"
}
```

**Request Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `reason` | string | No | Revocation reason (default: `"user_request"`) |

**Response:**
```json
{
  "success": true
}
```

**Implementation Details:**
- Deletes consent flag from Redis
- Records revocation timestamp and reason
- Updates consent status to `revoked`
- Increments user's auth subject version (forces token refresh)

**Code References:**
- `lambda-deployments/router/src/lambda.ts:714-727` - Consent revocation handler

### 6. Parent Data Access (GDPR Article 15 / COPPA)

**Endpoint:** `GET /v1/parent/data`

**Description:** Get all data associated with a child's account. Requires parent authentication.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userId` | string | Yes | Child user ID |

**Request Headers:**
```
Authorization: Bearer <PARENT_JWT_TOKEN>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "child@example.com",
      "age": 8,
      "isCoppaProtected": true,
      "parentEmail": "parent@example.com",
      "createdAt": "2025-01-01T00:00:00Z"
    },
    "stories": [
      {
        "id": "story-uuid",
        "title": "Story Title",
        "content": "Story content...",
        "createdAt": "2025-01-10T00:00:00Z"
      }
    ],
    "characters": [
      {
        "id": "character-uuid",
        "name": "Character Name",
        "traits": {},
        "createdAt": "2025-01-05T00:00:00Z"
      }
    ],
    "emotions": [
      {
        "id": "emotion-uuid",
        "emotion": "happy",
        "intensity": 0.8,
        "timestamp": "2025-01-15T10:00:00Z"
      }
    ],
    "consentRecords": [
      {
        "id": "consent-uuid",
        "status": "verified",
        "consentAt": "2025-01-15T10:30:00Z"
      }
    ],
    "safetyIncidents": [
      {
        "id": "incident-uuid",
        "severity": "low",
        "contentHash": "sha256-hash",
        "timestamp": "2025-01-14T15:00:00Z"
      }
    ]
  }
}
```

**Error Responses:**

**Unauthorized:**
```json
{
  "success": false,
  "error": "Authentication required",
  "code": "AUTH_REQUIRED"
}
```

**Forbidden (Not Parent):**
```json
{
  "success": false,
  "error": "Access denied. Only parents can access child data.",
  "code": "ACCESS_DENIED"
}
```

**Code References:**
- `docs/compliance/gdpr.md:80-120` - Data access implementation
- `supabase/migrations/20240101000002_enhanced_schema_and_policies.sql:269-330` - Data access functions

### 7. Parent Data Deletion (GDPR Article 17 / COPPA)

**Endpoint:** `DELETE /v1/parent/data`

**Description:** Delete all data associated with a child's account. Requires parent authentication.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userId` | string | Yes | Child user ID |

**Request Headers:**
```
Authorization: Bearer <PARENT_JWT_TOKEN>
```

**Response:**
```json
{
  "success": true,
  "deletedAt": "2025-01-15T10:30:00Z",
  "deletedItems": {
    "user": true,
    "stories": 5,
    "characters": 3,
    "emotions": 120,
    "consentRecords": 1
  }
}
```

**Implementation Details:**
- Validates parent authorization
- Deletes all child data from database
- Anonymizes audit logs (retained for legal compliance)
- Sends confirmation email to parent

**Error Responses:**

**Unauthorized:**
```json
{
  "success": false,
  "error": "Authentication required",
  "code": "AUTH_REQUIRED"
}
```

**Forbidden (Not Parent):**
```json
{
  "success": false,
  "error": "Access denied. Only parents can delete child data.",
  "code": "ACCESS_DENIED"
}
```

**Code References:**
- `docs/compliance/gdpr.md:121-160` - Data deletion implementation
- `packages/universal-agent/src/services/DeletionService.ts` - Deletion service
- `supabase/migrations/20240101000002_enhanced_schema_and_policies.sql:352-405` - Deletion functions

### 8. Parent Data Export (GDPR Article 20)

**Endpoint:** `GET /v1/parent/export`

**Description:** Export all data associated with a child's account in machine-readable format (JSON). Requires parent authentication.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userId` | string | Yes | Child user ID |

**Request Headers:**
```
Authorization: Bearer <PARENT_JWT_TOKEN>
```

**Response:**
```json
{
  "success": true,
  "exportUrl": "https://s3.amazonaws.com/storytailor-exports/export-550e8400-e29b-41d4-a716-446655440000-20250115.zip",
  "expiresAt": "2025-01-22T10:30:00Z",
  "format": "json",
  "size": 1048576
}
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `exportUrl` | string | S3 URL to download export file |
| `expiresAt` | string | ISO 8601 timestamp when URL expires (7 days) |
| `format` | string | Export format (`"json"`) |
| `size` | integer | Export file size in bytes |

**Export Contents:**
- All user data
- All story content
- All character data
- All emotional state data
- Consent history
- Safety incident summaries (hashed content, not raw text)

**Error Responses:**

**Unauthorized:**
```json
{
  "success": false,
  "error": "Authentication required",
  "code": "AUTH_REQUIRED"
}
```

**Forbidden (Not Parent):**
```json
{
  "success": false,
  "error": "Access denied. Only parents can export child data.",
  "code": "ACCESS_DENIED"
}
```

**Code References:**
- `docs/compliance/gdpr.md:161-179` - Data export implementation
- `packages/universal-agent/src/api/RESTAPIGateway.ts` - Export endpoint

### 9. Account Deletion (Alternative Endpoint)

**Endpoint:** `POST /api/v1/account/delete`

**Description:** Request account deletion (for any user, not just children).

**Request Body:**
```json
{
  "immediate": false,
  "reason": "user_request"
}
```

**Request Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `immediate` | boolean | No | Delete immediately or schedule deletion |
| `reason` | string | No | Deletion reason |

**Response:**
```json
{
  "success": true,
  "requestId": "deletion-request-uuid",
  "scheduledFor": "2025-01-22T10:30:00Z",
  "gracePeriod": 7
}
```

**Code References:**
- `packages/universal-agent/src/api/RESTAPIGateway.ts` - Account deletion endpoint
- `docs/system/deletion-system.md:129-137` - Deletion system documentation

### 10. Data Export (Alternative Endpoint)

**Endpoint:** `GET /api/v1/account/export`

**Description:** Export all user data (for any user, not just children).

**Request Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Response:**
```json
{
  "success": true,
  "exportUrl": "https://s3.amazonaws.com/storytailor-exports/export-uuid.zip",
  "expiresAt": "2025-01-22T10:30:00Z"
}
```

**Code References:**
- `packages/universal-agent/src/api/RESTAPIGateway.ts` - Export endpoint
- `docs/system/deletion-system.md:137` - Export documentation

## Middleware Protection

### Parent Consent Middleware

**Endpoint Protection:** All endpoints that collect or process child data are protected by parent consent middleware.

**Middleware Behavior:**
- Checks if user is COPPA-protected (`isCoppaProtected === true`)
- Verifies parent consent is verified (`parentConsentVerified === true`)
- Blocks request if consent not verified

**Protected Endpoints:**
- Story creation endpoints
- Character creation endpoints
- Emotion tracking endpoints
- Any data collection endpoints

**Error Response (Consent Required):**
```json
{
  "success": false,
  "error": "Parent consent required for this action",
  "code": "PARENT_CONSENT_REQUIRED",
  "details": {
    "isCoppaProtected": true,
    "parentConsentVerified": false,
    "message": "This account requires parent consent before accessing this feature."
  }
}
```

**Code References:**
- `packages/universal-agent/src/middleware/AuthMiddleware.ts:83-108` - Parent consent middleware

## Rate Limiting

**Rate Limits:**
- Consent requests: 5 per hour per user
- Data access requests: 10 per day per parent
- Data deletion requests: 1 per day per parent
- Data export requests: 3 per day per parent

**Rate Limit Headers:**
```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 9
X-RateLimit-Reset: 1705312800
```

**Rate Limit Error Response:**
```json
{
  "success": false,
  "error": "Rate limit exceeded",
  "code": "RATE_LIMIT_EXCEEDED",
  "retryAfter": 3600
}
```

## Testing

### Example cURL Commands

**Register Child User:**
```bash
curl -X POST https://api.storytailor.com/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "child@example.com",
    "age": 8,
    "parentEmail": "parent@example.com",
    "userType": "child"
  }'
```

**Request Parental Consent:**
```bash
curl -X POST https://api.storytailor.com/v1/consent/request \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "parentEmail": "parent@example.com",
    "childAge": 8
  }'
```

**Verify Consent:**
```bash
curl -X POST https://api.storytailor.com/v1/consent/verify \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "requestId": "consent-1705312200000-abc123"
  }'
```

**Check Consent Status:**
```bash
curl -X GET https://api.storytailor.com/v1/consent/status \
  -H "Authorization: Bearer <token>"
```

**Get Parent Data:**
```bash
curl -X GET "https://api.storytailor.com/v1/parent/data?userId=<child_user_id>" \
  -H "Authorization: Bearer <parent_token>"
```

**Export Parent Data:**
```bash
curl -X GET "https://api.storytailor.com/v1/parent/export?userId=<child_user_id>" \
  -H "Authorization: Bearer <parent_token>"
```

**Delete Parent Data:**
```bash
curl -X DELETE "https://api.storytailor.com/v1/parent/data?userId=<child_user_id>" \
  -H "Authorization: Bearer <parent_token>"
```

## Related Documentation

- **[PRIVO Certification Package](./privo-certification-package.md)** - Main certification document
- **[COPPA Compliance](./coppa.md)** - COPPA compliance documentation
- **[GDPR Compliance](./gdpr.md)** - GDPR compliance documentation
- **[System Architecture](../system/architecture.md)** - System architecture

---

**Document Version:** 1.0  
**Last Updated:** 2025-01-15
