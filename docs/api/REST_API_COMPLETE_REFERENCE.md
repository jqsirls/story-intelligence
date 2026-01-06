# Storytailor REST API Complete Reference

**Date**: December 28, 2025  
**Total Endpoints**: 150+  
**API Base**: `https://api.storytailor.dev/api/v1`  
**Version**: 1.0.0

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Progressive Loading with Supabase Realtime](#progressive-loading-with-supabase-realtime)
4. [Pagination](#pagination)
5. [Error Handling](#error-handling)
6. [API Endpoints by Category](#api-endpoints-by-category)
   - [Authentication](#1-authentication)
   - [Stories](#2-stories)
   - [Characters](#3-characters)
   - [Library Management](#4-library-management)
   - [Commerce & Subscriptions](#5-commerce--subscriptions)
   - [Product-Led Growth](#6-product-led-growth)
   - [Feedback System](#7-feedback-system)
   - [Asset Generation](#8-asset-generation)
   - [And more...](#9-other-endpoints)
7. [Response Formats](#response-formats)
8. [Rate Limiting](#rate-limiting)

---

## Overview

The Storytailor REST API provides comprehensive access to all platform features including story creation, character management, asset generation, commerce, and progressive loading capabilities.

### Base URL

```
Production: https://api.storytailor.dev/api/v1
Staging:    https://staging-api.storytailor.dev/api/v1
```

### Common Headers

```http
Authorization: Bearer <jwt_token>
Content-Type: application/json
X-Correlation-ID: <unique_request_id>
```

---

## Authentication

### Login

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
    "user": {
      "id": "user_123",
      "email": "user@example.com",
      "firstName": "John",
      "userType": "parent"
    },
    "expiresAt": "2024-01-01T12:00:00Z"
  }
}
```

### Signup

```http
POST /api/v1/auth/signup
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "secure_password",
  "firstName": "John",
  "userType": "parent",
  "referralCode": "optional_code"
}
```

### Refresh Token

```http
POST /api/v1/auth/refresh
Content-Type: application/json

{
  "refreshToken": "[REDACTED_JWT]"
}
```

### Logout

```http
POST /api/v1/auth/logout
Authorization: Bearer <token>
```

---

## Progressive Loading with Supabase Realtime

All AI generation endpoints (story creation, character art, asset generation) support progressive loading via Supabase Realtime. Assets appear in the UI as they complete.

### Story Creation Response

```json
{
  "success": true,
  "data": {
    "id": "story_123",
    "title": "My Story",
    "status": "generating",
    "realtimeChannel": "stories:id=story_123",
    "subscribePattern": {
      "table": "stories",
      "filter": "id=eq.story_123",
      "event": "UPDATE"
    },
    "asset_generation_status": {
      "overall": "generating",
      "assets": {
        "content": { "status": "generating", "progress": 50 },
        "cover": { "status": "pending" },
        "scene_1": { "status": "pending" },
        "scene_2": { "status": "pending" },
        "scene_3": { "status": "pending" },
        "scene_4": { "status": "pending" },
        "audio": { "status": "pending" },
        "pdf": { "status": "pending" },
        "activities": { "status": "pending" }
      }
    }
  }
}
```

### Individual Beat Status Updates

As each beat image completes, the `asset_generation_status` is updated with individual statuses:

```json
{
  "asset_generation_status": {
    "overall": "generating",
    "assets": {
      "content": { "status": "ready", "progress": 100 },
      "cover": { "status": "ready", "url": "https://assets.storytailor.dev/...", "progress": 100 },
      "scene_1": { "status": "ready", "url": "https://assets.storytailor.dev/...", "progress": 100 },
      "scene_2": { "status": "generating", "progress": 0 },
      "scene_3": { "status": "pending" },
      "scene_4": { "status": "pending" },
      "audio": { "status": "pending" }
    }
  }
}
```

**Key Points:**
- Each beat (`scene_1`, `scene_2`, `scene_3`, `scene_4`) has its own status
- Status values: `pending`, `generating`, `ready`, `failed`
- URLs are provided when status is `ready`
- Frontend can progressively reveal images as each beat completes

---

## Pagination

All list endpoints support pagination with consistent parameters and response format.

### Request Parameters

```http
GET /api/v1/stories?page=1&limit=25
```

- `page` (number, default: 1): Page number (1-indexed)
- `limit` (number, default: 25, max: 100): Items per page

### Response Format

```json
{
  "success": true,
  "data": {
    "items": [...],
    "pagination": {
      "page": 1,
      "limit": 25,
      "total": 100,
      "totalPages": 4,
      "hasNext": true,
      "hasPrevious": false
    }
  }
}
```

---

## Error Handling

### Standard Error Response

```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "requestId": "req_123"
}
```

### Common Error Codes

- `AUTH_REQUIRED` (401): Authentication required
- `AUTH_INVALID` (401): Invalid or expired token
- `FORBIDDEN` (403): Insufficient permissions
- `NOT_FOUND` (404): Resource not found
- `VALIDATION_ERROR` (400): Invalid request data
- `RATE_LIMIT_EXCEEDED` (429): Too many requests
- `QUOTA_EXCEEDED` (403): Plan quota exceeded
- `INTERNAL_ERROR` (500): Server error

---

## API Endpoints by Category

### 1. Authentication

- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/signup` - User registration
- `POST /api/v1/auth/refresh` - Refresh access token
- `POST /api/v1/auth/logout` - User logout
- `POST /api/v1/auth/password/recover` - Password recovery
- `POST /api/v1/auth/password/reset` - Reset password

### 2. Stories

- `GET /api/v1/stories` - List stories (paginated)
- `GET /api/v1/stories/:id` - Get story details
- `POST /api/v1/stories` - Create story (returns immediately with `status: "generating"`)
- `PUT /api/v1/stories/:id` - Update story
- `DELETE /api/v1/stories/:id` - Delete story
- `GET /api/v1/stories/:id/assets/stream` - SSE stream for asset progress
- `POST /api/v1/stories/:id/pdf` - Generate PDF
- `POST /api/v1/stories/:id/consumption` - Track consumption metrics

**Story Creation Example:**

```http
POST /api/v1/stories
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Adventure Story",
  "characterId": "char_123",
  "storyType": "adventure",
  "userAge": 7,
  "theme": "friendship",
  "generateAssets": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "story_456",
    "title": "Adventure Story",
    "status": "generating",
    "realtimeChannel": "stories:id=story_456",
    "asset_generation_status": {
      "overall": "generating",
      "assets": {
        "content": { "status": "generating" },
        "cover": { "status": "pending" },
        "scene_1": { "status": "pending" },
        "scene_2": { "status": "pending" },
        "scene_3": { "status": "pending" },
        "scene_4": { "status": "pending" }
      }
    }
  }
}
```

### 3. Characters

- `GET /api/v1/characters` - List characters (paginated)
- `GET /api/v1/characters/:id` - Get character details
- `POST /api/v1/characters` - Create character (returns immediately with `status: "generating"`)
- `PUT /api/v1/characters/:id` - Update character
- `DELETE /api/v1/characters/:id` - Delete character

**Character Creation Example:**

```http
POST /api/v1/characters
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Alex",
  "age": 7,
  "species": "human",
  "inclusivityTraits": ["wheelchair_user"],
  "appearance": "Friendly and adventurous"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "char_789",
    "name": "Alex",
    "status": "generating",
    "realtimeChannel": "characters:id=char_789",
    "reference_images": null
  }
}
```

### 4. Library Management

- `GET /api/v1/libraries` - List user libraries
- `GET /api/v1/libraries/:id` - Get library details
- `POST /api/v1/libraries` - Create library
- `PUT /api/v1/libraries/:id` - Update library
- `DELETE /api/v1/libraries/:id` - Delete library
- `GET /api/v1/libraries/:id/stats` - Get library statistics

### 5. Commerce & Subscriptions

- `GET /api/v1/plans` - List available plans
- `POST /api/v1/checkout/individual` - Individual checkout
- `POST /api/v1/checkout/organization` - Organization checkout
- `GET /api/v1/subscription` - Get current subscription
- `PUT /api/v1/subscription/cancel` - Cancel subscription
- `POST /api/v1/subscription/upgrade` - Upgrade subscription
- `POST /api/v1/story-packs/purchase` - Purchase story pack
- `POST /api/v1/gift-cards/redeem` - Redeem gift card

### 6. Product-Led Growth

- `GET /api/v1/earning-opportunities` - Get earning opportunities
- `POST /api/v1/earning-opportunities/:id/claim` - Claim earning opportunity
- `GET /api/v1/quota` - Get current quota status

### 7. Feedback System

- `POST /api/v1/stories/:id/feedback` - Submit story feedback
- `POST /api/v1/characters/:id/feedback` - Submit character feedback
- `GET /api/v1/stories/:id/feedback` - Get story feedback summary
- `GET /api/v1/characters/:id/feedback` - Get character feedback summary

### 8. Asset Generation

- `GET /api/v1/stories/:id/assets/stream` - SSE stream for asset progress
- `POST /api/v1/stories/:id/pdf` - Generate PDF
- `GET /api/v1/stories/:id/activities` - Get story activities

### 9. Other Endpoints

See [`docs/integration-guides/WIZED_COMPLETE_API_REFERENCE.md`](../integration-guides/WIZED_COMPLETE_API_REFERENCE.md) for complete list of 150+ endpoints.

---

## Response Formats

### Success Response

```json
{
  "success": true,
  "data": { ... }
}
```

### Paginated Response

```json
{
  "success": true,
  "data": {
    "items": [...],
    "pagination": {
      "page": 1,
      "limit": 25,
      "total": 100,
      "totalPages": 4,
      "hasNext": true,
      "hasPrevious": false
    }
  }
}
```

### Progressive Loading Response

```json
{
  "success": true,
  "data": {
    "id": "resource_id",
    "status": "generating",
    "realtimeChannel": "table:id=resource_id",
    "asset_generation_status": {
      "overall": "generating",
      "assets": {
        "asset_type": {
          "status": "generating|ready|failed|pending",
          "progress": 0-100,
          "url": "https://...",
          "startedAt": "2024-01-01T12:00:00Z",
          "completedAt": "2024-01-01T12:05:00Z"
        }
      }
    }
  }
}
```

---

## Rate Limiting

- **Free Tier**: 100 requests/minute
- **Pro Individual**: 500 requests/minute
- **Pro Organization**: 1000 requests/minute

Rate limit headers:
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1609459200
```

---

## Additional Resources

- [Wized Integration Guide](../integration-guides/WIZED_PROGRESSIVE_LOADING_GUIDE.md)
- [Pipeline Process Documentation](../pipelines/COMPLETE_PIPELINE_PROCESS.md)
- [OpenAPI Specification](../api/OPENAPI_EXTENSIONS.md)
- [Error Catalog](../api-reference/error-catalog.md)

