# Common API Errors & Solutions

**Quick Reference for Troubleshooting**

---

## Error Quick Reference

| Code | Name | Quick Fix |
|------|------|-----------|
| `ERR_1001` | Unauthorized | Check Authorization header |
| `ERR_1003` | Token Expired | Refresh token |
| `ERR_1004` | Forbidden | Check permissions |
| `ERR_2001` | Validation Failed | Check request body |
| `ERR_3001` | Not Found | Verify resource ID |
| `ERR_4001` | Rate Limited | Wait and retry |
| `ERR_5001` | Server Error | Contact support |
| `ERR_6001` | Subscription Required | Upgrade plan |

---

## Authentication Errors

### ERR_1001: Unauthorized

**Error:**
```json
{
  "success": false,
  "error": "Authorization header required",
  "code": "ERR_1001"
}
```

**Causes:**
- Missing `Authorization` header
- Missing `Bearer` prefix
- Empty token value

**Solution:**
```javascript
// Ensure Authorization header is present
fetch('/api/v1/stories', {
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  }
});
```

---

### ERR_1002: Invalid Token

**Error:**
```json
{
  "success": false,
  "error": "Invalid or malformed token",
  "code": "ERR_1002"
}
```

**Causes:**
- Token is not a valid JWT
- Token was generated for a different environment
- Token was modified after creation

**Solution:**
1. Verify token format (three dot-separated base64 segments)
2. Check you're using the correct environment token
3. Obtain a fresh token via login

---

### ERR_1003: Token Expired

**Error:**
```json
{
  "success": false,
  "error": "Token expired",
  "code": "ERR_1003"
}
```

**Causes:**
- Access token has exceeded its 15-minute lifetime

**Solution:**
```javascript
// Refresh the token
const response = await fetch('/api/v1/auth/refresh', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ refreshToken })
});

const { accessToken } = await response.json().then(r => r.data);
```

**Prevention:**
- Implement proactive token refresh before expiry
- Store token expiry timestamp and refresh when approaching

---

### ERR_1004: Forbidden

**Error:**
```json
{
  "success": false,
  "error": "Insufficient permissions",
  "code": "ERR_1004"
}
```

**Causes:**
- User doesn't have required role
- Accessing another user's private resource
- Admin-only endpoint accessed by regular user

**Solution:**
1. Verify user has the required role
2. Check resource ownership
3. Confirm endpoint permissions

---

### ERR_1005: COPPA Consent Required

**Error:**
```json
{
  "success": false,
  "error": "COPPA consent required for this profile",
  "code": "ERR_1005",
  "details": {
    "verifyUrl": "/api/v1/consent/coppa"
  }
}
```

**Causes:**
- Attempting to access child profile without verified parental consent

**Solution:**
1. Complete parental verification flow
2. Use the provided `verifyUrl` to submit consent

---

## Validation Errors

### ERR_2001: Validation Failed

**Error:**
```json
{
  "success": false,
  "error": "Validation failed",
  "code": "ERR_2001",
  "details": {
    "fields": [
      {
        "field": "email",
        "message": "'email' must be a valid email",
        "type": "string.email"
      }
    ]
  }
}
```

**Common Causes:**
- Missing required fields
- Invalid field format
- Value out of range
- Invalid enum value

**Solution:**
1. Check the `details.fields` array
2. Fix each validation error
3. Resubmit request

**Common Validation Issues:**

| Field | Issue | Fix |
|-------|-------|-----|
| `email` | Invalid format | Use valid email format |
| `password` | Too short | Minimum 8 characters |
| `storyType` | Invalid value | Use: bedtime, adventure, educational, therapeutic, celebration |
| `limit` | Exceeds max | Maximum 100 |
| `uuid` | Invalid format | Must be UUIDv4 |

---

## Resource Errors

### ERR_3001: Not Found

**Error:**
```json
{
  "success": false,
  "error": "Story not found",
  "code": "ERR_3001",
  "details": {
    "resource": "story",
    "id": "invalid-uuid"
  }
}
```

**Causes:**
- Resource doesn't exist
- Resource was deleted
- Incorrect ID format
- No access to resource (RLS filtering)

**Solution:**
1. Verify resource ID is correct
2. Check resource hasn't been deleted
3. Confirm user has access to the resource

---

### ERR_3002: Already Exists

**Error:**
```json
{
  "success": false,
  "error": "Resource already exists",
  "code": "ERR_3002"
}
```

**Causes:**
- Duplicate unique constraint (email, name, etc.)
- Attempting to recreate existing resource

**Solution:**
- Check if resource already exists before creating
- Use update endpoint instead of create

---

## Rate Limiting Errors

### ERR_4001: Rate Limit Exceeded

**Error:**
```json
{
  "success": false,
  "error": "Rate limit exceeded",
  "code": "ERR_4001",
  "details": {
    "limit": 30,
    "resetAt": "2024-01-01T12:01:00Z",
    "retryAfter": 45
  }
}
```

**Solution:**
```javascript
// Check Retry-After header
const retryAfter = response.headers.get('Retry-After');
await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
// Retry request
```

**Prevention:**
- Implement client-side rate limiting
- Use exponential backoff
- Consider upgrading subscription tier

---

### ERR_4002: Quota Exceeded

**Error:**
```json
{
  "success": false,
  "error": "Daily generation quota exceeded",
  "code": "ERR_4002",
  "details": {
    "remaining": 0,
    "resetAt": "2024-01-02T00:00:00Z",
    "upgradeUrl": "/pricing"
  }
}
```

**Solution:**
- Wait until quota resets (next day)
- Upgrade subscription for higher limits

---

## Server Errors

### ERR_5001: Internal Server Error

**Error:**
```json
{
  "success": false,
  "error": "An unexpected error occurred",
  "code": "ERR_5001",
  "correlationId": "req_abc123"
}
```

**Solution:**
1. Note the `correlationId` for support
2. Retry after a brief delay
3. Contact support if persistent

**What to Include in Support Request:**
- Correlation ID
- Timestamp
- Request endpoint and method
- Request body (sanitized)

---

## Business Logic Errors

### ERR_6001: Subscription Required

**Error:**
```json
{
  "success": false,
  "error": "This feature requires a paid subscription",
  "code": "ERR_6001",
  "details": {
    "requiredTier": "family",
    "currentTier": "free",
    "upgradeUrl": "/pricing"
  }
}
```

**Solution:**
- Upgrade to the required subscription tier

---

### ERR_6002: Feature Not Available

**Error:**
```json
{
  "success": false,
  "error": "PDF generation is not available on your plan",
  "code": "ERR_6002",
  "details": {
    "feature": "pdf_generation",
    "availableOn": ["family", "premium"]
  }
}
```

**Solution:**
- Upgrade to a plan that includes the feature

---

## Debugging Tips

### 1. Check Correlation ID

Every response includes an `X-Correlation-ID` header. Use it to:
- Search logs for request details
- Reference in support requests

### 2. Validate Request Locally

```javascript
// Test request format before sending
const schema = {
  title: { type: 'string', required: true },
  characterId: { type: 'uuid', required: true },
  storyType: { type: 'enum', values: ['bedtime', 'adventure'], required: true }
};
```

### 3. Check API Status

```bash
# Health check
curl https://api.storytailor.dev/health

# Status page
# https://status.storytailor.com
```

### 4. Enable Debug Mode

```javascript
// Add debug parameter in development
fetch('/api/v1/stories?debug=true', { ... });
// Response includes additional debugging info
```

---

**Last Updated**: December 23, 2025

