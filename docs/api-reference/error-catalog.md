# REST API Error Catalog

**Last Updated:** December 2025  
**Audience:** Developers, Support, QA  
**Purpose:** Complete reference of all error codes with recovery steps

## Overview

This document provides comprehensive error documentation for the Storytailor REST API. Each error includes:
- What it means
- Common causes
- How to fix it
- Example error response
- Related errors and documentation

**Error Code Source:** `packages/api-contract/src/index.ts`

---

## Error Response Format

All API errors follow this consistent format:

```json
{
  "success": false,
  "error": "Error Type",
  "message": "Human-readable error description",
  "code": "ERROR_CODE",
  "timestamp": "2025-01-15T10:30:00Z",
  "details": {
    "field": "Additional context or validation details"
  }
}
```

---

## Authentication Errors

### AUTH_001: Invalid Token

**HTTP Status:** 401 Unauthorized

**What it means:** The authentication token provided is not valid or has been revoked.

**Common causes:**
- Token expired (tokens expire after 1 hour)
- Token was manually revoked
- Token format is incorrect
- Using wrong environment's token (staging vs. production)
- Token signature invalid

**How to fix:**
1. Check token format (should be JWT: `eyJhbGc...`)
2. Refresh token using `POST /v1/auth/refresh`
3. Re-authenticate if refresh fails: `POST /v1/auth/login`
4. Verify using correct base URL for environment
5. Check token hasn't been revoked

**Example error response:**
```json
{
  "success": false,
  "error": "Authentication Failed",
  "message": "The provided authentication token is invalid",
  "code": "AUTH_001",
  "timestamp": "2025-01-15T10:30:00Z"
}
```

**Recovery flow:**
```
1. Catch 401 error
2. Attempt token refresh (POST /v1/auth/refresh)
3. If refresh succeeds: Retry original request
4. If refresh fails: Redirect to login
5. User re-authenticates
6. Store new tokens
7. Retry original request
```

**See also:**
- AUTH_002 (Token Expired)
- User Journey: [Login Flow](../user-journeys/product/registration-and-auth.md#journey-5-login-existing-user)
- Troubleshooting: [Authentication Issues](./troubleshooting.md#authentication-issues)

---

### AUTH_002: Token Expired

**HTTP Status:** 401 Unauthorized

**What it means:** The authentication token has expired and can no longer be used.

**Common causes:**
- Token lifetime exceeded (default: 1 hour for access tokens)
- Server-side token invalidation
- System clock skew (rare)

**How to fix:**
1. Use refresh token: `POST /v1/auth/refresh` with refresh token
2. Refresh tokens last 7 days
3. If refresh token also expired: Re-authenticate
4. Implement automatic refresh before expiration

**Example error response:**
```json
{
  "success": false,
  "error": "Token Expired",
  "message": "Your authentication token has expired. Please refresh or log in again.",
  "code": "AUTH_002",
  "timestamp": "2025-01-15T10:30:00Z",
  "details": {
    "expiredAt": "2025-01-15T09:30:00Z"
  }
}
```

**Best practice - Proactive refresh:**
```javascript
// Check token expiration before making request
const token = parseJWT(accessToken);
const expiresIn = token.exp * 1000 - Date.now();

if (expiresIn < 5 * 60 * 1000) {  // Less than 5 minutes left
  // Proactively refresh
  accessToken = await refreshToken(refreshToken);
}

// Now make request with fresh token
```

**See also:**
- AUTH_001 (Invalid Token)
- API Documentation: [Token Refresh](./01-developer-api-documentation.md#token-refresh)

---

### AUTH_003: Insufficient Permissions

**HTTP Status:** 403 Forbidden

**What it means:** User is authenticated but doesn't have permission for this action.

**Common causes:**
- User role doesn't include required permission
- Library permission level too low (Viewer trying to edit)
- Parent trying to access non-child account
- COPPA-protected child without parent consent

**How to fix:**
1. Check user's role/permissions for the resource
2. Request permission upgrade from library owner
3. Verify parent-child relationship for child accounts
4. Check COPPA consent status for children under 13

**Example error response:**
```json
{
  "success": false,
  "error": "Insufficient Permissions",
  "message": "You do not have permission to perform this action",
  "code": "AUTH_003",
  "timestamp": "2025-01-15T10:30:00Z",
  "details": {
    "requiredPermission": "library:edit",
    "currentPermission": "library:view"
  }
}
```

**See also:**
- User Journey: [Permission Denied](../user-journeys/product/edge-cases.md#journey-4-permission-denied-scenario)
- User Journey: [Permission Levels](../user-journeys/product/library-and-sharing.md#permission-levels-explained)

---

## User Errors

### USER_001: User Not Found

**HTTP Status:** 404 Not Found

**What it means:** The requested user ID does not exist in the system.

**Common causes:**
- User ID typo or incorrect format
- User account was deleted
- Using wrong environment (staging vs. production)
- User ID from different system

**How to fix:**
1. Verify user ID format (should be UUID)
2. Check if user account still exists
3. Use correct environment
4. If user was deleted, create new account

**Example error response:**
```json
{
  "success": false,
  "error": "User Not Found",
  "message": "The specified user does not exist",
  "code": "USER_001",
  "timestamp": "2025-01-15T10:30:00Z",
  "details": {
    "userId": "invalid-uuid-here"
  }
}
```

---

### USER_002: Age Validation Error

**HTTP Status:** 400 Bad Request

**What it means:** Age value is invalid or out of acceptable range.

**Common causes:**
- Age below minimum (< 3)
- Age above maximum (> 120)
- Age not a number
- Negative age value

**How to fix:**
1. Validate age is between 3 and 120
2. Ensure age is integer (not decimal)
3. Handle edge case: User over 100 years old
4. Provide clear error message to user

**Example error response:**
```json
{
  "success": false,
  "error": "Validation Error",
  "message": "Age must be between 3 and 120 years",
  "code": "USER_002",
  "timestamp": "2025-01-15T10:30:00Z",
  "details": {
    "field": "age",
    "value": 150,
    "min": 3,
    "max": 120
  }
}
```

**See also:**
- User Journey: [Age Validation Error](../user-journeys/comprehensive-user-journeys.md#journey-11-age-validation-error)

---

### USER_003: Email Already Taken

**HTTP Status:** 400 Bad Request

**What it means:** An account with this email address already exists.

**Common causes:**
- User forgot they have an account
- User trying to create duplicate account
- Previous account not deleted

**How to fix:**
1. Direct user to login page
2. Offer password reset if user forgot password
3. If user wants separate account: Use different email
4. If previous account should be deleted: Contact support

**Example error response:**
```json
{
  "success": false,
  "error": "Email Already Registered",
  "message": "An account with this email already exists",
  "code": "USER_003",
  "timestamp": "2025-01-15T10:30:00Z",
  "details": {
    "email": "user@example.com",
    "suggestion": "Try logging in or use password reset"
  }
}
```

**See also:**
- User Journey: [Email Already Registered](../user-journeys/product/edge-cases.md#journey-9-email-already-registered)

---

## Story Errors

### STORY_001: Story Not Found

**HTTP Status:** 404 Not Found

**What it means:** The requested story ID does not exist or user doesn't have access.

**Common causes:**
- Story ID typo
- Story was deleted
- User doesn't have permission to view story
- Story in different library

**How to fix:**
1. Verify story ID is correct
2. Check if story still exists
3. Verify user has permission to access story's library
4. Check library permissions

**Example error response:**
```json
{
  "success": false,
  "error": "Story Not Found",
  "message": "The requested story does not exist or you do not have access",
  "code": "STORY_001",
  "timestamp": "2025-01-15T10:30:00Z",
  "details": {
    "storyId": "story-uuid-here"
  }
}
```

---

### STORY_002: Content Validation Failed

**HTTP Status:** 400 Bad Request

**What it means:** Story content failed safety or content validation checks.

**Common causes:**
- Content contains prohibited words or themes
- Content violates content policy
- Content inappropriate for age rating
- Excessive length or formatting issues

**How to fix:**
1. Review content policy
2. Adjust story prompt/content
3. Remove flagged content
4. Retry generation
5. Contact support if content seems appropriate

**Example error response:**
```json
{
  "success": false,
  "error": "Content Validation Failed",
  "message": "Story content did not pass safety checks",
  "code": "STORY_002",
  "timestamp": "2025-01-15T10:30:00Z",
  "details": {
    "reason": "inappropriate_theme",
    "ageRating": 8,
    "suggestion": "Try a different story theme"
  }
}
```

**See also:**
- Compliance: [Content Moderation](../compliance/child-safety.md#content-moderation)

---

### STORY_003: Story Creation Failed

**HTTP Status:** 500 Internal Server Error

**What it means:** Story generation process failed due to system error.

**Common causes:**
- OpenAI API timeout
- OpenAI API rate limit
- Content generation service unavailable
- Database write failure

**How to fix:**
1. Retry request (often works on second attempt)
2. Wait 30 seconds if rate limit hit
3. Check system status page
4. If persists after 3 attempts: Contact support
5. User's story parameters are saved for support investigation

**Example error response:**
```json
{
  "success": false,
  "error": "Story Creation Failed",
  "message": "We encountered an error creating your story. Please try again.",
  "code": "STORY_003",
  "timestamp": "2025-01-15T10:30:00Z",
  "details": {
    "retryable": true,
    "supportTicketId": "ticket-123"
  }
}
```

**See also:**
- User Journey: [Story Generation Failure](../user-journeys/product/edge-cases.md#journey-2-story-generation-failure)

---

## Character Errors

### CHAR_001: Character Not Found

**HTTP Status:** 404 Not Found

**What it means:** The requested character ID does not exist or user doesn't have access.

**Common causes:**
- Character ID typo
- Character was deleted
- Character in story user doesn't have access to
- Wrong library

**How to fix:**
1. Verify character ID
2. Check if character still exists
3. Verify story/library permissions
4. List characters in library to find correct ID

**Example error response:**
```json
{
  "success": false,
  "error": "Character Not Found",
  "message": "The requested character does not exist or you do not have access",
  "code": "CHAR_001",
  "timestamp": "2025-01-15T10:30:00Z",
  "details": {
    "characterId": "char-uuid-here"
  }
}
```

---

### CHAR_002: Character Creation Failed

**HTTP Status:** 500 Internal Server Error

**What it means:** Character generation process failed.

**Common causes:**
- AI generation service unavailable
- Invalid character traits
- Database error
- Duplicate character name validation failed

**How to fix:**
1. Retry with same parameters
2. Try different character name
3. Simplify character description
4. Check for duplicate names
5. If persists: Contact support

**Example error response:**
```json
{
  "success": false,
  "error": "Character Creation Failed",
  "message": "We encountered an error creating your character. Please try again.",
  "code": "CHAR_002",
  "timestamp": "2025-01-15T10:30:00Z",
  "details": {
    "retryable": true,
    "characterName": "Brave"
  }
}
```

**See also:**
- User Journey: [Duplicate Character](../user-journeys/product/edge-cases.md#journey-8-character-already-exists-duplicate)

---

## Conversation Errors

### CONV_001: Conversation Not Found

**HTTP Status:** 404 Not Found

**What it means:** The requested conversation session does not exist.

**Common causes:**
- Conversation ID incorrect
- Conversation expired (sessions expire after 24 hours)
- Conversation was ended
- Wrong user trying to access conversation

**How to fix:**
1. Start new conversation: `POST /v1/conversation/start`
2. Verify conversation ID is correct
3. Check if conversation has expired
4. Ensure user owns the conversation

**Example error response:**
```json
{
  "success": false,
  "error": "Conversation Not Found",
  "message": "The requested conversation session does not exist or has expired",
  "code": "CONV_001",
  "timestamp": "2025-01-15T10:30:00Z",
  "details": {
    "conversationId": "conv-uuid-here",
    "expiresAfter": "24 hours"
  }
}
```

---

### CONV_002: Conversation Ended

**HTTP Status:** 400 Bad Request

**What it means:** The conversation has been explicitly ended and cannot accept new messages.

**Common causes:**
- User or system ended conversation
- Story was finalized
- Session intentionally closed

**How to fix:**
1. Start new conversation if continuing
2. Review conversation history if needed
3. Cannot resume ended conversation

**Example error response:**
```json
{
  "success": false,
  "error": "Conversation Ended",
  "message": "This conversation has ended. Start a new conversation to continue.",
  "code": "CONV_002",
  "timestamp": "2025-01-15T10:30:00Z",
  "details": {
    "conversationId": "conv-uuid-here",
    "endedAt": "2025-01-15T09:00:00Z"
  }
}
```

---

### CONV_003: Message Processing Failed

**HTTP Status:** 500 Internal Server Error

**What it means:** Failed to process user's message.

**Common causes:**
- AI service timeout
- Message content validation failed
- Agent unavailable
- System error

**How to fix:**
1. Retry same message
2. Rephrase message if content issue
3. Check system status
4. If persists: End conversation and start new one

**Example error response:**
```json
{
  "success": false,
  "error": "Message Processing Failed",
  "message": "We couldn't process your message. Please try again.",
  "code": "CONV_003",
  "timestamp": "2025-01-15T10:30:00Z",
  "details": {
    "retryable": true,
    "conversationId": "conv-uuid-here"
  }
}
```

---

## Multi-Agent Errors

### AGENT_001: Agent Unavailable

**HTTP Status:** 503 Service Unavailable

**What it means:** The required agent service is temporarily unavailable.

**Common causes:**
- Agent deployment in progress
- Agent crashed or restarting
- High load causing unavailability
- Circuit breaker open (too many failures)

**How to fix:**
1. Wait 30-60 seconds and retry
2. System will use fallback agent if available
3. Check status page for planned maintenance
4. If urgent: Contact support

**Example error response:**
```json
{
  "success": false,
  "error": "Agent Unavailable",
  "message": "The content generation service is temporarily unavailable. Please try again in a moment.",
  "code": "AGENT_001",
  "timestamp": "2025-01-15T10:30:00Z",
  "details": {
    "agent": "content-agent",
    "retryAfter": 60,
    "fallbackAvailable": true
  }
}
```

**See also:**
- AGENT_002 (Circuit Breaker Open)
- Technical: [Circuit Breaker](../development/01-multi-agent-orchestration-flow.md#circuit-breaker)

---

### AGENT_002: Circuit Breaker Open

**HTTP Status:** 503 Service Unavailable

**What it means:** Circuit breaker is open due to high failure rate from agent.

**Common causes:**
- Agent experiencing high failure rate (> 50%)
- Upstream service (OpenAI) having issues
- Database connection problems
- System protecting against cascading failures

**How to fix:**
1. Wait for circuit breaker to close (typically 30-60 seconds)
2. System will attempt automatic recovery
3. Fallback processing may be used
4. Check status page
5. If persists > 5 minutes: Contact support

**Example error response:**
```json
{
  "success": false,
  "error": "Circuit Breaker Open",
  "message": "This service is temporarily unavailable due to high error rate. We're working on it.",
  "code": "AGENT_002",
  "timestamp": "2025-01-15T10:30:00Z",
  "details": {
    "agent": "content-agent",
    "circuitState": "open",
    "retryAfter": 60,
    "willHealAt": "2025-01-15T10:31:00Z"
  }
}
```

**See also:**
- User Journey: [Circuit Breaker](../user-journeys/comprehensive-user-journeys.md#journey-12-agent-circuit-breaker-open)

---

### AGENT_003: Delegation Failed

**HTTP Status:** 500 Internal Server Error

**What it means:** Router failed to delegate request to appropriate agent.

**Common causes:**
- Agent selection logic error
- No agent available for intent
- Agent communication failure
- System misconfiguration

**How to fix:**
1. Retry request
2. Rephrase request if intent unclear
3. If persists: Likely system issue, contact support
4. Check if requesting unsupported feature

**Example error response:**
```json
{
  "success": false,
  "error": "Delegation Failed",
  "message": "We couldn't route your request to the appropriate service. Please try again.",
  "code": "AGENT_003",
  "timestamp": "2025-01-15T10:30:00Z",
  "details": {
    "intent": "unclear",
    "retryable": true
  }
}
```

---

## Knowledge Base Errors

### KB_001: Knowledge Query Failed

**HTTP Status:** 500 Internal Server Error

**What it means:** Knowledge base query processing failed.

**Common causes:**
- Knowledge base service unavailable
- Query too complex
- Database connection issue

**How to fix:**
1. Retry query
2. Simplify query
3. If persists: Use alternative documentation

**Example error response:**
```json
{
  "success": false,
  "error": "Knowledge Query Failed",
  "message": "We couldn't process your question. Please try rephrasing.",
  "code": "KB_001",
  "timestamp": "2025-01-15T10:30:00Z"
}
```

---

### KB_002: Knowledge Source Unavailable

**HTTP Status:** 503 Service Unavailable

**What it means:** Knowledge base data source is temporarily unavailable.

**How to fix:**
1. Wait and retry
2. Use alternative documentation
3. Contact support if urgent

---

## System Errors

### SYS_001: Internal Server Error

**HTTP Status:** 500 Internal Server Error

**What it means:** Unexpected system error occurred.

**Common causes:**
- Unhandled exception
- Database connection failure
- External service failure
- System bug

**How to fix:**
1. Retry request once
2. If persists: Likely needs engineering fix
3. Contact support with request details
4. Include timestamp and any error IDs

**Example error response:**
```json
{
  "success": false,
  "error": "Internal Server Error",
  "message": "An unexpected error occurred. Our team has been notified.",
  "code": "SYS_001",
  "timestamp": "2025-01-15T10:30:00Z",
  "details": {
    "errorId": "error-uuid-for-tracking",
    "retryable": true
  }
}
```

---

### SYS_002: Service Unavailable

**HTTP Status:** 503 Service Unavailable

**What it means:** Service is temporarily unavailable (maintenance, overload, etc.).

**Common causes:**
- Planned maintenance
- System overload
- Database maintenance
- Deployment in progress

**How to fix:**
1. Check status page
2. Wait and retry with exponential backoff
3. If planned maintenance: Wait until complete
4. If emergency: Subscribe to status updates

**Example error response:**
```json
{
  "success": false,
  "error": "Service Unavailable",
  "message": "The service is temporarily unavailable. Please try again shortly.",
  "code": "SYS_002",
  "timestamp": "2025-01-15T10:30:00Z",
  "details": {
    "retryAfter": 300,
    "maintenanceWindow": "2025-01-15T10:00:00Z to 2025-01-15T11:00:00Z"
  }
}
```

---

### SYS_003: Rate Limit Exceeded

**HTTP Status:** 429 Too Many Requests

**What it means:** Too many requests sent in given time frame.

**Common causes:**
- Burst of requests exceeding limit
- No rate limiting in client code
- Retry loop without backoff
- Shared API key with high usage

**How to fix:**
1. Implement exponential backoff
2. Check rate limit headers in response
3. Cache responses when possible
4. Distribute requests over time
5. Upgrade plan if needed

**Example error response:**
```json
{
  "success": false,
  "error": "Rate Limit Exceeded",
  "message": "Too many requests. Please slow down and try again.",
  "code": "SYS_003",
  "timestamp": "2025-01-15T10:30:00Z",
  "details": {
    "limit": 100,
    "remaining": 0,
    "resetAt": "2025-01-15T10:31:00Z"
  }
}
```

**Rate limit headers:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1705318260
Retry-After: 60
```

**Recommended backoff strategy:**
```javascript
async function retryWithBackoff(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (error.code === 'SYS_003' && i < maxRetries - 1) {
        const delay = Math.min(1000 * Math.pow(2, i), 30000);  // Max 30s
        await sleep(delay);
        continue;
      }
      throw error;
    }
  }
}
```

**See also:**
- API Documentation: [Rate Limits](./01-developer-api-documentation.md#rate-limits)

---

## COPPA-Specific Errors

### PARENT_EMAIL_REQUIRED

**HTTP Status:** 400 Bad Request

**What it means:** Child under 13 requires parent email for registration.

**Common causes:**
- Age < 13 and parent email not provided
- Database constraint enforcement
- COPPA compliance requirement

**How to fix:**
1. Collect parent email from user
2. Include `parentEmail` field in registration
3. Ensure parent email is valid format

**Example error response:**
```json
{
  "success": false,
  "error": "Parent Email Required",
  "message": "Children under 13 require parent email for COPPA compliance",
  "code": "PARENT_EMAIL_REQUIRED",
  "timestamp": "2025-01-15T10:30:00Z",
  "details": {
    "age": 10,
    "coppaThreshold": 13,
    "requiredField": "parentEmail"
  }
}
```

**See also:**
- User Journey: [Registration Blocked](../user-journeys/product/registration-and-auth.md#journey-2-child-under-13-registration-blocked)
- Compliance: [COPPA Requirements](../compliance/coppa.md)

---

### PARENT_CONSENT_REQUIRED

**HTTP Status:** 403 Forbidden

**What it means:** Action requires parental consent which hasn't been verified yet.

**Common causes:**
- Child under 13 without verified consent
- Consent pending
- Consent expired
- Consent revoked

**How to fix:**
1. Check consent status: `GET /v1/consent/status`
2. If pending: Wait for parent approval
3. If expired: Re-request consent
4. If revoked: Parent must re-approve

**Example error response:**
```json
{
  "success": false,
  "error": "Parent Consent Required",
  "message": "This action requires verified parental consent",
  "code": "PARENT_CONSENT_REQUIRED",
  "timestamp": "2025-01-15T10:30:00Z",
  "details": {
    "consentStatus": "pending",
    "userId": "user-uuid"
  }
}
```

**See also:**
- User Journey: [Consent Verification](../user-journeys/product/registration-and-auth.md#journey-8-parent-consent-verification)
- API: [Consent Endpoints](./01-developer-api-documentation.md#consent-management)

---

## Error Recovery Patterns

### Pattern 1: Retry with Exponential Backoff
**For:** Transient errors (AGENT_001, STORY_003, SYS_001, SYS_002)

```javascript
async function retryWithBackoff(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (error.retryable && i < maxRetries - 1) {
        const delay = Math.min(1000 * Math.pow(2, i), 30000);
        await sleep(delay);
        continue;
      }
      throw error;
    }
  }
}
```

### Pattern 2: Token Refresh on 401
**For:** AUTH_001, AUTH_002

```javascript
async function requestWithAuth(url, options) {
  try {
    return await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${accessToken}`
      }
    });
  } catch (error) {
    if (error.status === 401) {
      // Refresh token
      accessToken = await refreshAccessToken(refreshToken);
      // Retry with new token
      return await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          Authorization: `Bearer ${accessToken}`
        }
      });
    }
    throw error;
  }
}
```

### Pattern 3: Graceful Degradation
**For:** AGENT_002, KB_002

```javascript
async function createStoryWithFallback(params) {
  try {
    return await contentAgent.generateStory(params);
  } catch (error) {
    if (error.code === 'AGENT_002') {
      // Use simplified fallback
      return await simplifiedStoryGenerator(params);
    }
    throw error;
  }
}
```

---

## Error Monitoring

### Important Error Metrics

Track these error rates:
- **Auth errors (AUTH_*):** Should be < 1% of requests
- **Not found errors (STORY_001, CHAR_001, etc.):** Indicates UX or data issues
- **System errors (SYS_*):** Should be < 0.1% of requests
- **Rate limits (SYS_003):** Indicates need for rate limit increase

### When to Alert Support

Immediate escalation:
- COPPA-related errors affecting children
- Safety/crisis detection errors
- Account suspension issues
- Data deletion/export failures

Standard support ticket:
- Persistent story generation failures
- Permission issues
- Account access problems

---

## Related Documentation

- **User Journeys:** [Journey Index](../user-journeys/INDEX.md) - Complete journey map
- **Troubleshooting:** [REST API Troubleshooting](./troubleshooting.md) - Common issues and solutions
- **API Reference:** [Developer Documentation](./01-developer-api-documentation.md) - Complete API docs
- **A2A Errors:** [A2A Error Reference](../platform/a2a/api-reference.md#error-codes) - Partner integration errors
- **MCP Errors:** [MCP Error Reference](../platform/mcp/error-reference.md) - AI assistant integration errors

---

**Storytailor Inc.**  
API Documentation
