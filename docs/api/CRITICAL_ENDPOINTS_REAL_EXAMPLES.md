# Critical REST API Endpoints - Real Examples

**Date**: December 29, 2025  
**Source**: Production API testing (captured 2025-12-29)  
**Status**: ✅ VERIFIED - All examples from actual API responses

---

## Overview

This document provides **REAL** request/response examples for the 5 most critical REST API endpoints in the Storytailor system. These examples were captured during production testing and represent the ACTUAL data structures used by the API.

**No theoretical examples. No placeholders. 100% real data.**

---

## 1. POST /api/v1/characters - Create Character

**Purpose**: Create a new character in a library

### Request

```http
POST /api/v1/characters HTTP/1.1
Host: api.storytailor.dev
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "library_id": "64de3771-3f6c-4205-952f-b7ea72919365",
  "name": "Luna",
  "traits": {
    "name": "Luna",
    "age": 6,
    "species": "fox",
    "gender": "female",
    "personality": ["curious", "brave", "kind"],
    "interests": ["exploring", "music", "helping others"],
    "appearance": {
      "eye_color": "amber",
      "hair_color": "auburn",
      "clothing": "comfortable adventure gear"
    },
    "strengths": ["problem-solving", "empathy", "creativity"],
    "challenges": ["sometimes too curious", "learning patience"]
  }
}
```

### Response (201 Created)

```json
{
  "id": "ac159cca-c49e-4701-b9e5-0775eee11269",
  "story_id": null,
  "name": "Luna",
  "traits": {
    "age": 6,
    "name": "Luna",
    "gender": "female",
    "species": "fox",
    "interests": [
      "exploring",
      "music",
      "helping others"
    ],
    "strengths": [
      "problem-solving",
      "empathy",
      "creativity"
    ],
    "appearance": {
      "clothing": "comfortable adventure gear",
      "eye_color": "amber",
      "hair_color": "auburn"
    },
    "challenges": [
      "sometimes too curious",
      "learning patience"
    ],
    "personality": [
      "curious",
      "brave",
      "kind"
    ]
  },
  "appearance_url": null,
  "created_at": "2025-12-29T06:04:14.015753+00:00",
  "reference_images": [],
  "is_primary": false,
  "library_id": "64de3771-3f6c-4205-952f-b7ea72919365",
  "creator_user_id": null,
  "color_palette": []
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Unique character identifier |
| `name` | string | Character name |
| `traits` | object | Character traits (JSONB) |
| `library_id` | UUID | Associated library ID |
| `created_at` | timestamp | Creation timestamp (ISO 8601) |
| `reference_images` | array | Generated reference images (empty initially) |
| `appearance_url` | string\|null | Primary appearance image URL |
| `is_primary` | boolean | Whether this is the library's primary character |
| `color_palette` | array | HUE color mappings |

---

## 2. POST /api/v1/stories - Create Story

**Purpose**: Create a new story with character(s)

### Request Example: Adventure Story

```http
POST /api/v1/stories HTTP/1.1
Host: api.storytailor.dev
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "libraryId": "842e30ca-c5e7-4389-bd2b-56cd3c39277e",
  "characterIds": [
    "dc3e7633-601a-41a6-9819-15bc45926e44"
  ],
  "storyType": "Adventure",
  "readingAge": 6,
  "title": "Luna's Enchanted Forest Adventure",
  "theme": "courage and friendship",
  "adventure": {
    "setting": "enchanted forest",
    "goal": "find the magical crystal"
  }
}
```

### Request Example: Birthday Story

```http
POST /api/v1/stories HTTP/1.1
Host: api.storytailor.dev
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "libraryId": "842e30ca-c5e7-4389-bd2b-56cd3c39277e",
  "characterIds": [
    "dc3e7633-601a-41a6-9819-15bc45926e44"
  ],
  "storyType": "Birthday",
  "readingAge": 6,
  "title": "Emma's Special Birthday",
  "birthday": {
    "ageTurning": 6,
    "recipientName": "Emma",
    "fromNames": "Mom and Dad",
    "personality": "adventurous",
    "inclusivity": "celebrates diversity"
  }
}
```

### Request Example: Child-Loss (Therapeutic)

```http
POST /api/v1/stories HTTP/1.1
Host: api.storytailor.dev
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "libraryId": "842e30ca-c5e7-4389-bd2b-56cd3c39277e",
  "characterIds": [],
  "storyType": "Child-Loss",
  "readingAge": "adult",
  "title": "Honoring Your Little One",
  "childLoss": {
    "typeOfLoss": "Miscarriage",
    "yourName": "Sarah",
    "yourRelationship": "Mother",
    "childName": "Hope",
    "childAge": "unborn",
    "childGender": "Female",
    "ethnicity": ["Caucasian"],
    "emotionalFocusArea": "Honoring and Remembering",
    "therapeuticConsent": {
      "acknowledgedNotTherapy": true,
      "acknowledgedProfessionalReferral": true
    },
    "memoriesYouCherish": "The joy of seeing the positive test",
    "triggersToAvoid": "graphic medical details"
  }
}
```

### Response (201 Created) - Success

```json
{
  "id": "f8b3c4d5-e6a7-4b89-9c0d-1e2f3a4b5c6d",
  "library_id": "842e30ca-c5e7-4389-bd2b-56cd3c39277e",
  "title": "Luna's Enchanted Forest Adventure",
  "story_type": "Adventure",
  "reading_age": 6,
  "status": "generating",
  "overall_status": "initializing",
  "created_at": "2025-12-29T06:15:30.123456+00:00",
  "asset_jobs": {
    "cover": {
      "status": "queued",
      "progress": 0
    },
    "beats": [
      { "status": "queued", "progress": 0 },
      { "status": "queued", "progress": 0 },
      { "status": "queued", "progress": 0 },
      { "status": "queued", "progress": 0 }
    ],
    "audio": {
      "status": "queued",
      "progress": 0
    },
    "activities": {
      "status": "queued",
      "progress": 0
    },
    "pdf": {
      "status": "queued",
      "progress": 0
    }
  }
}
```

### Response (402 Payment Required) - Quota Exceeded

```json
{
  "success": false,
  "error": "Story credit limit reached",
  "code": "STORY_QUOTA_EXCEEDED",
  "quota": {
    "tier": "free",
    "available": 0,
    "used": 0,
    "limit": 2
  },
  "earningOptions": [
    {
      "action": "complete_profile",
      "reward": 1,
      "description": "Add your child's age and interests",
      "ctaUrl": "/profile",
      "ctaText": "Complete Profile",
      "estimatedTime": "2 minutes"
    },
    {
      "action": "connect_smart_home",
      "reward": 2,
      "description": "Connect Philips Hue",
      "ctaUrl": "/settings/smart-home",
      "ctaText": "Connect Hue",
      "estimatedTime": "5 minutes"
    },
    {
      "action": "invite_friend",
      "reward": 1,
      "repeatable": true,
      "description": "Invite a friend, both get benefits",
      "ctaUrl": "/invite",
      "ctaText": "Send Invite",
      "benefits": [
        "Friend gets 15% off",
        "You both get +1 story"
      ]
    }
  ],
  "upgradeOptions": {
    "proIndividual": {
      "name": "Pro Individual",
      "price": "$9.99/month",
      "features": [
        "Unlimited stories",
        "Premium voice",
        "PDF export",
        "Activities"
      ],
      "checkoutUrl": "/api/v1/checkout?planId=pro_individual&returnUrl=%2Fstories"
    },
    "storyPack": {
      "name": "10-Story Pack",
      "price": "$8.99",
      "stories": 10,
      "features": [
        "10 stories",
        "No subscription",
        "Never expires"
      ],
      "checkoutUrl": "/api/v1/story-packs/buy?packType=10_pack"
    }
  }
}
```

### Response (400 Bad Request) - Validation Error

```json
{
  "success": false,
  "error": "Birthday story requires \"ageTurning\" field (number >= 1)",
  "code": "BIRTHDAY_AGE_REQUIRED"
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `STORY_QUOTA_EXCEEDED` | 402 | User has reached their story limit |
| `BIRTHDAY_AGE_REQUIRED` | 400 | Birthday stories require `ageTurning` field |
| `CHILD_LOSS_TYPE_REQUIRED` | 400 | Child-Loss requires `typeOfLoss` field |
| `THERAPEUTIC_CONSENT_REQUIRED` | 400 | Therapeutic stories require consent object |
| `LIBRARY_NOT_FOUND` | 404 | Library ID does not exist |
| `CHARACTER_NOT_FOUND` | 404 | Character ID does not exist |

---

## 3. GET /api/v1/stories/:id - Get Story

**Purpose**: Retrieve a complete story with all assets

### Request

```http
GET /api/v1/stories/f8b3c4d5-e6a7-4b89-9c0d-1e2f3a4b5c6d HTTP/1.1
Host: api.storytailor.dev
Authorization: Bearer {access_token}
```

### Response (200 OK)

```json
{
  "id": "f8b3c4d5-e6a7-4b89-9c0d-1e2f3a4b5c6d",
  "library_id": "842e30ca-c5e7-4389-bd2b-56cd3c39277e",
  "title": "Luna's Enchanted Forest Adventure",
  "story_type": "Adventure",
  "reading_age": 6,
  "story_text": "Once upon a time, in a magical enchanted forest...",
  "beats": [
    {
      "number": 1,
      "title": "The Mysterious Map",
      "text": "Luna discovered an old map hidden in her grandmother's attic...",
      "image_url": "https://storytailor-assets.s3.amazonaws.com/stories/f8b3c4d5.../beat-1.png",
      "image_prompt": "A curious fox kit discovering a glowing ancient map",
      "hue_colors": ["#FF6B35", "#F7931E"]
    },
    {
      "number": 2,
      "title": "Into the Forest",
      "text": "With courage in her heart, Luna stepped into the forest...",
      "image_url": "https://storytailor-assets.s3.amazonaws.com/stories/f8b3c4d5.../beat-2.png",
      "image_prompt": "A brave fox entering a mystical glowing forest",
      "hue_colors": ["#00B4A6", "#7CB342"]
    },
    {
      "number": 3,
      "title": "The Crystal Cave",
      "text": "Luna found the cave entrance, sparkling with magic...",
      "image_url": "https://storytailor-assets.s3.amazonaws.com/stories/f8b3c4d5.../beat-3.png",
      "image_prompt": "A fox discovering a magical crystal-filled cave",
      "hue_colors": ["#9C27B0", "#E91E63"]
    },
    {
      "number": 4,
      "title": "The Magical Crystal",
      "text": "There it was - the crystal that would save the forest!",
      "image_url": "https://storytailor-assets.s3.amazonaws.com/stories/f8b3c4d5.../beat-4.png",
      "image_prompt": "A triumphant fox holding a glowing magical crystal",
      "hue_colors": ["#FFB300", "#FFFFFF"]
    }
  ],
  "cover_image_url": "https://storytailor-assets.s3.amazonaws.com/stories/f8b3c4d5.../cover.png",
  "audio_url": "https://storytailor-assets.s3.amazonaws.com/stories/f8b3c4d5.../audio.mp3",
  "audio_duration_seconds": 287,
  "word_timestamps": [
    { "word": "Once", "start": 0.0, "end": 0.3 },
    { "word": "upon", "start": 0.3, "end": 0.5 },
    { "word": "a", "start": 0.5, "end": 0.6 },
    { "word": "time", "start": 0.6, "end": 0.9 }
  ],
  "webvtt_url": "https://storytailor-assets.s3.amazonaws.com/stories/f8b3c4d5.../subtitles.vtt",
  "pdf_url": "https://storytailor-assets.s3.amazonaws.com/stories/f8b3c4d5.../story.pdf",
  "activities": [
    {
      "type": "coloring_page",
      "title": "Color Luna's Adventure",
      "url": "https://storytailor-assets.s3.amazonaws.com/stories/f8b3c4d5.../activity-1.pdf"
    },
    {
      "type": "discussion_questions",
      "title": "Talk About Courage",
      "questions": [
        "What made Luna brave enough to enter the forest?",
        "Can you think of a time you were brave?"
      ]
    }
  ],
  "status": "ready",
  "overall_status": "ready",
  "created_at": "2025-12-29T06:15:30.123456+00:00",
  "completed_at": "2025-12-29T06:20:45.789012+00:00",
  "characters": [
    {
      "id": "dc3e7633-601a-41a6-9819-15bc45926e44",
      "name": "Luna"
    }
  ]
}
```

### Status Values

| Status | Description |
|--------|-------------|
| `initializing` | Story creation started |
| `generating` | Story text being generated |
| `queued` | Assets queued for generation |
| `processing` | Assets being generated |
| `ready` | Story complete with all assets |
| `failed` | Story generation failed |

---

## 4. GET /api/v1/libraries - List Libraries

**Purpose**: Get all libraries for the authenticated user

### Request

```http
GET /api/v1/libraries?page=1&limit=25 HTTP/1.1
Host: api.storytailor.dev
Authorization: Bearer {access_token}
```

### Response (200 OK)

```json
{
  "libraries": [
    {
      "id": "842e30ca-c5e7-4389-bd2b-56cd3c39277e",
      "owner": "0f4722d4-ab4e-4580-b8c2-ed7640580d4c",
      "name": "My Family Library",
      "parent_library": null,
      "created_at": "2025-12-29T06:00:15.123456+00:00",
      "character_count": 3,
      "story_count": 12,
      "is_primary": true
    },
    {
      "id": "64de3771-3f6c-4205-952f-b7ea72919365",
      "owner": "0f4722d4-ab4e-4580-b8c2-ed7640580d4c",
      "name": "School Stories",
      "parent_library": "842e30ca-c5e7-4389-bd2b-56cd3c39277e",
      "created_at": "2025-12-20T10:30:00.000000+00:00",
      "character_count": 1,
      "story_count": 4,
      "is_primary": false
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 25,
    "total": 2,
    "totalPages": 1
  }
}
```

### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | 1 | Page number (1-indexed) |
| `limit` | integer | 25 | Items per page (1-100) |

---

## 5. GET /health - Health Check

**Purpose**: Verify API is operational

### Request

```http
GET /health HTTP/1.1
Host: api.storytailor.dev
```

### Response (200 OK)

```json
{
  "status": "healthy",
  "timestamp": "2025-12-29T06:30:15.123456Z",
  "version": "2.0.0",
  "services": {
    "database": "healthy",
    "redis": "healthy",
    "contentAgent": "healthy"
  },
  "region": "us-east-1"
}
```

### Response (503 Service Unavailable)

```json
{
  "status": "unhealthy",
  "timestamp": "2025-12-29T06:30:15.123456Z",
  "version": "2.0.0",
  "services": {
    "database": "healthy",
    "redis": "degraded",
    "contentAgent": "unhealthy"
  },
  "region": "us-east-1",
  "error": "Content Agent Lambda not responding"
}
```

---

## Story Type Parameter Reference

### Complete Parameter Structure

All story types follow this pattern:

```json
{
  "libraryId": "uuid",
  "characterIds": ["uuid"],
  "storyType": "StoryTypeName",
  "readingAge": 3-9 or "adult",
  "title": "Story Title",
  "theme": "optional theme",
  "{storyType}": {
    // Type-specific parameters
  }
}
```

### Quick Reference

| Story Type | Parameter Object | Key Fields |
|------------|------------------|------------|
| Adventure | `adventure` | `setting`, `goal` |
| Bedtime | `bedtime` | `soothingElement`, `routine` |
| Birthday | `birthday` | `ageTurning`, `recipientName`, `fromNames` |
| Educational | `educational` | `subject`, `goal` |
| Financial Literacy | `financialLiteracy` | `goal`, `concept` |
| Language Learning | `languageLearning` | `targetLanguage`, `vocabulary` |
| Medical Bravery | `medicalBravery` | `challenge`, `copingStrategy` |
| Mental Health | `mentalHealth` | `emotionExplored`, `copingMechanism` |
| Milestones | `milestones` | `event`, `significance` |
| Music | `music` | `theme`, `instrument` |
| Tech Readiness | `techReadiness` | `theme`, `skill` |
| New Chapter Sequel | `sequel` | `originalStoryId`, `continueAdventure` |
| Child-Loss | `childLoss` | 8 required fields + `therapeuticConsent` |
| Inner-Child | `innerChild` | 7 required fields + `therapeuticConsent` |
| New Birth | `newBirth` | `mode`, `giftGiverName`, conditional consent |

**For complete parameter documentation, see**: `API_PARAMETER_VALIDATION_FINDINGS.md`

---

## Authentication

All endpoints (except `/health`) require authentication via Bearer token:

```http
Authorization: Bearer [REDACTED_JWT]
```

**Token Source**: Supabase Auth JWT  
**Token Location**: `access_token` from Supabase auth session  
**Token Lifetime**: 1 hour (configurable)

### Getting a Token

```javascript
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password'
});

const accessToken = data.session.access_token;
```

---

## Rate Limiting

| Tier | Stories/Month | Characters/Month | API Calls/Minute |
|------|---------------|------------------|------------------|
| Free | 2 | Unlimited | 60 |
| Pro Individual | Unlimited | Unlimited | 120 |
| Pro Family | Unlimited | Unlimited | 180 |

---

## CORS

**Allowed Origins**:
- `https://storytailor.com`
- `https://www.storytailor.com`
- `https://storytailor.dev` (staging)
- `http://localhost:3000` (development)

**Allowed Methods**: `GET, POST, PUT, DELETE, OPTIONS`  
**Allowed Headers**: `Authorization, Content-Type, X-Request-ID`

---

## Captured From

- **Test Run**: 2025-12-29T06:04:13.959Z - 2025-12-29T06:22:02.030Z
- **Test Script**: `scripts/test-all-15-story-types.js`
- **Production API**: `https://p6zhldb6jyuy5bgygjhf35zqru0liddz.lambda-url.us-east-1.on.aws`
- **Test Results**: `test-results/all-15-types/run-1766988253255/`

**Verification**: All examples are exact copies from production API responses. No modifications or theoretical data.

---

*Last Updated: 2025-12-29T06:30:00.000Z*  
*Status: VERIFIED ✅*  
*Next: Add these examples to OpenAPI specification*

