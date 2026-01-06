Status: Draft  
Audience: Internal | Partner | Auditor  
Last-Updated: 2025-12-13  
Owner: Documentation Team  
Verified-Against-Code: Partially  
Doc-ID: AUTO  
Notes: Phase 7 - LiveKit integration documentation with privacy statement

# LiveKit Integration

## Overview

LiveKit provides real-time video and audio streaming capabilities for Storytailor, enabling live avatar interactions and real-time conversation streaming.

**SSM Parameters:** `/storytailor-production/livekit/url`, `/storytailor-production/livekit/api-key`, `/storytailor-production/livekit/api-secret`
**Status:** ⚠️ Code complete, requires credentials

**Code References:**
- `HEDRA_AVATAR_INTEGRATION_STATUS.md:51-54` - LiveKit room creation
- `HEDRA_LIVEKIT_FINAL_STATUS.md:1-69` - LiveKit integration status
- `docs/user-journeys/video-live-avatar.md:702-757` - User journey

## Features

### Real-Time Streaming

**WebRTC Connections:**
- Real-time video streaming
- Real-time audio streaming
- Low latency (<800ms)

**Code References:**
- `HEDRA_AVATAR_INTEGRATION_STATUS.md:39-55` - Real-time streaming
- `LIVE_AVATAR_INTEGRATION_STATUS.md:40-51` - Flow for screened experiences

### Room Management

**LiveKit Rooms:**
- Room creation with metadata
- Access token generation
- Room lifecycle management

**Code References:**
- `HEDRA_AVATAR_INTEGRATION_STATUS.md:51-54` - Room creation
- `HEDRA_LIVEKIT_FINAL_STATUS.md:10-18` - LiveKit service implementation

## Configuration

### Required Credentials

**SSM Parameters (Missing):**
- `/storytailor-production/livekit/url` - LiveKit WebSocket URL
- `/storytailor-production/livekit/api-key` - LiveKit API key
- `/storytailor-production/livekit/api-secret` - LiveKit API secret

**Code References:**
- `HEDRA_AVATAR_INTEGRATION_STATUS.md:29-37` - Missing credentials

## TAG: PRIVACY

### Child-Identifying Data Flow

**Data Sent to LiveKit:**
- **Room Metadata**: Sent (hedra_avatar_id, voice_id)
- **Session Identifiers**: Sent (session ID, room ID)
- **Audio/Video Streams**: Sent (real-time audio/video from child)
- **User ID**: Not sent (only session identifiers)
- **Age Information**: Not sent
- **Email/Name**: Not sent
- **Story Content**: Not sent (content sent via separate API)

**Data Protection Measures:**
1. **No PII in Metadata**: User IDs, emails, and other PII are not included in room metadata
2. **Session-Based Identifiers**: Only session IDs used, not user IDs
3. **Encrypted Streaming**: All WebRTC streams use DTLS/SRTP encryption
4. **API Key Security**: LiveKit API keys stored encrypted in AWS SSM Parameter Store
5. **Temporary Rooms**: Rooms created per session, deleted after session ends
6. **Access Control**: Access tokens scoped to specific rooms and sessions

**Code References:**
- `HEDRA_AVATAR_INTEGRATION_STATUS.md:51-54` - Room creation
- `HEDRA_LIVEKIT_FINAL_STATUS.md:10-18` - LiveKit service

**Compliance Status:**
- ⚠️ **COPPA Considerations**: Real-time audio/video streams sent to LiveKit (necessary for service functionality)
- ✅ **GDPR Compliant**: Encrypted streaming, temporary rooms, access control
- ✅ **Encryption**: All streams encrypted with DTLS/SRTP

**Privacy Risk Assessment:**
- **Risk Level**: Medium
- **Mitigation**: Encrypted streaming, session-based identifiers, temporary rooms, access control
- **Parental Consent**: Required for children under 13 before live avatar sessions

## Related Documentation

- **Avatar Agent:** See `docs/agents/avatar-agent.md`
- **User Journeys:** See [Video with Live Avatar Journey](../user-journeys/video-live-avatar.md)
