Status: Draft  
Audience: Internal  
Last-Updated: 2025-12-13  
Owner: Documentation Team  
Verified-Against-Code: Yes  
Doc-ID: AUTO  
Notes: Phase 0.5 - API endpoints inventory from RESTAPIGateway.ts

# API Endpoints Inventory

## Overview

This document inventories all REST API endpoints exposed by the Universal Agent's REST API Gateway, extracted from the source code.

## Verification Method

**Source:** `packages/universal-agent/src/api/RESTAPIGateway.ts`

**Status:** ✅ Code analyzed - Endpoints verified from actual implementation

## Endpoint Organization

Endpoints are organized by route groups set up in `setupRoutes()` method (lines 537-619).

## Health and Documentation

| Method | Path | Handler Function | Purpose | Auth Required | Code Location |
|--------|------|------------------|---------|--------------|---------------|
| GET | `/health` | Anonymous function | Health check | No | Line 539 |
| GET | `/docs` | Anonymous function | API documentation | No | Line 550 |

## Conversation Endpoints (`/v1/conversation`)

| Method | Path | Handler Function | Purpose | Auth Required | Request Schema | Response Schema | Code Location |
|--------|------|------------------|---------|--------------|----------------|----------------|---------------|
| POST | `/v1/conversation/start` | Anonymous async function | Start conversation | Yes | platform, language, voiceEnabled, smartHomeEnabled, parentalControls, privacySettings, customization | Session object | Line 625 |
| POST | `/v1/conversation/message` | Anonymous async function | Send message | Yes | sessionId, message (type, content, metadata) | Response object | Line 660 |
| POST | `/v1/conversation/batch` | Anonymous async function | Batch message processing | Yes | messages[] (max 10) | Results array | Line 686 |
| POST | `/v1/conversation/stream` | Anonymous async function | Stream message response | Yes | sessionId, message | Stream chunks | Line 715 |
| POST | `/v1/conversation/voice` | Anonymous async function | Voice message processing | Yes | sessionId, audioData | Audio response | Line 738 |
| GET | `/v1/conversation/:sessionId/analytics` | Anonymous async function | Get conversation analytics | Yes | sessionId (path param) | Analytics object | Line 761 |
| POST | `/v1/conversation/end` | Anonymous async function | End conversation | Yes | sessionId | Success response | Line 771 |
| GET | `/v1/conversation` | Anonymous async function | List conversations | Yes | Query params: limit, offset | Conversations array | Line 794 |

## Story Endpoints (`/v1/stories`)

| Method | Path | Handler Function | Purpose | Auth Required | Request Schema | Response Schema | Code Location |
|--------|------|------------------|---------|--------------|----------------|----------------|---------------|
| GET | `/v1/stories` | Anonymous async function | List stories | Yes | Query: libraryId, status, createdAfter, createdBefore, limit, offset | Stories array | Line 794 |
| GET | `/v1/stories/:storyId` | Anonymous async function | Get story | Yes | storyId (path param), includeAssets (query) | Story object | Line 814 |
| POST | `/v1/stories` | Anonymous async function | Create story | Yes | character, storyType, libraryId, generateAssets | Story object | Line 825 |
| POST | `/v1/stories/bulk` | Anonymous async function | Bulk story operations | Yes | operation, stories[] (max 20) | Results array | Line 851 |
| POST | `/v1/stories/:storyId/assets` | Anonymous async function | Generate assets | Yes | storyId (path), assetTypes[], regenerate | Assets object | Line 864 |
| GET | `/v1/stories/:storyId/export` | Anonymous async function | Export story | Yes | storyId (path), format (query) | Exported content | Line 885 |

## Character Endpoints (`/v1/characters`)

| Method | Path | Handler Function | Purpose | Auth Required | Request Schema | Response Schema | Code Location |
|--------|------|------------------|---------|--------------|----------------|----------------|---------------|
| GET | `/v1/characters` | Anonymous async function | List characters | Yes | Query: libraryId, species, ageRange, limit, offset | Characters array | Line 910 |
| POST | `/v1/characters` | Anonymous async function | Create character | Yes | name, traits, libraryId, generateArt | Character object | Line 928 |
| GET | `/v1/characters/templates` | Anonymous async function | Get character templates | Yes | None | Templates array | Line 961 |

## Authentication Endpoints (`/v1/auth`)

**Note:** Auth routes are partially handled by `AuthRoutes` class (mounted at line 1027) and partially by direct router setup.

| Method | Path | Handler Function | Purpose | Auth Required | Request Schema | Response Schema | Code Location |
|--------|------|------------------|---------|--------------|----------------|----------------|---------------|
| POST | `/v1/auth/register` | AuthRoutes (mounted) | User registration | No | email, password, age, parentEmail | Auth response | Line 1027 (AuthRoutes) |
| POST | `/v1/auth/login` | AuthRoutes (mounted) | User login | No | email, password | Auth response | Line 1027 (AuthRoutes) |
| POST | `/v1/auth/authenticate` | Anonymous async function | Authenticate user | No | platform, credentials | Auth result | Line 1040 |
| POST | `/v1/auth/link` | Anonymous async function | Link account | No | Account linking data | Link result | Line 1053 |
| GET | `/v1/auth/profile` | Anonymous async function | Get user profile | Yes | None | User profile | Line 1064 |

## Smart Home Endpoints (`/v1/smarthome`)

| Method | Path | Handler Function | Purpose | Auth Required | Request Schema | Response Schema | Code Location |
|--------|------|------------------|---------|--------------|----------------|----------------|---------------|
| POST | `/v1/smarthome/connect` | Anonymous async function | Connect device | Yes | deviceType, roomId, deviceConfig | Connection object | Line 1083 |
| GET | `/v1/smarthome/devices` | Anonymous async function | List devices | Yes | None | Devices array | Line 1108 |
| POST | `/v1/smarthome/control` | Anonymous async function | Control device | Yes | deviceId, action | Control result | Line 1118 |

## Webhook Endpoints (`/v1/webhooks`)

| Method | Path | Handler Function | Purpose | Auth Required | Request Schema | Response Schema | Code Location |
|--------|------|------------------|---------|--------------|----------------|----------------|---------------|
| POST | `/v1/webhooks` | Anonymous async function | Create webhook | Yes | url, events[], secret, retryPolicy, timeout, headers | Webhook object (secret masked) | Line 1137 |
| GET | `/v1/webhooks` | Anonymous async function | List webhooks | Yes | None | Webhooks array (secrets masked) | Line 1164 |
| GET | `/v1/webhooks/:webhookId/deliveries` | Anonymous async function | Get delivery history | Yes | webhookId (path), limit (query) | Deliveries array | Line 1179 |
| PUT | `/v1/webhooks/:webhookId` | Anonymous async function | Update webhook | Yes | webhookId (path), url, events, secret, isActive, retryPolicy, timeout, headers | Webhook object | Line 1190 |
| DELETE | `/v1/webhooks/:webhookId` | Anonymous async function | Delete webhook | Yes | webhookId (path) | Success response | Line 1213 |
| POST | `/v1/webhooks/:webhookId/test` | Anonymous async function | Test webhook | Yes | webhookId (path) | Test result | Line 1223 |
| GET | `/v1/webhooks/verify` | Anonymous function | Webhook verification | No | challenge (query) | Challenge string | Line 1233 |

**Code References:**
- `packages/universal-agent/src/api/RESTAPIGateway.ts:1133-1243`

## Analytics Endpoints (`/v1/analytics`)

| Method | Path | Handler Function | Purpose | Auth Required | Request Schema | Response Schema | Code Location |
|--------|------|------------------|---------|--------------|----------------|----------------|---------------|
| GET | `/v1/analytics/usage` | Anonymous async function | Get usage analytics | Yes | timeRange (query) | Usage analytics | Line 1249 |
| GET | `/v1/analytics/conversations` | Anonymous async function | Get conversation analytics | Yes | None | Conversation analytics | Line 1260 |
| GET | `/v1/analytics/stories` | Anonymous async function | Get story analytics | Yes | None | Story analytics | Line 1270 |

## Developer Endpoints (`/developer`)

| Method | Path | Handler Function | Purpose | Auth Required | Request Schema | Response Schema | Code Location |
|--------|------|------------------|---------|--------------|----------------|----------------|---------------|
| GET | `/developer/dashboard` | Anonymous async function | Developer dashboard | Yes | None | Dashboard data | Line 1286 |
| POST | `/developer/api-keys` | Anonymous async function | Create API key | Yes | name, permissions[], rateLimit, expiresAt | API key (full key only on creation) | Line 1296 |
| GET | `/developer/api-keys` | Anonymous async function | List API keys | Yes | None | API keys array (keys masked) | Line 1318 |
| DELETE | `/developer/api-keys/:keyId` | Anonymous async function | Revoke API key | Yes | keyId (path) | Success response | Line 1333 |

**Code References:**
- `packages/universal-agent/src/api/RESTAPIGateway.ts:1282-1342`

## Localization Endpoints (`/v1/localization`)

| Method | Path | Handler Function | Purpose | Auth Required | Request Schema | Response Schema | Code Location |
|--------|------|------------------|---------|--------------|----------------|----------------|---------------|
| GET | `/v1/localization/languages` | Anonymous async function | Get supported languages | Yes | None | Languages array | Line 1371 |
| GET | `/v1/localization/cultural-context` | Anonymous async function | Get cultural context | Yes | None | Cultural context | Line 1381 |
| PUT | `/v1/localization/cultural-context` | Anonymous async function | Update cultural context | Yes | primaryLanguage, secondaryLanguages, culturalBackground, religiousConsiderations, familyStructure, celebrationsAndHolidays, storytellingTraditions | Cultural context | Line 1391 |
| POST | `/v1/localization/localize` | Anonymous async function | Localize content | Yes | content, contentType, targetLanguage, preserveOriginalMeaning, adaptForCulture | Localized content | Line 1409 |
| POST | `/v1/localization/switch-language` | Anonymous async function | Switch language | Yes | currentLanguage, targetLanguage, storyContext, characterContext, switchReason | Switch result | Line 1428 |
| GET | `/v1/localization/storytelling-traditions` | Anonymous async function | Get storytelling traditions | Yes | culturalBackground (query) | Traditions array | Line 1447 |
| POST | `/v1/localization/holiday-story` | Anonymous async function | Create holiday story | Yes | holiday, userAge, theme | Holiday story | Line 1458 |
| GET | `/v1/localization/seasonal-calendar` | Anonymous async function | Get seasonal calendar | Yes | None | Seasonal calendar | Line 1481 |

## Therapeutic Group Endpoints (`/v1/therapeutic-groups`)

| Method | Path | Handler Function | Purpose | Auth Required | Request Schema | Response Schema | Code Location |
|--------|------|------------------|---------|--------------|----------------|----------------|---------------|
| POST | `/v1/therapeutic-groups/groups` | Anonymous async function | Create therapeutic group | Yes | name, ageRange, therapeuticFocus, maxParticipants | Group object | Line 1525 |
| GET | `/v1/therapeutic-groups/groups` | Anonymous async function | List groups | Yes | Query filters | Groups array | Line 1579 |
| GET | `/v1/therapeutic-groups/groups/:groupId` | Anonymous async function | Get group | Yes | groupId (path) | Group object | Line 1599 |
| POST | `/v1/therapeutic-groups/groups/:groupId/participants` | Anonymous async function | Add participant | Yes | groupId (path), participant data | Participant object | Line 1626 |
| POST | `/v1/therapeutic-groups/groups/:groupId/sessions` | Anonymous async function | Create session | Yes | groupId (path), session data | Session object | Line 1664 |
| GET | `/v1/therapeutic-groups/groups/:groupId/metrics` | Anonymous async function | Get group metrics | Yes | groupId (path) | Metrics object | Line 1713 |
| GET | `/v1/therapeutic-groups/participants/:participantId/progress` | Anonymous async function | Get participant progress | Yes | participantId (path) | Progress object | Line 1742 |
| POST | `/v1/therapeutic-groups/participants/:participantId/communication` | Anonymous async function | Send communication | Yes | participantId (path), communication data | Communication result | Line 1787 |
| GET | `/v1/therapeutic-groups/dashboard` | Anonymous async function | Get dashboard | Yes | None | Dashboard data | Line 1823 |
| POST | `/v1/therapeutic-groups/participants/:participantId/flag-concern` | Anonymous async function | Flag concern | Yes | participantId (path), concern data | Concern response | Line 1853 |
| POST | `/v1/therapeutic-groups/participants/:participantId/assess-root-cause` | Anonymous async function | Assess root cause | Yes | participantId (path), assessment data | Assessment result | Line 1915 |
| POST | `/v1/therapeutic-groups/participants/:participantId/refer` | Anonymous async function | Create referral | Yes | participantId (path), referral data | Referral object | Line 1969 |
| GET | `/v1/therapeutic-groups/participants/:participantId/emotional-insights` | Anonymous async function | Get emotional insights | Yes | participantId (path), timeRange (query) | Insights object | Line 2010 |

## Partner Integration Endpoints (`/v1/partner`)

| Method | Path | Handler Function | Purpose | Auth Required | Request Schema | Response Schema | Code Location |
|--------|------|------------------|---------|--------------|----------------|----------------|---------------|
| GET | `/v1/partner/integrations` | Anonymous async function | List integrations | Yes | None | Integrations array | Line 2179 |
| POST | `/v1/partner/integrations/:integrationId/connect` | Anonymous async function | Connect integration | Yes | integrationId (path), credentials, config | Connection result | Line 2225 |
| POST | `/v1/partner/integrations/:integrationId/disconnect` | Anonymous async function | Disconnect integration | Yes | integrationId (path) | Disconnect result | Line 2248 |
| GET | `/v1/partner/integrations/:integrationId/status` | Anonymous async function | Get integration status | Yes | integrationId (path) | Status object | Line 2267 |
| GET | `/v1/partner/oauth/:provider/start` | Anonymous async function | Start OAuth flow | Yes | provider (path) | OAuth URL and state | Line 2283 |
| GET | `/v1/partner/oauth/:provider/callback` | Anonymous async function | OAuth callback | Yes | provider (path), code, state (query) | OAuth result | Line 2301 |
| POST | `/v1/partner/integrations/:integrationId/test` | Anonymous async function | Test integration | Yes | integrationId (path) | Test result | Line 2318 |
| GET | `/v1/partner/integrations/:integrationId/webhooks` | Anonymous async function | Get integration webhooks | Yes | integrationId (path) | Webhooks array | Line 2335 |
| POST | `/v1/partner/integrations/:integrationId/webhooks` | Anonymous async function | Create integration webhook | Yes | integrationId (path), webhook config | Webhook object | Line 2350 |

## WebVTT Endpoints (`/v1/webvtt`)

**Note:** WebVTT routes are set up via `WebVTTRoutes` class (line 1354).

**Code Reference:**
- `packages/universal-agent/src/api/RESTAPIGateway.ts:1350-1357`
- `packages/universal-agent/src/api/WebVTTRoutes.ts` (separate file)

## GraphQL Endpoint

**Endpoint:** `/graphql`

**Setup:** Line 109 (setupGraphQL method)

**Code Reference:**
- `packages/universal-agent/src/api/RESTAPIGateway.ts:109`

## WebSocket Endpoint

**Endpoint:** `ws://host/ws`

**Setup:** Line 110 (setupWebSocket method)

**Code Reference:**
- `packages/universal-agent/src/api/RESTAPIGateway.ts:110, 2507-2576`

## Swagger Documentation

**Endpoint:** `/api-docs`

**Setup:** Line 111 (setupSwaggerDocs method)

**Code Reference:**
- `packages/universal-agent/src/api/RESTAPIGateway.ts:111, 2501-2505`

## Endpoint Summary

### By Method

- **GET:** 25+ endpoints
- **POST:** 30+ endpoints
- **PUT:** 2 endpoints (webhook update, cultural context update)
- **DELETE:** 2 endpoints (webhook delete, API key revoke)

### By Route Group

- **Conversation:** 8 endpoints
- **Stories:** 6 endpoints
- **Characters:** 3 endpoints
- **Auth:** 5+ endpoints (some via AuthRoutes)
- **Smart Home:** 3 endpoints
- **Webhooks:** 7 endpoints
- **Analytics:** 3 endpoints
- **Developer:** 4 endpoints
- **Localization:** 8 endpoints
- **Therapeutic Groups:** 13 endpoints
- **Partner Integration:** 9 endpoints
- **WebVTT:** Unknown (via WebVTTRoutes class)
- **Health/Docs:** 2 endpoints

### Total Endpoint Count

**Estimated:** 60+ REST API endpoints

**Verified:** 65+ route definitions found in code

## Authentication

### Public Endpoints (No Auth Required)

- `GET /health`
- `GET /docs`
- `POST /v1/auth/register`
- `POST /v1/auth/login`
- `GET /v1/webhooks/verify`

### Authenticated Endpoints (Auth Required)

All other endpoints require authentication via:
- JWT Bearer token (`Authorization: Bearer <token>`)
- API Key (`Authorization: Bearer <api-key>` or `X-API-Key: <api-key>`)

**Code Reference:**
- `packages/universal-agent/src/api/RESTAPIGateway.ts:320-536` - Authentication middleware

## Request Validation

All POST/PUT endpoints use Joi schema validation via `validateRequest()` method.

**Code Reference:**
- `packages/universal-agent/src/api/RESTAPIGateway.ts:2580-2593`

## Error Handling

All endpoints use centralized error handler.

**Code Reference:**
- `packages/universal-agent/src/api/RESTAPIGateway.ts:618` - Error handler middleware

## Gaps Identified

1. **WebVTT Endpoints:** Not fully documented (handled by WebVTTRoutes class)
2. **GraphQL Schema:** GraphQL schema not extracted
3. **WebSocket Messages:** WebSocket message types not fully documented
4. **AuthRoutes Endpoints:** AuthRoutes class endpoints not fully extracted
5. **Response Schemas:** Response schemas not fully documented for all endpoints

TAG: RISK  
TODO[ENGINEERING]: Extract WebVTT endpoints from WebVTTRoutes class  
TODO[ENGINEERING]: Document GraphQL schema  
TODO[ENGINEERING]: Document WebSocket message types  
TODO[ENGINEERING]: Extract AuthRoutes endpoints  
TODO[ENGINEERING]: Document response schemas for all endpoints
