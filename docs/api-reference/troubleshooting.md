# REST API Troubleshooting Guide

**Last Updated:** December 2025  
**Audience:** Developers, Support, DevOps  
**Purpose:** Common issues and solutions for REST API integration

## Overview

This guide helps you diagnose and fix common issues when integrating with the Storytailor REST API. Each issue includes symptoms, diagnosis steps, and solutions.

---

## Authentication Issues

### Issue: "401 Unauthorized" on Every Request

**Symptoms:**
- All API requests return 401
- Error: "AUTH_001: Invalid Token"
- Recently worked, now broken

**Diagnosis:**
1. Check token format: Should start with `eyJhbGc...`
2. Check Authorization header: Should be `Bearer <token>` (note the space)
3. Check token expiration: Tokens expire after 1 hour
4. Verify environment: Using correct base URL?

**Solutions:**
- Missing "Bearer" prefix:
  ```javascript
  // Wrong
  headers: { Authorization: token }
  
  // Correct
  headers: { Authorization: `Bearer ${token}` }
  ```

- Token expired:
  ```javascript
  // Refresh token
  const response = await fetch('/v1/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken })
  });
  const { accessToken } = await response.json();
  ```

- Wrong environment:
  ```javascript
  // Verify you're using correct URL
  const baseUrl = process.env.NODE_ENV === 'production'
    ? 'https://api.storytailor.dev'
    : 'https://staging-api.storytailor.dev';
  ```

**See also:**
- [Error Catalog: AUTH_001](./error-catalog.md#auth_001-invalid-token)
- [Error Catalog: AUTH_002](./error-catalog.md#auth_002-token-expired)

---

### Issue: Token Keeps Expiring Too Quickly

**Symptoms:**
- Tokens expire faster than expected
- Need to refresh frequently
- Users getting logged out

**Diagnosis:**
1. Check token lifetime in response
2. Verify server time vs. client time
3. Check if multiple devices/sessions

**Solutions:**
- Implement proactive refresh (before expiration):
  ```javascript
  // Refresh 5 minutes before expiration
  const tokenData = parseJWT(accessToken);
  const expiresIn = (tokenData.exp * 1000) - Date.now();
  
  if (expiresIn < 5 * 60 * 1000) {
    accessToken = await refreshToken();
  }
  ```

- Use refresh token properly:
  ```javascript
  // Refresh tokens last 7 days
  // Store securely and use to get new access tokens
  ```

---

## Story Generation Issues

### Issue: Story Generation Takes Too Long

**Symptoms:**
- Story generation exceeds 30 seconds
- Timeout errors
- Users complaining about wait time

**Diagnosis:**
1. Check story parameters (length, complexity)
2. Monitor OpenAI API response time
3. Check if hitting rate limits
4. Verify network latency

**Solutions:**
- Use async generation with callbacks:
  ```javascript
  // Instead of waiting for completion
  const { storyId } = await POST('/v1/stories/generate', {
    prompt,
    async: true,
    webhookUrl: 'https://yourapp.com/webhooks/story-complete'
  });
  
  // Webhook receives completion notification
  ```

- Implement progress polling:
  ```javascript
  const { storyId } = await POST('/v1/stories/generate', { ...params });
  
  // Poll for completion
  const story = await pollUntilComplete(storyId, {
    interval: 2000,  // Check every 2 seconds
    timeout: 60000   // Give up after 1 minute
  });
  ```

- Set appropriate timeout:
  ```javascript
  fetch(url, {
    ...options,
    signal: AbortSignal.timeout(60000)  // 60 second timeout
  });
  ```

---

### Issue: Story Content Not Age-Appropriate

**Symptoms:**
- Generated story too complex or too simple
- Vocabulary not matching child's age
- Parents complaining about content level

**Diagnosis:**
1. Check age parameter in request
2. Verify age is correctly set in user profile
3. Review story generation parameters

**Solutions:**
- Explicitly set age in story request:
  ```json
  {
    "prompt": "Adventure story",
    "ageRating": 8,
    "userId": "user-id"
  }
  ```

- User profile age should be accurate
- System uses age to determine:
  - Vocabulary complexity
  - Sentence length
  - Theme appropriateness
  - Story length

---

## Permission and Access Issues

### Issue: "403 Forbidden" When Accessing Story

**Symptoms:**
- Can create stories but can't access them
- Error: "AUTH_003: Insufficient Permissions"
- User should have access but doesn't

**Diagnosis:**
1. Check library ownership
2. Verify permission level (Owner, Admin, Editor, Viewer)
3. Check Row Level Security (RLS) policies
4. Verify user is authenticated as correct user

**Solutions:**
- Check library permissions:
  ```javascript
  const permissions = await GET('/v1/libraries/{id}/permissions');
  // Verify user has appropriate role
  ```

- Ensure user authenticated:
  ```javascript
  // User must be authenticated as themselves
  // Cannot access another user's data unless explicitly shared
  ```

- Request permission from library owner:
  ```javascript
  // Library owner must grant permission
  await POST('/v1/libraries/{id}/permissions', {
    userId: 'user-to-grant',
    role: 'Viewer'  // or Editor, Admin
  });
  ```

**See also:**
- User Journey: [Permission Denied](../user-journeys/product/edge-cases.md#journey-4-permission-denied-scenario)
- User Journey: [Permission Levels](../user-journeys/product/library-and-sharing.md#permission-levels-explained)

---

## COPPA Compliance Issues

### Issue: Child Registration Failing

**Symptoms:**
- Error: "PARENT_EMAIL_REQUIRED"
- Cannot register child under 13
- Registration form validation failing

**Diagnosis:**
1. Check if age < 13
2. Verify parentEmail field is included
3. Check parentEmail format (valid email)

**Solutions:**
- Include parent email for children:
  ```json
  {
    "email": "child@example.com",
    "password": "secure-password",
    "firstName": "Emma",
    "lastName": "Smith",
    "age": 8,
    "userType": "child",
    "parentEmail": "parent@example.com"  // Required for age < 13
  }
  ```

- Conditional form validation:
  ```javascript
  if (age < 13) {
    // Require parent email
    if (!parentEmail) {
      showError("Parent email required for children under 13");
      disableSubmit();
    }
  }
  ```

**See also:**
- User Journey: [Registration Blocked](../user-journeys/product/registration-and-auth.md#journey-2-child-under-13-registration-blocked)
- Compliance: [COPPA Requirements](../compliance/coppa.md#age-threshold-protection)

---

### Issue: "PARENT_CONSENT_REQUIRED" After Registration

**Symptoms:**
- Child registered successfully
- Cannot access features
- Error when trying to create stories

**Diagnosis:**
1. Check consent status: `GET /v1/consent/status`
2. Verify parent received consent email
3. Check if consent expired (7 days)

**Solutions:**
- This is expected behavior:
  - Child under 13 can register
  - But cannot use service until parent approves
  - Parent must click approval link in email

- Check consent status:
  ```javascript
  const { status } = await GET('/v1/consent/status');
  // status: 'none', 'pending', 'verified', 'revoked'
  
  if (status === 'pending') {
    showMessage("Waiting for parent approval. Check with your parent!");
  }
  ```

- If consent expired:
  ```javascript
  // Re-request consent
  await POST('/v1/consent/request', {
    parentEmail: user.parentEmail,
    childAge: user.age
  });
  ```

**See also:**
- User Journey: [Consent Verification](../user-journeys/product/registration-and-auth.md#journey-8-parent-consent-verification)
- User Journey: [Consent Expiration](../user-journeys/product/edge-cases.md#journey-5-consent-expiration)

---

## Rate Limiting Issues

### Issue: "429 Too Many Requests"

**Symptoms:**
- Requests suddenly failing
- Error: "SYS_003: Rate Limit Exceeded"
- Working fine, then sudden failures

**Diagnosis:**
1. Check rate limit headers in response
2. Count requests in time window
3. Check if retry loop without backoff
4. Verify not sharing API key with high usage

**Solutions:**
- Implement exponential backoff:
  ```javascript
  async function retryWithBackoff(fn, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        if (error.status === 429 && i < maxRetries - 1) {
          const retryAfter = error.headers['Retry-After'] || Math.pow(2, i);
          await sleep(retryAfter * 1000);
          continue;
        }
        throw error;
      }
    }
  }
  ```

- Monitor rate limit headers:
  ```javascript
  const response = await fetch(url, options);
  const remaining = response.headers.get('X-RateLimit-Remaining');
  const reset = response.headers.get('X-RateLimit-Reset');
  
  if (remaining < 10) {
    console.warn(`Rate limit low: ${remaining} requests remaining`);
  }
  ```

- Cache responses when possible:
  ```javascript
  // Cache user data, stories, characters
  // Don't fetch on every request
  ```

**See also:**
- [Error Catalog: SYS_003](./error-catalog.md#sys_003-rate-limit-exceeded)
- [API Docs: Rate Limits](./01-developer-api-documentation.md#rate-limits)

---

## Data Issues

### Issue: Stories Not Appearing in Library

**Symptoms:**
- Story generated successfully
- But doesn't show in GET /v1/stories
- User says story is missing

**Diagnosis:**
1. Check story's library_id
2. Verify user has access to that library
3. Check if story is in different library
4. Verify Row Level Security (RLS) policies

**Solutions:**
- Check which library story was saved to:
  ```javascript
  const story = await GET(`/v1/stories/${storyId}`);
  console.log('Story library:', story.library_id);
  
  const libraries = await GET('/v1/libraries');
  console.log('User libraries:', libraries);
  // Story might be in library user doesn't have permission for
  ```

- List stories with library context:
  ```javascript
  const stories = await GET(`/v1/libraries/${libraryId}/stories`);
  // Filter to specific library
  ```

---

## Integration Issues

### Issue: CORS Errors in Browser

**Symptoms:**
- API works in Postman/curl
- Fails in browser with CORS error
- "Access-Control-Allow-Origin" error

**Diagnosis:**
1. Check if calling from browser (not server)
2. Verify origin is allowed
3. Check if credentials included

**Solutions:**
- API supports CORS for web applications
- Ensure proper headers:
  ```javascript
  fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    credentials: 'omit'  // Don't send cookies
  });
  ```

- For development, use proxy:
  ```javascript
  // In package.json or vite.config.js
  proxy: {
    '/api': {
      target: 'https://api.storytailor.dev',
      changeOrigin: true
    }
  }
  ```

---

### Issue: Webhook Not Receiving Events

**Symptoms:**
- Webhook registered successfully
- But no events received
- Stories generating but no notifications

**Diagnosis:**
1. Verify webhook URL is publicly accessible
2. Check webhook is active status
3. Verify events subscribed to
4. Check webhook endpoint logs

**Solutions:**
- Ensure URL is public:
  ```bash
  # Test from external server
  curl -X POST https://yourapp.com/webhooks/storytailor \
    -H "Content-Type: application/json" \
    -d '{"test": true}'
  ```

- Verify webhook configuration:
  ```javascript
  const webhooks = await GET('/v1/webhooks');
  console.log('Active webhooks:', webhooks);
  // Check status is 'active' and events are correct
  ```

- Check signature verification:
  ```javascript
  // Webhook handler should verify signature
  const signature = req.headers['x-storytailor-signature'];
  const isValid = verifyWebhookSignature(req.body, signature, secret);
  ```

---

## Common Integration Patterns

### Pattern 1: Handling Child Accounts

```javascript
async function registerUser(userData) {
  const { age, ...otherData } = userData;
  
  // For children under 13, require parent email
  if (age < 13 && !userData.parentEmail) {
    throw new Error('Parent email required for children under 13');
  }
  
  const response = await POST('/v1/auth/register', userData);
  
  if (response.user.isCoppaProtected) {
    // Child under 13 - show consent pending message
    showMessage('Account created! Parent approval needed before you can start.');
    return { ...response, needsConsent: true };
  }
  
  // Adult or approved child
  return response;
}
```

### Pattern 2: Robust Story Generation

```javascript
async function generateStoryWithRetry(params) {
  let attempts = 0;
  const maxAttempts = 3;
  
  while (attempts < maxAttempts) {
    try {
      const story = await POST('/v1/stories/generate', params);
      return story;
    } catch (error) {
      attempts++;
      
      if (error.code === 'STORY_003' && attempts < maxAttempts) {
        // Retryable error - wait and retry
        await sleep(Math.pow(2, attempts) * 1000);  // Exponential backoff
        continue;
      }
      
      // Non-retryable or max attempts reached
      throw error;
    }
  }
}
```

### Pattern 3: Permission-Aware UI

```javascript
async function loadStoryWithPermissions(storyId) {
  try {
    const story = await GET(`/v1/stories/${storyId}`);
    const permissions = await GET(`/v1/libraries/${story.library_id}/permissions`);
    
    // Show UI based on permissions
    const userPermission = permissions.find(p => p.userId === currentUser.id);
    
    return {
      story,
      canEdit: ['Owner', 'Admin', 'Editor'].includes(userPermission?.role),
      canDelete: ['Owner', 'Admin'].includes(userPermission?.role),
      canShare: ['Owner', 'Admin'].includes(userPermission?.role)
    };
  } catch (error) {
    if (error.code === 'AUTH_003') {
      // No permission - show view-only or access denied
      return { story: null, noAccess: true };
    }
    throw error;
  }
}
```

---

## Performance Issues

### Issue: Slow API Response Times

**Symptoms:**
- Requests taking > 5 seconds
- Intermittent timeouts
- Users reporting slowness

**Diagnosis:**
1. Check which endpoints are slow
2. Monitor response time distribution
3. Check payload sizes
4. Verify no N+1 query patterns

**Solutions:**
- Use pagination for lists:
  ```javascript
  // Instead of fetching all stories
  const stories = await GET('/v1/stories?limit=20&offset=0');
  ```

- Batch requests when possible:
  ```javascript
  // If API supports batch operations
  const results = await POST('/v1/batch', {
    operations: [
      { method: 'GET', path: '/v1/stories/1' },
      { method: 'GET', path: '/v1/stories/2' },
      { method: 'GET', path: '/v1/stories/3' }
    ]
  });
  ```

- Cache frequently accessed data:
  ```javascript
  // Cache user profile, libraries, etc.
  const cachedUser = cache.get(`user:${userId}`);
  if (!cachedUser) {
    cachedUser = await GET(`/v1/users/${userId}`);
    cache.set(`user:${userId}`, cachedUser, 300);  // 5 minutes
  }
  ```

---

## Debugging Checklist

### Before Contacting Support

1. **Check error code and message**
   - Record exact error code
   - Note timestamp
   - Save full error response

2. **Verify basics**
   - Using correct base URL?
   - Token not expired?
   - Request format correct?
   - Required fields included?

3. **Test with curl**
   ```bash
   curl -X POST https://api.storytailor.dev/v1/stories/generate \
     -H "Authorization: Bearer ${TOKEN}" \
     -H "Content-Type: application/json" \
     -d '{"prompt": "test story", "ageRating": 8}'
   ```

4. **Check system status**
   - Visit status page (if available)
   - Check for planned maintenance
   - Verify no known outages

5. **Review logs**
   - Application logs
   - Network logs
   - Error tracking system

### Information to Provide Support

When contacting support@storytailor.com, include:
- Error code and message
- Timestamp of error
- User ID (if applicable)
- Request details (endpoint, parameters)
- Expected vs. actual behavior
- Steps to reproduce
- Environment (staging vs. production)

---

## Testing Recommendations

### Integration Testing

Test these critical flows:
1. **Child registration flow**
   - Test age < 13 with parent email
   - Test age < 13 without parent email (should fail)
   - Test age >= 13 (no parent email needed)

2. **Story generation flow**
   - Test successful generation
   - Test generation failure and retry
   - Test timeout handling

3. **Permission flow**
   - Test owner can do everything
   - Test viewer cannot edit
   - Test permission denied handling

### Error Scenario Testing

Test error recovery:
- Token expiration during operation
- Network failure mid-request
- Rate limit exceeded
- Story generation failure
- Permission denied actions

---

## Related Documentation

- **Error Catalog:** [Complete Error Reference](./error-catalog.md) - All error codes with recovery steps
- **API Reference:** [Developer Documentation](./01-developer-api-documentation.md) - Complete API documentation
- **User Journeys:** [Journey Index](../user-journeys/INDEX.md) - User experience flows
- **A2A Troubleshooting:** [A2A Issues](../platform/a2a/troubleshooting.md) - Partner integration issues
- **MCP Troubleshooting:** [MCP Issues](../platform/mcp/troubleshooting.md) - AI assistant integration issues

---

**Storytailor Inc.**  
API Documentation
