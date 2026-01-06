Status: Draft  
Audience: Internal | Partner | Auditor  
Last-Updated: 2025-12-13  
Owner: Documentation Team  
Verified-Against-Code: Yes  
Doc-ID: AUTO  
Notes: Phase 7 - Redis integration documentation with privacy statement

# Redis Integration

## Overview

Redis provides state caching, rate limiting, and session management for Storytailor. It enables fast access to conversation state and reduces database load.

**SSM Parameter:** `/storytailor-{ENV}/redis/url`
**Status:** ✅ Active

**Code References:**
- `packages/universal-agent/src/api/RESTAPIGateway.ts:232-253` - Redis rate limiting
- `packages/router/src/services/ConversationStateManager.ts` - State management
- `docs/system/inventory.md:172-177` - Redis status

## Features

### State Caching

**Conversation States:**
- Session state storage
- Conversation history caching
- Fast state retrieval

**Code References:**
- `packages/router/src/services/ConversationStateManager.ts` - State management
- `supabase/migrations/20240101000000_initial_schema.sql:124-132` - Conversation states table

### Rate Limiting

**Rate Limiting:**
- API rate limiting
- Per-user rate limits
- IP-based rate limiting

**Code References:**
- `packages/universal-agent/src/api/RESTAPIGateway.ts:232-253` - Rate limiting
- `packages/universal-agent/src/api/RESTAPIGateway.ts:232-253` - Redis rate limiting implementation

**Code Location:** `packages/universal-agent/src/api/RESTAPIGateway.ts:232-253`

### Session Management

**Session Storage:**
- OAuth flow state
- WebSocket session state
- Temporary data storage

**Code References:**
- `packages/router/src/services/ConversationStateManager.ts` - Session management

## TAG: PRIVACY

### Child-Identifying Data Flow

**Data Stored in Redis:**
- **Session IDs**: Stored (temporary session identifiers)
- **Conversation State**: Stored (conversation history, temporary)
- **Rate Limit Counters**: Stored (API usage tracking, no PII)
- **OAuth State**: Stored (temporary OAuth flow state)
- **User IDs**: Stored (for state association, encrypted keys)
- **User Age**: Not stored
- **Email/Name**: Not stored
- **Story Content**: Stored temporarily (conversation context)

**Data Protection Measures:**
1. **Temporary Storage**: All Redis data is temporary with TTL (Time To Live)
2. **No PII in Keys**: Redis keys do not contain PII (use hashed identifiers)
3. **TTL Enforcement**: All keys have expiration times (default 1 hour)
4. **Encrypted Transmission**: Redis connections use SSL/TLS when available
5. **Access Control**: Redis access restricted to Lambda functions only
6. **Data Minimization**: Only necessary state data stored
7. **Automatic Expiration**: Conversation states expire after 24 hours

**Code References:**
- `packages/router/src/services/ConversationStateManager.ts` - State management
- `supabase/migrations/20240101000000_initial_schema.sql:129` - 24-hour TTL

**Compliance Status:**
- ✅ **COPPA Compliant**: Temporary storage, no PII in keys, automatic expiration
- ✅ **GDPR Compliant**: Data minimization, automatic expiration, secure transmission

**Privacy Risk Assessment:**
- **Risk Level**: Low
- **Mitigation**: Temporary storage, TTL enforcement, no PII in keys, encrypted transmission
- **Parental Consent**: Not required (temporary state only)

## Configuration

### SSM Parameters

**Required Parameter:**
- `/storytailor-{ENV}/redis/url` - Redis connection URL

**Code References:**
- [SSM Parameters Inventory](../system/ssm-parameters-inventory.md) - SSM parameter inventory

### Environment Variables

**Lambda Functions:**
- `REDIS_URL` - Redis connection URL (from SSM)

## Related Documentation

- **System Architecture:** See [System Architecture](../system/architecture.md)
- **Compliance:** See [Compliance Documentation](../compliance/README.md)
