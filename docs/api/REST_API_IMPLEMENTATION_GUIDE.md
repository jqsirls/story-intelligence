# Storytailor REST API Implementation Guide

**Complete reference for 121+ REST API endpoints**  
**Powered by Story Intelligence™**

---

## ⚠️ Contract Precedence (Product REST API)

For the **product REST API** contract (headers, pagination, error shapes/codes, and endpoint catalog), treat this file as guidance only.

- **Canonical contract**: `docs/api/REST_API_EXPERIENCE_MASTER.md`
- If anything conflicts, **the master file wins**.

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Error Handling](#error-handling)
4. [Rate Limiting](#rate-limiting)
5. [API Categories](#api-categories)
   - [1. Transfer & Sharing](#1-transfer--sharing)
   - [2. Invitations](#2-invitations)
   - [3. Emotion Intelligence](#3-emotion-intelligence)
   - [4. Streaming & Avatar](#4-streaming--avatar)
   - [5. Smart Home (Hue)](#5-smart-home-hue)
   - [6. User Preferences](#6-user-preferences)
   - [7. Notification Center](#7-notification-center)
   - [8. Push Notifications](#8-push-notifications)
   - [9. Audio & Narration](#9-audio--narration)
   - [10. Asset Management](#10-asset-management)
   - [11. Search & Discovery](#11-search--discovery)
   - [12. Tags & Collections](#12-tags--collections)
   - [13. Favorites & Bookmarks](#13-favorites--bookmarks)
   - [14. Parent Dashboard](#14-parent-dashboard)
   - [15. Password Management](#15-password-management)
   - [16. B2B Organizations](#16-b2b-organizations)
   - [17. Affiliate Program](#17-affiliate-program)
   - [18. Story CRUD](#18-story-crud)
   - [19. Character CRUD](#19-character-crud)
   - [20. Export & Import](#20-export--import)
   - [21. Admin APIs](#21-admin-apis)
6. [Progressive Loading](#progressive-loading)
7. [Tier-Based Generation](#tier-based-generation)
8. [Wized Integration](#wized-integration)

---

## Overview

The Storytailor REST API provides 121+ endpoints for building rich storytelling experiences. This guide covers:

- **Static Call/Response** patterns (not conversational flows)
- **Progressive loading** with Supabase Realtime
- **Tier-based asset generation** based on subscription level
- **Wized Embed 2.0** compatibility

### Base URL

```
Production: https://api.storytailor.dev/api/v1
Staging:    https://staging-api.storytailor.dev/api/v1
```

### Common Headers

```http
Authorization: Bearer <jwt_token>
Content-Type: application/json
X-Request-Id: <unique_request_id>
```

---

## Authentication

All endpoints (except public ones) require JWT authentication.

### Obtaining a Token

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "secure_password"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "[REDACTED_JWT]",
    "refreshToken": "[REDACTED_JWT]",
    "expiresAt": "2024-01-01T12:00:00Z"
  }
}
```

### Token Refresh

```http
POST /api/v1/auth/refresh
Content-Type: application/json

{
  "refreshToken": "[REDACTED_JWT]"
}
```

---

## Error Handling

All errors follow a consistent format:

```json
{
  "success": false,
  "error": "Human-readable error message",
  "code": "ERR_XXXX",
  "details": { /* optional additional context */ }
}
```

### Error Codes

| Code | Description |
|------|-------------|
| `ERR_1001` | Unauthorized - missing or invalid token |
| `ERR_1002` | Invalid token format |
| `ERR_1003` | Token expired |
| `ERR_1004` | Insufficient permissions |
| `ERR_1005` | COPPA consent required |
| `ERR_2001` | Validation error |
| `ERR_2002` | Missing required field |
| `ERR_3001` | Resource not found |
| `ERR_3002` | Resource already exists |
| `ERR_4001` | Rate limited |
| `ERR_4002` | Quota exceeded |
| `ERR_5001` | Internal server error |
| `ERR_6001` | Subscription required |
| `ERR_6002` | Feature not available for tier |

---

## Rate Limiting

| Tier | Requests/Minute | Concurrent |
|------|-----------------|------------|
| Free | 30 | 2 |
| Starter | 60 | 5 |
| Family | 120 | 10 |
| Premium | 300 | 25 |
| B2B | 1000 | 100 |

Rate limit headers are included in responses:

```http
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1704067200
```

---

## API Categories

### 1. Transfer & Sharing

Transfer stories and characters between libraries.

#### Transfer Story
```http
POST /api/v1/libraries/{libraryId}/stories/{storyId}/transfer
Authorization: Bearer <token>

{
  "targetLibraryId": "uuid",
  "transferMessage": "Sharing this story with grandma!",
  "transferType": "move"  // "move" or "copy"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "transferId": "uuid",
    "status": "pending",
    "expiresAt": "2024-01-08T12:00:00Z"
  }
}
```

#### Respond to Transfer
```http
POST /api/v1/transfers/{transferId}/respond
Authorization: Bearer <token>

{
  "response": "accepted",  // "accepted" or "rejected"
  "responseMessage": "Thank you!"
}
```

#### List Pending Transfers
```http
GET /api/v1/transfers/pending?direction=incoming
Authorization: Bearer <token>
```

---

### 2. Invitations

Invite friends and grant library access.

#### Invite Friend to Storytailor
```http
POST /api/v1/invites/friend
Authorization: Bearer <token>

{
  "email": "friend@example.com",
  "personalMessage": "You'll love this app!"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "inviteId": "uuid",
    "inviteCode": "INVXYZ123",
    "inviteUrl": "https://storytailor.com/invite/INVXYZ123",
    "discountPercentage": 10
  }
}
```

#### Invite to Library
```http
POST /api/v1/libraries/{libraryId}/invites
Authorization: Bearer <token>

{
  "email": "teacher@school.edu",
  "role": "viewer",  // "viewer", "editor", "admin"
  "expiresAt": "2024-02-01T00:00:00Z"
}
```

---

### 3. Emotion Intelligence

Track and analyze emotional patterns.

#### Submit Emotion Check-In
```http
POST /api/v1/profiles/{profileId}/emotions/check-in
Authorization: Bearer <token>

{
  "emotion": "happy",
  "intensity": 8,
  "context": "After reading the story",
  "detectedFrom": "manual"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "checkInId": "uuid",
    "suggestedStories": [
      { "id": "uuid", "title": "Adventure Time", "relevance": 0.95 }
    ],
    "suggestedActivities": ["art_project", "outdoor_play"]
  }
}
```

#### Get Emotion Patterns
```http
GET /api/v1/profiles/{profileId}/emotions/patterns?period=30d
Authorization: Bearer <token>
```

#### Emotion SSE Stream
```http
GET /api/v1/profiles/{profileId}/emotions/stream
Authorization: Bearer <token>
Accept: text/event-stream
```

---

### 4. Streaming & Avatar

Real-time avatar and conversation streaming.

#### Get Avatar Connection
```http
GET /api/v1/avatar/connection
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "wsUrl": "wss://avatar.storytailor.com/ws/user123",
    "token": "avatar_token_xyz",
    "capabilities": ["emotion_detection", "voice_response"],
    "expiresAt": "2024-01-01T13:00:00Z"
  }
}
```

#### Asset Progress Stream (SSE)
```http
GET /api/v1/stories/{storyId}/assets/stream
Authorization: Bearer <token>
Accept: text/event-stream
```

**Event Format:**
```
data: {"type":"status","asset":"audio","status":"generating","progress":45}

data: {"type":"status","asset":"audio","status":"ready","url":"https://..."}
```

---

### 5. Smart Home (Hue)

Philips Hue integration for immersive storytelling.

#### Connect Hue
```http
POST /api/v1/hue/connect
Authorization: Bearer <token>

{
  "code": "oauth_code",  // Step 2: Exchange OAuth code
  "selectionType": "room",  // Step 3: Select room/zone
  "selectionId": "living-room-1",
  "selectionName": "Living Room"
}
```

**Response (Step 1 - No code):**
```json
{
  "success": true,
  "data": {
    "authUrl": "https://api.meethue.com/oauth2/auth?...",
    "state": "hue_user123_1704067200"
  }
}
```

#### Get Hue State
```http
GET /api/v1/users/me/hue
Authorization: Bearer <token>
```

#### Update Intensity
```http
PATCH /api/v1/users/me/hue
Authorization: Bearer <token>

{
  "intensity": "regular"  // "light", "regular", "bold", "off"
}
```

---

### 6. User Preferences

Manage user settings and accessibility options.

#### Get Preferences
```http
GET /api/v1/users/me/preferences
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "theme": "auto",
    "language": "en",
    "notifications": {
      "email": true,
      "push": true,
      "storyComplete": true,
      "weeklyDigest": true
    },
    "audio": {
      "defaultVoice": "alloy",
      "autoPlay": false
    },
    "accessibility": {
      "highContrast": false,
      "reduceMotion": false,
      "fontSize": "medium"
    }
  }
}
```

#### Update Preferences
```http
PATCH /api/v1/users/me/preferences
Authorization: Bearer <token>

{
  "theme": "dark",
  "notifications": {
    "weeklyDigest": false
  }
}
```

---

### 7. Notification Center

Manage in-app notifications.

#### Get Notification Feed
```http
GET /api/v1/users/me/notifications?limit=20&offset=0&type=all
Authorization: Bearer <token>
```

#### Get Unread Count
```http
GET /api/v1/users/me/notifications/unread
Authorization: Bearer <token>
```

#### Mark as Read
```http
PATCH /api/v1/users/me/notifications/{notificationId}/read
Authorization: Bearer <token>
```

#### Mark All as Read
```http
POST /api/v1/users/me/notifications/mark-all-read
Authorization: Bearer <token>
```

---

### 8. Push Notifications

Device registration for push notifications.

#### Register Device
```http
POST /api/v1/users/me/push/devices
Authorization: Bearer <token>

{
  "deviceToken": "fcm_token_xyz",
  "platform": "ios",  // "ios", "android", "web"
  "deviceName": "iPhone 15",
  "enabled": true
}
```

#### Unregister Device
```http
DELETE /api/v1/users/me/push/devices/{deviceId}
Authorization: Bearer <token>
```

---

### 9. Audio & Narration

Generate and manage audio narration.

#### Generate Audio
```http
POST /api/v1/stories/{storyId}/audio
Authorization: Bearer <token>

{
  "voiceId": "alloy",
  "speed": 1.0,
  "includeMusic": true,
  "includeSfx": false
}
```

**Response (202 Accepted):**
```json
{
  "success": true,
  "data": {
    "jobId": "uuid",
    "status": "queued",
    "estimatedTime": 60
  }
}
```

#### Get Audio Status
```http
GET /api/v1/stories/{storyId}/audio
Authorization: Bearer <token>
```

#### Get WebVTT (Read-Along)
```http
GET /api/v1/stories/{storyId}/webvtt
Authorization: Bearer <token>
```

#### List Available Voices
```http
GET /api/v1/audio/voices
Authorization: Bearer <token>
```

---

### 10. Asset Management

Manage story asset generation.

#### Get Asset Status
```http
GET /api/v1/stories/{storyId}/assets/status
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "overall": "generating",
    "assets": {
      "cover": { "status": "ready", "url": "https://..." },
      "audio": { "status": "generating", "progress": 65 },
      "pdf": { "status": "pending" }
    }
  }
}
```

#### Estimate Generation
```http
POST /api/v1/stories/{storyId}/assets/estimate
Authorization: Bearer <token>

{
  "assets": ["audio", "cover", "pdf", "activities"]
}
```

#### Cancel Generation
```http
POST /api/v1/stories/{storyId}/assets/cancel
Authorization: Bearer <token>

{
  "assetTypes": ["pdf"]  // Optional: cancel specific assets
}
```

#### Retry Failed Assets
```http
POST /api/v1/stories/{storyId}/assets/retry
Authorization: Bearer <token>

{
  "assetTypes": ["audio"]
}
```

#### Generate QR Code
```http
POST /api/v1/stories/{storyId}/qr
Authorization: Bearer <token>

{
  "format": "png",
  "size": 256
}
```

---

### 11. Search & Discovery

Universal search across content.

#### Search
```http
GET /api/v1/search?q=dragon&type=stories&limit=20
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "results": [
      {
        "type": "story",
        "id": "uuid",
        "title": "Dragon Adventure",
        "snippet": "Once upon a time...",
        "relevance": 0.95
      }
    ],
    "total": 15,
    "facets": {
      "types": { "stories": 10, "characters": 5 }
    }
  }
}
```

---

### 12. Tags & Collections

Organize content with tags.

#### List Tags
```http
GET /api/v1/tags
Authorization: Bearer <token>
```

#### Create Tag
```http
POST /api/v1/tags
Authorization: Bearer <token>

{
  "name": "Favorites",
  "color": "#FF5733"
}
```

#### Tag a Story
```http
POST /api/v1/stories/{storyId}/tags
Authorization: Bearer <token>

{
  "tagId": "uuid"
}
```

---

### 13. Favorites & Bookmarks

Quick access to favorite content.

#### Add to Favorites
```http
POST /api/v1/favorites
Authorization: Bearer <token>

{
  "itemType": "story",
  "itemId": "uuid"
}
```

#### List Favorites
```http
GET /api/v1/favorites?type=story
Authorization: Bearer <token>
```

#### Remove Favorite
```http
DELETE /api/v1/favorites/{favoriteId}
Authorization: Bearer <token>
```

---

### 14. Parent Dashboard

Overview for parents.

#### Get Dashboard
```http
GET /api/v1/dashboard/parent
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "profiles": [...],
    "recentStories": [...],
    "emotionSummary": {
      "recent": [...],
      "insights": [...]
    },
    "recommendations": [...]
  }
}
```

---

### 15. Password Management

Password reset flows.

#### Forgot Password
```http
POST /api/v1/auth/forgot-password
Content-Type: application/json

{
  "email": "user@example.com"
}
```

#### Reset Password
```http
POST /api/v1/auth/reset-password
Content-Type: application/json

{
  "token": "reset_token_xyz",
  "newPassword": "new_secure_password",
  "confirmPassword": "new_secure_password"
}
```

#### Verify Reset Token
```http
POST /api/v1/auth/verify-reset-token
Content-Type: application/json

{
  "token": "reset_token_xyz"
}
```

---

### 16. B2B Organizations

Organization and seat management.

#### Create Organization
```http
POST /api/v1/organizations
Authorization: Bearer <token>

{
  "name": "Sunshine Elementary",
  "type": "school",
  "billingEmail": "billing@school.edu"
}
```

#### Add Seat
```http
POST /api/v1/organizations/{orgId}/seats
Authorization: Bearer <token>

{
  "email": "teacher@school.edu",
  "role": "member"
}
```

#### Get Organization Library
```http
GET /api/v1/organizations/{orgId}/library
Authorization: Bearer <token>
```

#### Share to Organization
```http
POST /api/v1/organizations/{orgId}/library
Authorization: Bearer <token>

{
  "storyId": "uuid"
}
```

---

### 17. Affiliate Program

Referral and earnings management.

#### Get Affiliate Status
```http
GET /api/v1/affiliate/status
Authorization: Bearer <token>
```

#### Enroll in Program
```http
POST /api/v1/affiliate/enroll
Authorization: Bearer <token>

{
  "payoutMethod": "paypal",
  "customCode": "MYCODE"
}
```

#### Get Referrals
```http
GET /api/v1/affiliate/referrals
Authorization: Bearer <token>
```

#### Get Earnings
```http
GET /api/v1/affiliate/earnings
Authorization: Bearer <token>
```

#### Request Payout
```http
POST /api/v1/affiliate/payout
Authorization: Bearer <token>

{
  "amount": 100.00,
  "method": "paypal"
}
```

---

### 18. Story CRUD

Full story management.

#### Create Story
```http
POST /api/v1/libraries/{libraryId}/stories
Authorization: Bearer <token>

{
  "title": "My Adventure",
  "characterId": "uuid",
  "storyType": "bedtime",
  "themes": ["friendship", "courage"]
}
```

#### Get Story
```http
GET /api/v1/libraries/{libraryId}/stories/{storyId}
Authorization: Bearer <token>
```

#### Update Story
```http
PATCH /api/v1/libraries/{libraryId}/stories/{storyId}
Authorization: Bearer <token>

{
  "title": "Updated Title"
}
```

#### Delete Story
```http
DELETE /api/v1/libraries/{libraryId}/stories/{storyId}?soft=true
Authorization: Bearer <token>
```

#### List Stories
```http
GET /api/v1/libraries/{libraryId}/stories?page=1&limit=20
Authorization: Bearer <token>
```

---

### 19. Character CRUD

Character management.

#### Create Character
```http
POST /api/v1/characters
Authorization: Bearer <token>

{
  "name": "Luna",
  "species": "dragon",
  "traits": {...}
}
```

#### Get Character
```http
GET /api/v1/characters/{characterId}
Authorization: Bearer <token>
```

#### Update Character
```http
PATCH /api/v1/characters/{characterId}
Authorization: Bearer <token>

{
  "name": "Luna the Brave"
}
```

#### Delete Character
```http
DELETE /api/v1/characters/{characterId}
Authorization: Bearer <token>
```

---

### 20. Export & Import

Data portability.

#### Export User Data
```http
POST /api/v1/users/me/export
Authorization: Bearer <token>

{
  "format": "json",
  "includeMedia": true
}
```

**Response (202 Accepted):**
```json
{
  "success": true,
  "data": {
    "exportId": "uuid",
    "status": "pending",
    "estimatedTime": 300
  }
}
```

#### Get Export Status
```http
GET /api/v1/users/me/export/{exportId}
Authorization: Bearer <token>
```

---

### 21. Admin APIs

Internal administration endpoints (requires admin role).

#### System Health
```http
GET /api/v1/admin/health
Authorization: Bearer <admin_token>
```

#### System Metrics
```http
GET /api/v1/admin/metrics
Authorization: Bearer <admin_token>
```

#### List Users
```http
GET /api/v1/admin/users?limit=50&status=active
Authorization: Bearer <admin_token>
```

#### Update User Status
```http
PATCH /api/v1/admin/users/{userId}/status
Authorization: Bearer <admin_token>

{
  "status": "suspended",
  "reason": "Violation of terms"
}
```

#### Audit Logs
```http
GET /api/v1/admin/audit?action=login&userId=uuid
Authorization: Bearer <admin_token>
```

#### Content Moderation
```http
GET /api/v1/admin/moderation?status=pending
Authorization: Bearer <admin_token>
```

#### Feature Flags
```http
GET /api/v1/admin/features
PATCH /api/v1/admin/features/{flagId}
```

---

## Progressive Loading

Storytailor uses **Supabase Realtime** for progressive asset loading.

### Frontend Integration (Wized)

```javascript
// Subscribe to story asset updates
const subscription = supabase
  .channel('story-assets')
  .on('postgres_changes', 
    { 
      event: 'UPDATE', 
      schema: 'public', 
      table: 'stories',
      filter: `id=eq.${storyId}`
    }, 
    (payload) => {
      const status = payload.new.asset_generation_status;
      updateUI(status);
    }
  )
  .subscribe();
```

### Asset Status Flow

1. **pending** - Asset queued for generation
2. **generating** - Asset actively being created
3. **ready** - Asset complete with URL
4. **failed** - Generation failed (retry available)
5. **canceled** - User canceled generation

---

## Tier-Based Generation

Assets auto-generate based on subscription tier:

| Tier | Auto-Generate | Manual | Limits/Month |
|------|---------------|--------|--------------|
| Free | - | Art | 3 stories |
| Starter | Art | Audio, Activities | 10 stories |
| Family | Art, Audio, Activities | PDF | 30 stories |
| Premium | All | - | 100 stories |
| Unlimited | All | - | Unlimited |
| B2B | All | - | Unlimited |

---

## Wized Integration

The API is designed for seamless Wized Embed 2.0 integration:

1. **Authentication**: Store JWT in Wized variables
2. **API Calls**: Use Wized requests with dynamic parameters
3. **Real-time**: Connect Supabase for live updates
4. **Progressive Loading**: Show skeleton UI while assets generate

---

**Version**: 1.0  
**Last Updated**: December 23, 2025  
**Powered by Story Intelligence™**

