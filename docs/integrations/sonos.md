Status: Draft  
Audience: Internal | Partner | Auditor  
Last-Updated: 2025-12-14  
Owner: Documentation Team  
Verified-Against-Code: No (Specification Phase)  
Doc-ID: AUTO  
Notes: Sonos spatial audio integration specification - ready for implementation

# Sonos Integration

## Overview

Storytailor integrates with Sonos premium audio systems to create immersive, spatial audio storytelling experiences. The integration enables three-stream audio orchestration (narration, sound effects, music) across multiple speakers, transforming a child's room into a fully immersive story environment.

**Package Location:** `packages/smart-home-agent/src/devices/SonosManager.ts` (to be implemented)  
**Deployment Status:** ⏳ Specification Phase (Ready for Implementation)

**Code References:**
- `docs/agents/smart-home-agent/sonos-spatial-audio-spec.md` - Complete spatial audio specification
- `docs/agents/smart-home-agent/sonos-manager-spec.md` - SonosManager implementation spec
- `lambda-deployments/content-agent/src/services/MultiSpeakerAudioService.ts` - Multi-speaker audio service

## Architecture

### Sonos Control API

**API Base URL:** `https://api.ws.sonos.com/control/api/v1`

**Authentication:** OAuth 2.0

**Key Endpoints:**
- `GET /households` - List user's Sonos households
- `GET /households/{householdId}/groups` - List speaker groups
- `POST /households/{householdId}/groups/{groupId}/playback/play` - Start playback
- `POST /households/{householdId}/groups/{groupId}/audioClip` - Play audio clip
- `POST /households/{householdId}/groups/{groupId}/groupVolume` - Set group volume

**Documentation:** https://developer.sonos.com/

### OAuth 2.0 Authentication

**Registration Requirements:**
1. Sonos Developer Account at https://developer.sonos.com/
2. OAuth application registration
3. Redirect URI configuration
4. Required scopes:
   - `playback-control`
   - `playback-control-all`
   - `household-control`

**OAuth Flow:**
1. User initiates Sonos connection
2. Redirect to Sonos OAuth authorization
3. User authorizes on Sonos website
4. Sonos redirects to callback URL with authorization code
5. Exchange code for access token and refresh token
6. Store encrypted tokens in Supabase
7. Use tokens for API calls

**Code Reference Pattern:**
- Similar to `packages/smart-home-agent/src/token/TokenManager.ts` (Hue token management)
- Extend `SmartHomeTokenManager` base class
- Use `TokenEncryptionService` for encryption

### Three-Stream Audio Orchestration

**Stream Separation:**
1. **Narration Stream** (Main Speaker)
   - Frankie's voice / story narration
   - Volume: 70-80%
   - Priority: High

2. **Sound Effects Stream** (Spatial Speakers)
   - Story-specific sound effects
   - Distributed across multiple speakers
   - Volume: 40-60%
   - Priority: Medium

3. **Music/Ambiance Stream** (Background Speakers)
   - Background music and ambient sounds
   - Very subtle, atmospheric
   - Volume: 15-25%
   - Priority: Low

**Code Reference:**
- `docs/agents/smart-home-agent/sonos-spatial-audio-spec.md` - Complete spatial audio specification

## Features

### Speaker Discovery

**Discovery Methods:**
- Sonos Control API household discovery
- Group enumeration
- Individual player identification

**Code Reference:**
- `docs/agents/smart-home-agent/sonos-manager-spec.md` - Discovery implementation

### Spatial Audio Positioning

**Position Mapping:**
- Left side of story → Left speakers
- Right side of story → Right speakers
- Behind character → Back speakers
- Character movement → Sound moves between speakers
- Environmental sounds → Distributed across all spatial speakers

**Code Reference:**
- `docs/agents/smart-home-agent/sonos-spatial-audio-spec.md` - Spatial positioning logic

### Hospital Room Optimization

**Single Speaker Mode:**
- Narration, sound effects, and music on single speaker
- Still immersive, just not multi-speaker

**Multi-Speaker Mode:**
- Full spatial audio experience
- Three-stream separation
- Positional sound effects

**Code Reference:**
- `docs/agents/smart-home-agent/sonos-spatial-audio-spec.md` - Hospital optimization

### Volume Control

**Volume Limits:**
- Maximum volume: 80% (configurable by parent)
- Hospital mode: 60% maximum
- Age-appropriate limits:
  - 3-5 years: Max 60%
  - 6-8 years: Max 70%
  - 9+ years: Max 80%

**Code Reference:**
- `docs/agents/smart-home-agent/sonos-spatial-audio-spec.md` - Volume limits and safety

## Token Management

### Token Storage

**Storage:**
- Encrypted tokens in Supabase `sonos_tokens` table
- Redis caching for performance
- Automatic token refresh

**Code Reference:**
- `packages/smart-home-agent/src/token/TokenManager.ts` - Token management pattern

### Token Encryption

**Encryption:**
- AES-256-GCM encryption for stored tokens
- Key rotation support
- Secure token retrieval

**Code Reference:**
- `packages/smart-home-agent/src/token/EncryptionService.ts` - Encryption service

## Privacy & Compliance

### IoT Privacy Controller

**Privacy Validation:**
- Device connection validation
- Consent checking
- Age appropriateness
- Data minimization
- Retention policy enforcement

**Code Reference:**
- `packages/smart-home-agent/src/privacy/IoTPrivacyController.ts` - Privacy controls

## TAG: PRIVACY

### Child-Identifying Data Flow

**Data Sent to Sonos:**
- **User ID**: Not sent (only device tokens)
- **Age Information**: Not sent
- **Child Profile Data**: Not sent
- **Story Content**: Not sent
- **Audio URLs**: Sent (for playback)
- **Volume Commands**: Sent (for control)
- **Device Tokens**: Stored encrypted in Supabase, not sent to Sonos

**Data Protection Measures:**
1. **Token Encryption**: All device tokens encrypted at rest (AES-256-GCM)
2. **No PII Transmission**: No child-identifying data sent to Sonos API
3. **Parental Consent Required**: Children under 13 require verified parent consent before device connection
4. **Age-Appropriate Restrictions**: COPPA-protected users have volume restrictions
5. **Data Minimization**: Only necessary audio control data sent
6. **Retention Policy**: Device tokens retained only while device is connected, deleted on disconnection
7. **RLS Protection**: Device tokens protected by Row Level Security policies

**Code References:**
- `packages/smart-home-agent/src/privacy/IoTPrivacyController.ts` - Privacy validation
- `docs/agents/smart-home-agent/sonos-spatial-audio-spec.md` - Privacy compliance

**Compliance Status:**
- ✅ **COPPA Compliant**: No child-identifying data sent to Sonos
- ✅ **GDPR Compliant**: Data minimization, consent management, retention policies
- ✅ **UK Children's Code Compliant**: Privacy by default, age-appropriate design

## Configuration

### SSM Parameters

**Required Parameters:**
- `/storytailor-{ENV}/sonos/client-id` - Sonos OAuth client ID
- `/storytailor-{ENV}/sonos/client-secret` - Sonos OAuth client secret
- `/storytailor-{ENV}/sonos/redirect-uri` - OAuth redirect URI

### Environment Variables

**Smart Home Agent Lambda:**
- `SONOS_CLIENT_ID` - Sonos OAuth client ID
- `SONOS_CLIENT_SECRET` - Sonos OAuth client secret
- `SONOS_REDIRECT_URI` - OAuth redirect URI

## API Methods

### Device Discovery

**Method:** `discoverDevices(userId: string)`

**Returns:** `SpeakerDevice[]` - List of discovered Sonos speakers

**Code Location:** `packages/smart-home-agent/src/devices/SonosManager.ts` (to be implemented)

### Speaker Grouping

**Method:** `createGroup(speakers: SpeakerDevice[], groupType: 'main' | 'spatial' | 'ambiance')`

**Returns:** `string` - Sonos group ID

**Code Location:** `packages/smart-home-agent/src/devices/SonosManager.ts` (to be implemented)

### Spatial Audio Playback

**Method:** `playSpatialAudio(groupId: string, audioTracks: { narration: string; soundEffects: SpatialSoundEffect[]; music?: string })`

**Code Location:** `packages/smart-home-agent/src/devices/SonosManager.ts` (to be implemented)

### Volume Control

**Method:** `setVolume(speakerId: string, volume: number)`

**Code Location:** `packages/smart-home-agent/src/devices/SonosManager.ts` (to be implemented)

## Related Documentation

- **Spatial Audio Specification:** See [Sonos Spatial Audio Spec](../agents/smart-home-agent/sonos-spatial-audio-spec.md)
- **Sonos Manager Spec:** See [Sonos Manager Specification](../agents/smart-home-agent/sonos-manager-spec.md)
- **API Endpoints:** See [Sonos API Endpoints](../agents/smart-home-agent/sonos-api-endpoints.md)
- **Smart Home Agent:** See [Smart Home Agent Documentation](../agents/smart-home-agent/README.md)
- **MultiSpeakerAudioService:** See `lambda-deployments/content-agent/src/services/MultiSpeakerAudioService.ts`
