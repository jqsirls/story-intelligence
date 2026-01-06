# Storytailor ID Implementation Guide - Internal Teams

**Date**: December 26, 2025  
**Version**: 1.0  
**Status**: ✅ Implementation Complete

---

## Overview

This guide documents the complete implementation of **Storytailor IDs** - narrative identities for children represented through characters rather than personal data. This implementation includes:

1. **Adult-Only Registration** with jurisdiction-aware age verification (COPPA/GDPR-K compliance)
2. **Storytailor ID System** - Character-first creation, consent workflows, transfer capabilities
3. **Multi-Protocol Support** - REST API, A2A protocol, and SDK integration points
4. **Comprehensive Documentation** - Complete API references with expected return objects

---

## Architecture Changes

### Database Schema

**New/Enhanced Tables**:
- `libraries` - Enhanced with Storytailor ID fields (`primary_character_id`, `is_storytailor_id`, `age_range`, `is_minor`, `consent_status`, etc.)
- `characters` - Enhanced with identity layer fields (`is_primary`, `library_id`)
- `library_consent` - New table for tracking parental consent
- `age_verification_audit` - New table for compliance logging
- `users` - Modified to remove `age`/`parent_email`, add jurisdiction fields

**Migrations**:
- `20251226000000_adult_only_registration.sql` - Adult-only registration schema
- `20251226000001_storytailor_id_enhancement.sql` - Storytailor ID enhancements
- `20251226000002_library_consent.sql` - Consent tracking
- `20251226000003_migrate_existing_libraries.sql` - Data migration

### Services

**New Services**:
- `JurisdictionService` - Jurisdiction-aware age verification (50+ countries, COPPA/GDPR-K/UK Children's Code)

**Enhanced Services**:
- `LibraryService` - Character-first creation, consent status management
- `AuthRoutes` - Adult-only registration with hard-block logic

---

## REST API Endpoints

### Base URL
`https://api.storytailor.dev/api/v1`

### Authentication
All endpoints require: `Authorization: Bearer <accessToken>`

### Endpoints

#### 1. POST /auth/register (Adult-Only Registration)

**Request**:
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "userType": "parent",
  "country": "US",
  "locale": "en-US",
  "ageVerification": {
    "method": "confirmation"
  },
  "firstName": "John",
  "lastName": "Doe"
}
```

**Success Response (201)**:
```json
{
  "success": true,
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "userType": "parent",
    "country": "US",
    "locale": "en-US",
    "isMinor": false,
    "minorThreshold": 13,
    "applicableFramework": "COPPA"
  },
  "defaultStorytailorId": {
    "id": "library-123",
    "name": "My Stories"
  },
  "tokens": {
    "accessToken": "[REDACTED_JWT]",
    "refreshToken": "[REDACTED_JWT]",
    "expiresIn": 3600
  }
}
```

**Error Response (403)** - Minor detected:
```json
{
  "success": false,
  "error": "ADULT_REQUIRED",
  "code": "ADULT_REQUIRED",
  "message": "Registration is restricted to adults only. Users must meet the minimum age requirement in their country.",
  "details": {
    "country": "US",
    "minorThreshold": 13,
    "applicableFramework": "COPPA"
  }
}
```

#### 2. POST /storytailor-ids (Create Storytailor ID)

**Request**:
```json
{
  "name": "Emma's Stories",
  "primary_character_id": "char-123",
  "age_range": "6-8",
  "is_minor": true
}
```

**Success Response (201)**:
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

#### 3. GET /storytailor-ids (List Storytailor IDs)

**Success Response (200)**:
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
    }
  ]
}
```

#### 4. GET /storytailor-ids/:id (Get Storytailor ID)

**Success Response (200)**:
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

#### 5. POST /storytailor-ids/:id/consent (Request Parental Consent)

**Request**:
```json
{
  "consent_method": "email",
  "consent_scope": {}
}
```

**Success Response (201)**:
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

#### 6. POST /storytailor-ids/:id/transfer (Transfer Ownership)

**Request**:
```json
{
  "to_user_id": "660e8400-e29b-41d4-a716-446655440001"
}
```

**Success Response (200)**:
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

**Complete Documentation**: See `docs/api-reference/protocols/rest/15-storytailor-id-endpoints.md`

---

## A2A Protocol Methods

### Base URL
`https://storyintelligence.dev/a2a/message`

### Authentication
A2A methods require `userId` in the A2A context. Authentication is handled via API keys or OAuth (see `docs/api-reference/protocols/a2a/01-authentication.md`).

### Methods

#### 1. storytailor_id.create

**Request**:
```json
{
  "jsonrpc": "2.0",
  "id": "stid-1",
  "method": "storytailor_id.create",
  "params": {
    "name": "Emma's Stories",
    "primary_character_id": "char-123",
    "age_range": "6-8",
    "is_minor": true
  }
}
```

**Success Response**:
```json
{
  "jsonrpc": "2.0",
  "id": "stid-1",
  "result": {
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
}
```

#### 2. storytailor_id.get

**Request**:
```json
{
  "jsonrpc": "2.0",
  "id": "stid-2",
  "method": "storytailor_id.get",
  "params": {
    "id": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

**Success Response**:
```json
{
  "jsonrpc": "2.0",
  "id": "stid-2",
  "result": {
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
}
```

#### 3. storytailor_id.transfer

**Request**:
```json
{
  "jsonrpc": "2.0",
  "id": "stid-3",
  "method": "storytailor_id.transfer",
  "params": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "to_user_id": "660e8400-e29b-41d4-a716-446655440001"
  }
}
```

**Success Response**:
```json
{
  "jsonrpc": "2.0",
  "id": "stid-3",
  "result": {
    "message": "Storytailor ID transferred successfully",
    "data": {
      "storytailorId": "550e8400-e29b-41d4-a716-446655440000",
      "newOwnerId": "660e8400-e29b-41d4-a716-446655440001",
      "newOwnerEmail": "newowner@example.com"
    }
  }
}
```

**Note**: A2A Storytailor ID methods delegate directly to REST API endpoints via HTTP calls. They do not route through the router.

**Complete Documentation**: See `docs/api-reference/protocols/a2a/03-messaging.md`

---

## Type Definitions

### StorytailorId Type

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

### Consent Type

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

## Error Codes Reference

### Authentication Errors

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `ADULT_REQUIRED` | 403 | Minor detected - registration blocked |
| `INVALID_COUNTRY` | 400 | Country must be 2-letter ISO code |
| `INVALID_AGE_VERIFICATION` | 400 | Age verification method or value invalid |

### Storytailor ID Errors

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INVALID_INPUT` | 400 | Name is required |
| `CHARACTER_NOT_FOUND` | 404 | Primary character not found |
| `CHARACTER_ALREADY_PRIMARY` | 409 | Character is already primary for another Storytailor ID |
| `COPPA_CONSENT_REQUIRED` | 403 | Parent consent required for users under 13 |
| `NOT_CHILD_STORYTAILOR_ID` | 400 | Consent workflow only applies to child Storytailor IDs |
| `INVALID_CONSENT_METHOD` | 400 | Invalid consent method |
| `PERMISSION_DENIED` | 403 | Only owner can transfer |
| `TARGET_USER_REQUIRED` | 400 | to_user_id is required |
| `TARGET_USER_NOT_FOUND` | 404 | Target user does not exist |
| `STORYTAILOR_ID_NOT_FOUND` | 404 | Storytailor ID not found |

### A2A Protocol Errors

| Code | Description |
|------|-------------|
| `-32005` | Capability not supported (validation errors, not found) |
| `-32006` | Authentication failed (user ID required, permission denied) |
| `-32601` | Method not found |

---

## Jurisdiction-Aware Age Verification

### Supported Countries and Thresholds

| Country | Minor Threshold | Framework | Policy Version |
|---------|-----------------|-----------|----------------|
| US | 13 | COPPA | 2025-01 |
| GB | 13 | UK Children's Code | 2025-01 |
| DE | 16 | GDPR-K | 2025-01 |
| FR | 15 | GDPR-K | 2025-01 |
| CA | 13 | COPPA | 2025-01 |
| Unknown | 16 | NONE | 2025-01 |

**Complete List**: See `packages/universal-agent/src/services/JurisdictionService.ts` for all 50+ countries.

### Age Verification Methods

1. **Confirmation** (lowest assurance):
   - User attests to being over threshold
   - Used for adult registration
   - Stored as `derived_bucket: 'adult_confirmed'`

2. **Birth Year** (moderate assurance):
   - Age calculated from birth year
   - Stored as `derived_bucket: 'adult_birthyear'` or `'minor_detected'`

3. **Age Range** (for child Storytailor IDs):
   - Coarse age range (e.g., "6-8")
   - Stored as `derived_bucket: 'adult_agerange'`

---

## Character-First Creation Flow

### Two-Step Process

1. **Create Character**:
   ```bash
   POST /api/v1/characters
   {
     "name": "Emma",
     "species": "human",
     "age": 7,
     "personality": ["brave", "curious"]
   }
   ```

2. **Create Storytailor ID with Character**:
   ```bash
   POST /api/v1/storytailor-ids
   {
     "name": "Emma's Stories",
     "primary_character_id": "<character-id-from-step-1>",
     "age_range": "6-8",
     "is_minor": true
   }
   ```

**What Happens**:
- Character is marked as `is_primary = true`
- Character is linked to library via `library_id`
- Storytailor ID is created with `primary_character_id` set

---

## Consent Workflow

### For Child Storytailor IDs

1. **Create Child Storytailor ID** (sub-library):
   ```bash
   POST /api/v1/storytailor-ids
   {
     "name": "Emma's Stories",
     "parent_storytailor_id": "<parent-library-id>",
     "age_range": "6-8",
     "is_minor": true
   }
   ```
   - `consentStatus` defaults to `'pending'`

2. **Request Consent**:
   ```bash
   POST /api/v1/storytailor-ids/:id/consent
   {
     "consent_method": "email"
   }
   ```
   - Sends consent email to adult user
   - Creates consent record in `library_consent` table
   - Returns verification token and consent URL

3. **Verify Consent** (via email link):
   - User clicks link in email
   - Consent status updated to `'verified'`
   - Storytailor ID becomes active

---

## Transfer Workflow

### Transfer Storytailor ID Ownership

1. **Verify Ownership**:
   - Current user must be owner (role = 'Owner' in `library_permissions`)

2. **Transfer**:
   ```bash
   POST /api/v1/storytailor-ids/:id/transfer
   {
     "to_user_id": "<target-user-id>"
   }
   ```
   - Updates `libraries.owner` to target user
   - Updates owner permission in `library_permissions`
   - Sends email notification to new owner

---

## Testing

### Unit Tests

- `packages/universal-agent/src/services/__tests__/JurisdictionService.test.ts` - Jurisdiction service tests
- `packages/universal-agent/src/api/__tests__/AuthRoutes.test.ts` - Auth routes integration tests

### Integration Tests

Run with:
```bash
npm run test:integration
```

### Manual Testing

See `docs/api/AUTH_API_REFERENCE.md` and `docs/api-reference/protocols/rest/15-storytailor-id-endpoints.md` for cURL examples.

---

## Code Locations

### Core Implementation

- **Jurisdiction Service**: `packages/universal-agent/src/services/JurisdictionService.ts`
- **Auth Routes**: `packages/universal-agent/src/api/AuthRoutes.ts`
- **REST API Gateway**: `packages/universal-agent/src/api/RESTAPIGateway.ts` (lines 1148-1589)
- **Library Service**: `packages/library-agent/src/services/LibraryService.ts`
- **A2A Router Integration**: `packages/a2a-adapter/src/RouterIntegration.ts`

### Database Migrations

- `supabase/migrations/20251226000000_adult_only_registration.sql`
- `supabase/migrations/20251226000001_storytailor_id_enhancement.sql`
- `supabase/migrations/20251226000002_library_consent.sql`
- `supabase/migrations/20251226000003_migrate_existing_libraries.sql`

### Documentation

- **Auth API**: `docs/api/AUTH_API_REFERENCE.md`
- **REST API Storytailor IDs**: `docs/api-reference/protocols/rest/15-storytailor-id-endpoints.md`
- **A2A Protocol**: `docs/api-reference/protocols/a2a/03-messaging.md`
- **Internal Guide**: `docs/internal/STORYTAILOR_ID_IMPLEMENTATION_GUIDE.md` (this file)

---

## Important Notes for Internal Teams

### 1. Adult-Only Registration

- **Hard-Block**: Minors are **hard-blocked** at registration. No user account is created, no tokens are issued.
- **Jurisdiction-Aware**: Age thresholds vary by country (13 for US, 16 for DE, etc.)
- **Auto-Created Storytailor ID**: Every successful registration automatically creates a default Storytailor ID

### 2. Storytailor ID vs. Library

- **Storytailor ID** = Enhanced library with character-first identity
- All libraries are Storytailor IDs (`is_storytailor_id = true`)
- Sub-libraries (where `parent_library IS NOT NULL`) are child Storytailor IDs

### 3. Character-First Creation

- Character can be created first, then linked to Storytailor ID
- Character is marked as `is_primary = true` and linked via `library_id`
- One primary character per Storytailor ID (enforced by unique index)

### 4. Consent Workflow

- Only applies to child Storytailor IDs (sub-libraries)
- Consent status: `none` → `pending` → `verified` (or `revoked`)
- Consent methods: email, sms, video_call, id_verification, voice, app
- Consent expires after 7 days

### 5. A2A Protocol Integration

- Storytailor ID methods delegate to REST API via HTTP calls
- Require `userId` in A2A context for authentication
- Do not route through router (direct REST API delegation)

### 6. Migration Strategy

- Existing libraries automatically become Storytailor IDs
- Existing users without libraries get default Storytailor ID created
- Sub-libraries get `consent_status = 'pending'` if `is_minor` is not yet evaluated

---

## Next Steps (Pending)

1. **MCP Tools** - Add Storytailor ID tools to Fieldnotes research agent MCP server
2. **SDK Updates** - Add Storytailor ID methods to Web, iOS, Android, React Native SDKs
3. **Embed Widget** - Add character selection UI for Storytailor ID selection
4. **E2E Tests** - Create comprehensive end-to-end tests for Storytailor ID workflows
5. **Protocol Integration Tests** - Test A2A and MCP Storytailor ID methods

---

**Last Updated**: December 26, 2025  
**Maintained By**: Storytailor Engineering Team

