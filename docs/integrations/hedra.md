Status: Draft  
Audience: Internal | Partner | Auditor  
Last-Updated: 2025-12-13  
Owner: Documentation Team  
Verified-Against-Code: Partially  
Doc-ID: AUTO  
Notes: Phase 7 - Hedra integration documentation with privacy statement

# Hedra Integration

## Overview

Hedra provides real-time avatar generation and interaction capabilities for Storytailor, enabling children to see and interact with Frankie (or their created character) during voice conversations on screened devices.

**SSM Parameter:** `/storytailor-production/hedra/api-key`
**Status:** ⚠️ Code complete, requires credentials

**Code References:**
- `HEDRA_AVATAR_INTEGRATION_STATUS.md:11-16` - Avatar Agent implementation
- `LIVE_AVATAR_INTEGRATION_STATUS.md:10-17` - Live avatar status
- `docs/user-journeys/video-live-avatar.md:702-757` - User journey

## Features

### Real-Time Avatar

**Hedra Realtime Avatar:**
- Real-time streaming (<800ms latency)
- Facial animation
- Voice synchronization (lip-sync)
- Emotion expression

**Code References:**
- `HEDRA_AVATAR_INTEGRATION_STATUS.md:39-55` - How it works
- `LIVE_AVATAR_INTEGRATION_STATUS.md:53-62` - Hedra integration details

### LiveKit Integration

**LiveKit Room Management:**
- Creates LiveKit rooms with Hedra avatar metadata
- Returns LiveKit room URL and access token
- Manages WebRTC connections

**Code References:**
- `HEDRA_AVATAR_INTEGRATION_STATUS.md:51-54` - LiveKit room creation
- `HEDRA_LIVEKIT_FINAL_STATUS.md:1-69` - LiveKit integration status

## Configuration

### Required Credentials

**SSM Parameters (Missing):**
- `/storytailor-production/hedra/api-key` - Hedra API key
- `/storytailor-production/livekit/url` - LiveKit WebSocket URL
- `/storytailor-production/livekit/api-key` - LiveKit API key
- `/storytailor-production/livekit/api-secret` - LiveKit API secret

**Code References:**
- `HEDRA_AVATAR_INTEGRATION_STATUS.md:29-37` - Missing credentials

## TAG: PRIVACY

### Child-Identifying Data Flow

**Data Sent to Hedra:**
- **Avatar Configuration**: Sent (character appearance, voice ID)
- **Session Metadata**: Sent (session ID, room ID)
- **User ID**: Not sent (only session identifiers)
- **Age Information**: Not sent
- **Email/Name**: Not sent
- **Story Content**: Not sent (avatar speaks via LiveKit, not Hedra directly)

**Data Protection Measures:**
1. **No PII Transmission**: No child-identifying data sent to Hedra API
2. **Session-Based Identifiers**: Only session IDs used, not user IDs
3. **Encrypted Transmission**: All API calls use HTTPS/TLS encryption
4. **API Key Security**: Hedra API keys stored encrypted in AWS SSM Parameter Store
5. **Purpose Limitation**: Only avatar configuration sent (no user data)

**Code References:**
- `HEDRA_AVATAR_INTEGRATION_STATUS.md:41-55` - Avatar flow
- `LIVE_AVATAR_INTEGRATION_STATUS.md:40-51` - Flow for screened experiences

**Compliance Status:**
- ✅ **COPPA Compliant**: No child-identifying data sent to Hedra
- ✅ **GDPR Compliant**: Data minimization, purpose limitation, secure transmission

**Privacy Risk Assessment:**
- **Risk Level**: Low
- **Mitigation**: No PII transmission, session-based identifiers, encrypted transmission
- **Parental Consent**: Not required (no child-identifying data sent)

## Related Documentation

- **Avatar Agent:** See `docs/agents/avatar-agent.md`
- **User Journeys:** See [Video with Live Avatar Journey](../user-journeys/video-live-avatar.md)
