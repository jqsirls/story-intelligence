# Authentication API Reference

**Date**: December 25, 2025  
**Base URL**: `https://api.storytailor.dev/api/v1/auth`  
**Version**: 1.0

---

## Overview

The Storytailor REST API uses JWT-based authentication. All authentication endpoints are under `/api/v1/auth`.

### Authentication Flow

1. **Sign Up** → Get access token + refresh token
2. **Sign In** → Get access token + refresh token  
3. **Use Access Token** → Include in `Authorization: Bearer <token>` header
4. **Refresh Token** → Get new access token when expired
5. **Sign Out** → Revoke refresh token

---

## Endpoints

### 1. Sign Up (Register) - Adult-Only Registration

**Endpoint**: `POST /api/v1/auth/register`

**Description**: Create a new adult user account with jurisdiction-aware age verification (COPPA/GDPR-K compliance). **Registration is restricted to adults only** - minors are hard-blocked. Child profiles (Storytailor IDs) are created separately via `/api/v1/storytailor-ids` endpoint after adult registration.

**Request Body**:

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

**Required Fields**:
- `email` (string, email format)
- `password` (string, minimum 8 characters)
- `userType` (string, see valid values below) - **`child` is NOT allowed**
- `country` (string, ISO-3166-1 alpha-2, e.g., "US", "GB", "FR") - **Required for jurisdiction-aware age verification**
- `ageVerification` (object, required) - See age verification methods below
- `firstName` (string, max 50 characters)
- `lastName` (string, max 50 characters)

**Optional Fields**:
- `locale` (string, format: "en-US" or "fr-FR")

**Valid User Types** (adults only):
- `parent`
- `guardian`
- `grandparent`
- `aunt_uncle`
- `older_sibling`
- `foster_caregiver`
- `teacher`
- `librarian`
- `afterschool_leader`
- `childcare_provider`
- `nanny`
- `child_life_specialist`
- `therapist`
- `medical_professional`
- `coach_mentor`
- `enthusiast`
- `other`
- **REMOVED**: `child` (children cannot register - use Storytailor ID creation instead)

**Age Verification Methods**:

1. **Confirmation** (lowest assurance - user attests to being over threshold):
```json
{
  "method": "confirmation"
}
```

2. **Birth Year** (moderate assurance):
```json
{
  "method": "birthYear",
  "value": 1990
}
```

3. **Age Range** (for child Storytailor IDs, not registration):
```json
{
  "method": "ageRange",
  "value": "6-8"
}
```

**Jurisdiction-Aware Age Thresholds**:

| Country | Minor Threshold | Framework |
|---------|----------------|-----------|
| US | 13 | COPPA |
| GB | 13 | UK Children's Code |
| DE | 16 | GDPR-K |
| FR | 15 | GDPR-K |
| CA | 13 | COPPA |
| Unknown | 16 | NONE (safer default) |

**Success Response** (201 Created):

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

**Error Responses**:

- **400 Bad Request** - Validation error:
```json
{
  "success": false,
  "error": "Validation Error",
  "details": "\"country\" must be a 2-letter ISO code"
}
```

- **403 Forbidden** - Minor detected (hard-block):
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

- **400 Bad Request** - Account creation failed:
```json
{
  "success": false,
  "error": "User already registered"
}
```

**cURL Example**:

```bash
curl -X POST "https://api.storytailor.dev/api/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
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
  }'
```

**Important Notes**:

1. **Adult-Only Registration**: The `/auth/register` endpoint **hard-blocks** minors. If age verification determines the user is below the jurisdiction threshold, registration is rejected with `403 ADULT_REQUIRED`.

2. **Auto-Created Storytailor ID**: Upon successful registration, a default Storytailor ID (library) is automatically created for the user. This is returned in the `defaultStorytailorId` field.

3. **Child Profiles**: Children cannot register directly. Instead, adults create child Storytailor IDs via `POST /api/v1/storytailor-ids` with appropriate consent workflows.

4. **Age Verification Audit**: All age verification attempts are logged to `age_verification_audit` table for compliance, even if registration is blocked.

---

### 2. Sign In (Login)

**Endpoint**: `POST /api/v1/auth/login`

**Description**: Authenticate user and receive JWT tokens.

**Request Body**:

```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Required Fields**:
- `email` (string, email format)
- `password` (string)

**Success Response** (200 OK):

```json
{
  "success": true,
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "isMinor": false,
    "minorThreshold": 13,
    "applicableFramework": "COPPA",
    "lastLoginAt": "2025-12-25T12:00:00.000Z"
  },
  "tokens": {
    "accessToken": "[REDACTED_JWT]",
    "refreshToken": "[REDACTED_JWT]",
    "expiresIn": 3600
  }
}
```

**Note**: The `age` and `isCoppaProtected` fields have been removed. Use `isMinor`, `minorThreshold`, and `applicableFramework` instead.

**Error Responses**:

- **401 Unauthorized** - Invalid credentials:
```json
{
  "success": false,
  "error": "Invalid email or password"
}
```

- **400 Bad Request** - Validation error:
```json
{
  "success": false,
  "error": "Validation Error",
  "details": "\"email\" must be a valid email"
}
```

**cURL Example**:

```bash
curl -X POST "https://api.storytailor.dev/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePassword123!"
  }'
```

---

### 3. Get Current User

**Endpoint**: `GET /api/v1/auth/me`

**Description**: Get authenticated user profile.

**Authentication**: Required (Bearer token)

**Headers**:
```
Authorization: Bearer <accessToken>
```

**Success Response** (200 OK):

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "userType": "parent",
    "country": "US",
    "locale": "en-US",
    "isMinor": false,
    "isEmailConfirmed": true,
    "lastLoginAt": "2025-12-25T12:00:00.000Z",
    "createdAt": "2025-12-20T10:00:00.000Z"
  }
}
```

**Note**: `age`, `isCoppaProtected`, and `parentConsentVerified` fields have been removed. Use `isMinor` instead (always `false` for registered users since registration is adults-only).

**Error Responses**:

- **401 Unauthorized** - Missing or invalid token:
```json
{
  "success": false,
  "error": "Authorization token required"
}
```

**cURL Example**:

```bash
curl -X GET "https://api.storytailor.dev/api/v1/auth/me" \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json"
```

---

### 4. Refresh Token

**Endpoint**: `POST /api/v1/auth/refresh`

**Description**: Refresh JWT access token using refresh token.

**Request Body**:

```json
{
  "refreshToken": "[REDACTED_JWT]"
}
```

**Success Response** (200 OK):

```json
{
  "success": true,
  "tokens": {
    "accessToken": "[REDACTED_JWT]",
    "refreshToken": "[REDACTED_JWT]",
    "expiresIn": 3600
  }
}
```

**Error Responses**:

- **401 Unauthorized** - Invalid or expired refresh token:
```json
{
  "success": false,
  "error": "Invalid or expired refresh token"
}
```

**cURL Example**:

```bash
curl -X POST "https://api.storytailor.dev/api/v1/auth/refresh" \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "<refreshToken>"
  }'
```

---

### 5. Sign Out (Logout)

**Endpoint**: `POST /api/v1/auth/logout`

**Description**: Revoke refresh token and sign out user.

**Request Body**:

```json
{
  "refreshToken": "[REDACTED_JWT]"
}
```

**Success Response** (200 OK):

```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

**cURL Example**:

```bash
curl -X POST "https://api.storytailor.dev/api/v1/auth/logout" \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "<refreshToken>"
  }'
```

---

### 6. Forgot Password

**Endpoint**: `POST /api/v1/auth/forgot-password`

**Description**: Request password reset email.

**Request Body**:

```json
{
  "email": "user@example.com"
}
```

**Success Response** (200 OK):

```json
{
  "success": true,
  "message": "Password reset email sent"
}
```

**cURL Example**:

```bash
curl -X POST "https://api.storytailor.dev/api/v1/auth/forgot-password" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com"
  }'
```

---

## Google OAuth Setup

**Status**: ⚠️ **Not Currently Configured**

Google OAuth is supported by Supabase but requires configuration in the Supabase dashboard.

### To Enable Google OAuth:

1. **Go to Supabase Dashboard**:
   - Navigate to: Authentication → Providers → Google

2. **Configure Google OAuth**:
   - Enable Google provider
   - Add Google Client ID
   - Add Google Client Secret
   - Set redirect URL: `https://lendybmmnlqelrhkhdyc.supabase.co/auth/v1/callback`

3. **Update Supabase Config** (local development):
   ```toml
   [auth.external.google]
   enabled = true
   client_id = "env(SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID)"
   secret = "env(SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET)"
   ```

4. **Use Supabase SDK for OAuth**:
   ```javascript
   // Frontend (Wized/Webflow)
   const { data, error } = await supabase.auth.signInWithOAuth({
     provider: 'google',
     options: {
       redirectTo: 'https://storytailor.com/auth/callback'
     }
   })
   ```

5. **REST API OAuth Flow**:
   - OAuth is handled via Supabase Auth endpoints
   - After OAuth callback, use Supabase session token
   - Exchange Supabase session for Storytailor JWT via `/api/v1/auth/me` with Supabase token

### Current Implementation:

- ✅ Email/Password sign up and sign in
- ✅ JWT token generation
- ✅ Token refresh
- ✅ Password reset
- ⚠️ Google OAuth (requires Supabase configuration)

---

## Testing

### Quick Test Script

Run the test script:

```bash
chmod +x scripts/test-auth-endpoints.sh
./scripts/test-auth-endpoints.sh
```

### Manual Testing

1. **Sign Up**:
```bash
curl -X POST "https://api.storytailor.dev/api/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123!",
    "userType": "parent",
    "country": "US",
    "locale": "en-US",
    "ageVerification": {
      "method": "confirmation"
    },
    "firstName": "Test",
    "lastName": "User"
  }'
```

2. **Sign In**:
```bash
curl -X POST "https://api.storytailor.dev/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123!"
  }'
```

3. **Get Current User**:
```bash
curl -X GET "https://api.storytailor.dev/api/v1/auth/me" \
  -H "Authorization: Bearer <accessToken>"
```

---

## Error Codes

| Code | Description | Solution |
|------|-------------|----------|
| `VALIDATION_ERROR` | Request body validation failed | Check required fields and formats |
| `USER_ALREADY_EXISTS` | Email already registered | Use sign in instead |
| `INVALID_CREDENTIALS` | Email or password incorrect | Verify credentials |
| `INVALID_TOKEN` | Access token invalid or expired | Refresh token or sign in again |
| `TOKEN_EXPIRED` | Refresh token expired | Sign in again |
| `ADULT_REQUIRED` | Minor detected - registration blocked | Registration is adults-only. Create child Storytailor ID instead |
| `INVALID_COUNTRY` | Country must be 2-letter ISO code | Use valid ISO-3166-1 alpha-2 code (e.g., "US", "GB") |
| `INVALID_AGE_VERIFICATION` | Age verification method or value invalid | Use valid method: "confirmation", "birthYear", or "ageRange" |

---

## Security Notes

1. **Password Requirements**: Minimum 8 characters (enforced by Supabase)
2. **Token Expiration**: Access tokens expire in 1 hour (3600 seconds)
3. **Refresh Tokens**: Valid for 14 days (1209600 seconds)
4. **COPPA/GDPR-K Compliance**: Registration is adults-only with jurisdiction-aware age verification. Minors are hard-blocked. Child profiles (Storytailor IDs) are created separately with parental consent workflows.
5. **HTTPS Only**: All endpoints require HTTPS in production

---

## Integration Examples

### Wized Integration

```javascript
// Sign Up Request (Adult-Only)
Name: SignUp
Method: POST
Endpoint: /auth/register
Body: {
  "email": v.signupEmail,
  "password": v.signupPassword,
  "userType": v.userType,  // No 'child' allowed
  "country": v.country,     // Required: ISO-3166-1 alpha-2
  "locale": v.locale,       // Optional: e.g., "en-US"
  "ageVerification": {
    "method": "confirmation"  // or "birthYear" with value
  },
  "firstName": v.firstName,
  "lastName": v.lastName
}

// On Success
v.accessToken = r.SignUp.data.tokens.accessToken
v.refreshToken = r.SignUp.data.tokens.refreshToken
v.userId = r.SignUp.data.user.id
v.defaultStorytailorId = r.SignUp.data.defaultStorytailorId.id
```

### JavaScript/TypeScript

```typescript
const signUp = async (email: string, password: string, userType: string) => {
  const response = await fetch('https://api.storytailor.dev/api/v1/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password,
      age: 35,
      userType,
      firstName: 'John',
      lastName: 'Doe'
    })
  });
  
  const data = await response.json();
  if (data.success) {
    localStorage.setItem('accessToken', data.tokens.accessToken);
    localStorage.setItem('refreshToken', data.tokens.refreshToken);
  }
  return data;
};
```

---

**Last Updated**: December 25, 2025

