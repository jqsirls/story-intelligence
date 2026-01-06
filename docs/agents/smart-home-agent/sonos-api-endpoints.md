# Sonos API Endpoints - Specification

**Status**: Design Phase  
**Priority**: High  
**Target**: Premium Immersive Storytelling Experience  
**Last Updated**: 2025-12-14  
**Audience**: Internal | Engineering Team

## Overview

This document specifies all REST API endpoints required for Sonos spatial audio integration. These endpoints will be added to the Universal Agent REST API Gateway.

**Base Path:** `/v1/smarthome/sonos`  
**Authentication:** JWT token or API key (same as other endpoints)  
**Code Location:** `packages/universal-agent/src/api/RESTAPIGateway.ts`

## Endpoints

### 1. Initiate Sonos OAuth Connection

**Endpoint:** `POST /v1/smarthome/sonos/connect`

**Purpose:** Initiate OAuth 2.0 flow for Sonos connection

**Request:**
```json
{
  "userId": "uuid",
  "redirectUri": "https://app.storytailor.com/sonos/callback"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "authorizationUrl": "https://api.sonos.com/login/v3/oauth?client_id=...&redirect_uri=...&scope=...",
    "state": "random-state-token",
    "expiresIn": 600
  }
}
```

**Implementation:**
- Generate OAuth state token
- Store state in Redis (expires in 10 minutes)
- Build authorization URL with client_id, redirect_uri, scopes
- Return authorization URL to client

**Code Reference Pattern:**
- `lambda-deployments/router/src/handlers/HueOAuthHandlers.ts:77-158` - Hue OAuth flow

**Error Responses:**
- `400 Bad Request` - Invalid userId or redirectUri
- `500 Internal Server Error` - OAuth configuration error

---

### 2. Sonos OAuth Callback

**Endpoint:** `GET /v1/smarthome/sonos/callback`

**Purpose:** Handle OAuth callback from Sonos

**Query Parameters:**
- `code` - Authorization code from Sonos
- `state` - State token for validation
- `error` - Error code (if authorization failed)

**Response (Success):**
```json
{
  "success": true,
  "data": {
    "message": "Sonos connection successful",
    "householdId": "sonos-household-id"
  }
}
```

**Response (Error):**
```json
{
  "success": false,
  "error": {
    "code": "OAUTH_ERROR",
    "message": "Authorization failed"
  }
}
```

**Implementation:**
- Validate state token from Redis
- Exchange authorization code for access token
- Store encrypted tokens in database
- Create initial device discovery
- Return success response

**Code Reference Pattern:**
- `lambda-deployments/router/src/handlers/HueOAuthHandlers.ts:160-220` - Token exchange

**Error Responses:**
- `400 Bad Request` - Invalid state or code
- `401 Unauthorized` - Token exchange failed
- `500 Internal Server Error` - Database error

---

### 3. List Sonos Devices

**Endpoint:** `GET /v1/smarthome/sonos/devices`

**Purpose:** List all discovered Sonos speakers for user

**Query Parameters:**
- `userId` (required) - User ID
- `roomId` (optional) - Filter by room

**Response:**
```json
{
  "success": true,
  "data": {
    "devices": [
      {
        "id": "sonos-device-id",
        "name": "Living Room Speaker",
        "roomId": "living-room",
        "householdId": "sonos-household-id",
        "location": "left",
        "role": "spatial",
        "capabilities": {
          "volume": true,
          "stereo": true,
          "grouping": true
        },
        "connectionStatus": "connected"
      }
    ],
    "householdId": "sonos-household-id"
  }
}
```

**Implementation:**
- Get Sonos token for user
- Call Sonos API to get households and groups
- Map to SpeakerDevice format
- Return device list

**Code Reference:**
- `docs/agents/smart-home-agent/sonos-manager-spec.md` - Device discovery

**Error Responses:**
- `401 Unauthorized` - No Sonos token found
- `404 Not Found` - No devices found
- `500 Internal Server Error` - API error

---

### 4. Create Speaker Group

**Endpoint:** `POST /v1/smarthome/sonos/groups`

**Purpose:** Create a Sonos speaker group for spatial audio

**Request:**
```json
{
  "userId": "uuid",
  "speakerIds": ["speaker-id-1", "speaker-id-2"],
  "groupType": "spatial",
  "name": "Story Spatial Audio"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "groupId": "sonos-group-id",
    "name": "Story Spatial Audio",
    "speakerIds": ["speaker-id-1", "speaker-id-2"],
    "groupType": "spatial"
  }
}
```

**Implementation:**
- Validate speaker IDs belong to user
- Create Sonos group via API
- Store group in database
- Return group information

**Code Reference:**
- `docs/agents/smart-home-agent/sonos-manager-spec.md` - Speaker grouping

**Error Responses:**
- `400 Bad Request` - Invalid speaker IDs or group type
- `401 Unauthorized` - No Sonos token found
- `500 Internal Server Error` - Group creation failed

---

### 5. Start Spatial Audio Story

**Endpoint:** `POST /v1/smarthome/sonos/play-spatial`

**Purpose:** Start spatial audio story playback with three-stream orchestration

**Request:**
```json
{
  "userId": "uuid",
  "sessionId": "story-session-id",
  "audioTracks": {
    "narration": {
      "url": "https://cdn.storytailor.com/audio/narration.mp3",
      "groupId": "main-group-id"
    },
    "soundEffects": [
      {
        "url": "https://cdn.storytailor.com/audio/thunder.mp3",
        "timestamp": 30,
        "position": "left",
        "speakerId": "spatial-speaker-1",
        "volume": 0.5
      }
    ],
    "music": {
      "url": "https://cdn.storytailor.com/audio/ambiance.mp3",
      "groupId": "ambiance-group-id",
      "volume": 0.2
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "sessionId": "story-session-id",
    "status": "playing",
    "startedAt": "2025-12-14T10:00:00Z"
  }
}
```

**Implementation:**
- Validate audio URLs and speaker IDs
- Create spatial audio session
- Start narration on main group
- Schedule sound effects on spatial speakers
- Start background music on ambiance group
- Return session status

**Code Reference:**
- `docs/agents/smart-home-agent/sonos-manager-spec.md` - Spatial audio playback
- `lambda-deployments/content-agent/src/services/MultiSpeakerAudioService.ts:280-325` - Audio orchestration

**Error Responses:**
- `400 Bad Request` - Invalid audio tracks or speaker configuration
- `401 Unauthorized` - No Sonos token found
- `500 Internal Server Error` - Playback failed

---

### 6. Control Individual Speaker

**Endpoint:** `POST /v1/smarthome/sonos/control`

**Purpose:** Control individual speaker (volume, pause, resume)

**Request:**
```json
{
  "userId": "uuid",
  "speakerId": "sonos-speaker-id",
  "action": "setVolume",
  "parameters": {
    "volume": 0.75
  }
}
```

**Actions:**
- `setVolume` - Set speaker volume (0.0-1.0)
- `pause` - Pause playback
- `resume` - Resume playback
- `stop` - Stop playback

**Response:**
```json
{
  "success": true,
  "data": {
    "speakerId": "sonos-speaker-id",
    "action": "setVolume",
    "result": {
      "volume": 0.75
    }
  }
}
```

**Implementation:**
- Validate speaker belongs to user
- Call appropriate Sonos API method
- Return result

**Code Reference:**
- `docs/agents/smart-home-agent/sonos-manager-spec.md` - Volume control

**Error Responses:**
- `400 Bad Request` - Invalid action or parameters
- `401 Unauthorized` - No Sonos token found
- `404 Not Found` - Speaker not found
- `500 Internal Server Error` - Control failed

---

### 7. Get Speaker Status

**Endpoint:** `GET /v1/smarthome/sonos/devices/:speakerId/status`

**Purpose:** Get current status of a Sonos speaker

**Response:**
```json
{
  "success": true,
  "data": {
    "speakerId": "sonos-speaker-id",
    "name": "Living Room Speaker",
    "status": "playing",
    "volume": 0.75,
    "currentTrack": {
      "name": "Story Narration",
      "type": "narration"
    },
    "health": {
      "status": "healthy",
      "lastSeen": "2025-12-14T10:00:00Z"
    }
  }
}
```

**Implementation:**
- Get speaker from Sonos API
- Check health status
- Return current state

**Code Reference:**
- `docs/agents/smart-home-agent/sonos-manager-spec.md` - Health monitoring

**Error Responses:**
- `401 Unauthorized` - No Sonos token found
- `404 Not Found` - Speaker not found
- `500 Internal Server Error` - Status check failed

---

### 8. Disconnect Sonos

**Endpoint:** `DELETE /v1/smarthome/sonos/disconnect`

**Purpose:** Disconnect Sonos integration and clean up tokens

**Request:**
```json
{
  "userId": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Sonos disconnected successfully"
  }
}
```

**Implementation:**
- Revoke Sonos tokens
- Delete tokens from database
- Remove device records
- Clear Redis cache

**Code Reference Pattern:**
- `packages/smart-home-agent/src/SmartHomeAgent.ts:400-450` - Device disconnection

**Error Responses:**
- `400 Bad Request` - Invalid userId
- `500 Internal Server Error` - Disconnection failed

---

## Authentication & Authorization

### Authentication

All endpoints require authentication via:
- JWT token in `Authorization` header, or
- API key in `X-API-Key` header

**Code Reference:**
- `packages/universal-agent/src/api/RESTAPIGateway.ts:320-536` - Authentication middleware

### Authorization

**User Validation:**
- Verify userId matches authenticated user
- Check user has access to requested devices
- Validate parental consent for children

**Code Reference:**
- `packages/smart-home-agent/src/privacy/IoTPrivacyController.ts:42-103` - Privacy validation

## Error Handling

### Standard Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {}
  }
}
```

### Error Codes

- `OAUTH_ERROR` - OAuth flow error
- `TOKEN_ERROR` - Token management error
- `DEVICE_NOT_FOUND` - Speaker not found
- `INVALID_CONFIGURATION` - Invalid speaker configuration
- `PLAYBACK_ERROR` - Audio playback error
- `PERMISSION_DENIED` - User lacks permission

## Rate Limiting

**Limits:**
- 100 requests per minute per user
- 10 OAuth initiation requests per hour per user

**Code Reference:**
- `packages/universal-agent/src/api/RESTAPIGateway.ts:232-253` - Rate limiting

## Related Documentation

- **Spatial Audio Specification:** See [Sonos Spatial Audio Spec](./sonos-spatial-audio-spec.md)
- **Sonos Manager Spec:** See [Sonos Manager Specification](./sonos-manager-spec.md)
- **Sonos Integration Guide:** See [Sonos Integration](../integrations/sonos.md)
- **REST API Gateway:** See `packages/universal-agent/src/api/RESTAPIGateway.ts`
