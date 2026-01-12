# Storytailor REST API Documentation

**Powered by Story Intelligence™**

---

## Overview

This directory contains comprehensive documentation for the Storytailor REST API, covering 121+ endpoints across 21 categories.

## Quick Start

- **Canonical REST API Contract (Product)**: [REST_API_EXPERIENCE_MASTER.md](./REST_API_EXPERIENCE_MASTER.md)
- **Implementation Notes / Guidance**: [REST_API_IMPLEMENTATION_GUIDE.md](./REST_API_IMPLEMENTATION_GUIDE.md)
- **OpenAPI Spec**: [/packages/api-contract/src/schemas/storytailor-api.yaml](/packages/api-contract/src/schemas/storytailor-api.yaml)

---

## Documentation Structure

### Implementation Guide

| Document | Description |
|----------|-------------|
| [REST_API_IMPLEMENTATION_GUIDE.md](./REST_API_IMPLEMENTATION_GUIDE.md) | Complete 121+ endpoint reference with examples |

### Pattern Guides

| Document | Description |
|----------|-------------|
| [patterns/AUTHENTICATION_PATTERNS.md](./patterns/AUTHENTICATION_PATTERNS.md) | JWT auth, COPPA compliance, RBAC |
| [patterns/ERROR_HANDLING_PATTERNS.md](./patterns/ERROR_HANDLING_PATTERNS.md) | Error codes, responses, recovery |
| [patterns/CACHING_PATTERNS.md](./patterns/CACHING_PATTERNS.md) | Redis caching, TTLs, invalidation |
| [patterns/RATE_LIMITING_PATTERNS.md](./patterns/RATE_LIMITING_PATTERNS.md) | Tier limits, quotas, middleware |
| [patterns/VALIDATION_PATTERNS.md](./patterns/VALIDATION_PATTERNS.md) | Joi schemas, sanitization |
| [patterns/REALTIME_PATTERNS.md](./patterns/REALTIME_PATTERNS.md) | Supabase Realtime, SSE, progressive loading |
| [patterns/PAGINATION_PATTERNS.md](./patterns/PAGINATION_PATTERNS.md) | Offset vs cursor, infinite scroll |
| [patterns/LOGGING_AUDIT_PATTERNS.md](./patterns/LOGGING_AUDIT_PATTERNS.md) | Structured logging, PII protection |

### Testing Guides

| Document | Description |
|----------|-------------|
| [testing/API_TESTING_GUIDE.md](./testing/API_TESTING_GUIDE.md) | Unit, integration, contract, load, security tests |

### Troubleshooting Guides

| Document | Description |
|----------|-------------|
| [troubleshooting/COMMON_ERRORS.md](./troubleshooting/COMMON_ERRORS.md) | Error code quick reference |
| [troubleshooting/PERFORMANCE_ISSUES.md](./troubleshooting/PERFORMANCE_ISSUES.md) | Latency diagnosis, optimization |
| [troubleshooting/REALTIME_ISSUES.md](./troubleshooting/REALTIME_ISSUES.md) | Supabase Realtime, SSE debugging |
| [troubleshooting/WIZED_INTEGRATION.md](./troubleshooting/WIZED_INTEGRATION.md) | Wized Embed 2.0 integration |
| [troubleshooting/ASSET_GENERATION.md](./troubleshooting/ASSET_GENERATION.md) | Story asset generation issues |

---

## API Categories

### Core APIs
1. **Authentication** - Login, register, refresh, logout
2. **Stories** - CRUD operations with pagination
3. **Characters** - Character management
4. **Libraries** - Child profile libraries

### Sharing & Collaboration
5. **Transfers** - Story/character transfers between libraries
6. **Invitations** - Friend invites, library access

### Personalization
7. **User Preferences** - Settings, accessibility
8. **Notification Center** - In-app notifications
9. **Push Notifications** - Device registration

### Content & Media
10. **Audio & Narration** - Voice synthesis, WebVTT
11. **Asset Management** - Generation, status, retry
12. **Search & Discovery** - Universal search
13. **Tags & Collections** - Organization
14. **Favorites & Bookmarks** - Quick access

### Intelligence
15. **Emotion Intelligence** - Check-ins, patterns, insights
16. **Smart Home (Hue)** - Philips Hue integration

### Dashboard
17. **Parent Dashboard** - Overview for parents

### Business
18. **Password Management** - Reset flows
19. **B2B Organizations** - Seat management, shared libraries
20. **Affiliate Program** - Referrals, earnings
21. **Export & Import** - Data portability

### Administration
22. **Admin APIs** - Monitoring, audit, support tools

---

## Key Features

### Progressive Loading
Assets generate in the background with real-time UI updates via Supabase Realtime.

### Tier-Based Generation
Assets auto-generate based on subscription:
- **Free**: Art only
- **Starter**: Art, Audio
- **Family**: Art, Audio, Activities
- **Premium**: All assets

### Wized Integration
All endpoints are designed for seamless Wized Embed 2.0 integration.

---

## Getting Started

### 1. Authentication

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password"
}
```

### 2. Create a Story

```http
POST /api/v1/libraries/{libraryId}/stories
Authorization: Bearer {token}

{
  "title": "My Adventure",
  "characterId": "uuid",
  "storyType": "adventure"
}
```

### 3. Subscribe to Progress

```javascript
const channel = supabase
  .channel(`story:${storyId}`)
  .on('postgres_changes', { ... }, updateUI)
  .subscribe();
```

---

## Support

- **Issues**: GitHub Issues
- **Status**: https://status.storytailor.com
- **Contact**: support@storytailor.com

---

**Version**: 1.0  
**Last Updated**: December 23, 2025  
**Powered by Story Intelligence™**

