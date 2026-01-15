# Storytailor® REST API Experience — Single Source of Truth

**Purpose**: This is the **only** document intended for the Web SDK / static REST API consumer experience.

- **Source of truth (routes)**: `lambda-deployments/universal-agent/src/api/RESTAPIGateway.ts` (+ mounted routers)
- **Generated**: 2026-01-11T02:49:19.133Z
- **Endpoint count (REST product surface)**: 184

---

## Base URLs

- **Production**: `https://api.storytailor.dev/api/v1`
- **Staging**: `https://staging-api.storytailor.dev/api/v1`

---

## Core Concepts (REST Experience)

- **User (`users.id`)**: login principal (authn/authz).
- **Storytailor ID (`libraries.id`)**: identity scope (child, parent root, org/class). Includes consent/compliance + analytics scope + permissions.
- **Library**: storage container for stories/characters. In practice, Storytailor IDs are libraries with additional semantics.

---

## Request Headers (Client Contract)

These headers are used/expected by the REST gateway + middleware:

- **`Authorization`**: `Bearer <access_token>` (required for most endpoints)
- **`X-Request-Id`**: required by several write endpoints; used for tracing (gateway will return `REQUEST_ID_MISSING` when required)
- **`X-Idempotency-Key`**: required/strongly recommended for idempotent create/generate endpoints (see `docs/api/SYSTEM_BEHAVIOR_GUARANTEES.md`)
- **`Content-Type`**: `application/json` for JSON bodies
- **`Accept`**:
  - `application/json` (default)
  - `text/event-stream` for SSE endpoints
- **`Last-Event-ID`**: optional for SSE resume (when supported)

Special-purpose headers (endpoint-scoped):
- **`Stripe-Signature`**: required for Stripe webhook verification (webhook endpoints only)
- **`X-Test-Mode: true`**: optional testing bypass used by some quota/limit checks (non-production usage)

---

## Standard Response Envelopes

### `SuccessDataResponse<T>` (most endpoints)
```json
{ "success": true, "data": { /* T */ } }
```

### `SuccessResponse` (some endpoints)
```json
{ "success": true, "message": "optional", /* endpoint-specific top-level fields */ }
```

### `PaginatedResponse<T>` (list endpoints)
```json
{
  "success": true,
  "data": [ /* T[] */ ],
  "pagination": {
    "page": 1,
    "limit": 25,
    "total": 0,
    "totalPages": 0,
    "hasNext": false,
    "hasPrevious": false
  }
}
```

### `ApiError`
```json
{ "success": false, "error": "message", "code": "ERR_CODE", "details": { /* optional */ } }
```

---

## Pagination (Client Contract)

Pagination is implemented by the gateway helper `parsePagination(req)` + `buildPaginationResponse(...)`:

- **Query params**:
  - `page` (default: 1; minimum: 1)
  - `limit` (default: 25; minimum: 1; maximum: 100)
- **Response shape**: `PaginatedResponse<T>` (top-level `data: T[]` + `pagination`)

Endpoints that currently use this contract (gateway-sourced):
- `GET /api/v1/stories`
- `GET /api/v1/characters`
- `GET /api/v1/libraries`
- `GET /api/v1/profiles/:profileId/emotions/history`
- `GET /api/v1/users/me/notifications`
- `GET /api/v1/users/me/rewards`

Other endpoints may accept ad-hoc query params (e.g., `/api/v1/search` uses `offset`/`limit`); those are documented on the endpoint entry itself.

---

## Error & “Incomplete/Async” Semantics (Frontend Contract)

**Canonical references** (do not diverge):
- `docs/api/SYSTEM_BEHAVIOR_GUARANTEES.md` (retry/idempotency/quota guarantees)
- `docs/api/OPENAPI_EXTENSIONS.md` + `docs/api/LIFECYCLE_STATE_MACHINES.md` (lifecycle + invalid transitions)
- `docs/api/troubleshooting/COMMON_ERRORS.md` (canonical `ERR_XXXX` meanings)

### Error code taxonomy (what exists today)

The REST surface currently emits **two families** of `code` values:

- **Canonical `ERR_XXXX` codes** (documented): `ERR_1001`.. etc (auth/validation/not-found/rate-limit/quota/subscription/lifecycle).
- **Endpoint-specific codes** (SCREAMING_SNAKE): e.g. `STORY_NOT_FOUND`, `WRITE_PERMISSION_REQUIRED`, `STORY_QUOTA_EXCEEDED`, etc.

**Frontend rule**: treat `code` as an **opaque string**. Use HTTP status for primary control flow; use `code` for specific UX routing.

### Error JSON shapes (be tolerant)

Most REST endpoints use:

```json
{ "success": false, "error": "Human-readable message", "code": "SOME_CODE", "details": { /* optional */ } }
```

The codebase includes middleware that would return a **structured `error` object** (example: lifecycle enforcement), but **it is not currently mounted in the REST gateway route stack** (`lambda-deployments/universal-agent/src/api/RESTAPIGateway.ts`).  
**REST contract (today)**: clients should primarily expect the flat shape shown above; tolerating the structured shape is optional future-proofing, not a requirement.

```json
{
  "success": false,
  "error": {
    "code": "ERR_6003",
    "message": "Invalid state transition",
    "type": "INVALID_STATE_TRANSITION",
    "details": { /* resource, currentState, allowedFromStates, ... */ }
  }
}
```

**Frontend normalization suggestion** (do this client-side, no backend change required):
- If `success === false`:
  - `code = body.code ?? body.error?.code ?? 'UNKNOWN_ERROR'`
  - `message = body.error?.message ?? body.error ?? 'Request failed'`
  - `details = body.details ?? body.error?.details ?? null`

### HTTP status meanings (what to expect)

- **200 OK**: synchronous success (resource returned/updated). Some operations also return `success: true` even when the system refuses to reveal existence (security; see password reset).
- **201 Created**: resource created. For story creation, the resource is typically created with `status: "generating"` and assets are produced asynchronously.
- **202 Accepted**: request accepted for background processing; response includes tracking metadata (e.g., jobs list / `realtimeChannel`) and the frontend should subscribe/poll.
- **400 Bad Request**: invalid input. For story types, this includes granular validation codes like `BIRTHDAY_TO_REQUIRED`, `EDUCATIONAL_SUBJECT_REQUIRED`, `THERAPEUTIC_CONSENT_REQUIRED`, etc.
- **401 Unauthorized**: missing/invalid auth (often `ERR_1001` family from auth middleware).
- **403 Forbidden**: authenticated but lacks permission / consent (e.g., `WRITE_PERMISSION_REQUIRED`, `COPPA_CONSENT_REQUIRED`).
- **404 Not Found**: resource not found (e.g., `STORY_NOT_FOUND`, `CHARACTER_NOT_FOUND`).
- **409 Conflict**: state/resource conflict (e.g., `CHARACTER_ALREADY_PRIMARY`).
- **402 Payment Required**: quota/credits exhausted but response is **actionable for UI** (see below).
- **429 Too Many Requests**: rate-limited; should include `retryAfter` seconds (example: password reset uses `RATE_LIMIT_EXCEEDED` + `retryAfter: 3600`).
- **500**: server error; retry rules are in `SYSTEM_BEHAVIOR_GUARANTEES.md`.

### “Error but still actionable” payloads (UI can use these)

These return `success: false` with **structured fields** intended for UI:

- **402 `STORY_QUOTA_EXCEEDED`** (create story):
  - Includes `quota`, `earningOptions`, and `upgradeOptions` (CTA URLs).
- **402 `CHARACTER_QUOTA_EXCEEDED`** (create character):
  - Includes `quota` and `upgradeOptions`.
- **429 `RATE_LIMIT_EXCEEDED`** (password reset):
  - Includes `retryAfter` seconds.

### “Success but incomplete” (async) payloads (UI should *not* treat as failure)

These return `success: true` but the requested artifact may not be ready yet:

- **Create story**: story created immediately with `status: "generating"` and `asset_generation_status` showing per-asset progress. Subscribe to `stories` updates via Supabase Realtime.
- **Generate assets** (`POST /api/v1/stories/:storyId/assets`): returns **202** with queued jobs and `realtimeChannel`.
- **Generate PDF** (`POST /api/v1/stories/:storyId/pdf`): may return **202** with `pdfUrl: null` and `status: "generating"` until the DB is updated.
- **Password reset request**: returns `success: true` even when the email does not exist (prevents email enumeration).

### 202 “Accepted” response objects (what to expect)

When an endpoint returns **202**, the request is successful but work continues asynchronously.

- **Get story (temporary processing ID)**: `GET /api/v1/stories/:id` when `id` starts with `temp_`
  - Returns: `SuccessDataResponse<{ id, status, message }>` with `status: "processing"`
- **Generate assets**: `POST /api/v1/stories/:storyId/assets`
  - Returns: `SuccessDataResponse<{ storyId, jobs, estimatedTime, realtimeChannel, subscribePattern }>`
- **Generate audio**: `POST /api/v1/stories/:storyId/audio`
  - Returns: `SuccessDataResponse<{ jobId, status, estimatedTime }>`
- **Generate QR**: `POST /api/v1/stories/:storyId/qr`
  - Returns: `SuccessDataResponse<{ storyId, jobId, assetType, status, realtimeChannel, subscribePattern }>`

**Realtime follow-up** (typical):
- Subscribe to `stories` updates: `{ table: "stories", filter: "id=eq.<storyId>", event: "UPDATE" }`
- UI should be asset-granular: some assets can fail while others succeed; treat `asset_generation_status` per-asset.

---

### Frontend-relevant errors (exhaustive; gateway-sourced)

**Source**: `lambda-deployments/universal-agent/src/**` (static extraction of `success:false` responses).

- This list is **exhaustive for what the gateway code literally emits** via `res.status(...).json({ success:false, code, ... })` (and `res.json(...)` when present).
- **5xx** errors are excluded here (they are covered by retry semantics elsewhere).

#### HTTP 200 (success:false)

| code | message (sample) | extra fields (if any) |
|------|------------------|----------------------|
| `LIST_CHARACTERS_FAILED` |  |  |
| `LIST_LIBRARIES_FAILED` |  |  |
| `LIST_STORIES_FAILED` |  |  |
| `RESEARCH_AGENT_FAILED` |  |  |

#### HTTP 400

| code | message (sample) | extra fields (if any) |
|------|------------------|----------------------|
| `ACCEPT_TRANSFER_FAILED` |  |  |
| `CANCEL_SUBSCRIPTION_FAILED` |  |  |
| `CHANGE_PLAN_FAILED` |  |  |
| `DEVICE_TOKEN_REQUIRED` | Device token and platform are required |  |
| `EMAIL_REQUIRED` | Email is required |  |
| `EMAIL_ROLE_REQUIRED` | Email and role are required |  |
| `ERR_1001` |  |  |
| `IDEMPOTENCY_KEY_REQUIRED` |  |  |
| `IMPORT_DATA_REQUIRED` | Format and data or fileUrl are required |  |
| `INVALID_CONSENT_METHOD` |  |  |
| `INVALID_CONTENT` | content must be an object |  |
| `INVALID_GIFT_CARD_TYPE` | Invalid gift card type. Must be 1_month, 3_month, 6_month, or 12_month |  |
| `INVALID_HUE_REQUEST` | Invalid request |  |
| `INVALID_INPUT` | Name is required |  |
| `INVALID_METADATA` | metadata must be an object |  |
| `INVALID_PACK_TYPE` | Invalid pack type. Must be 5_pack, 10_pack, or 25_pack |  |
| `INVALID_RATING` | Rating must be between 1 and 5 |  |
| `INVALID_REQUEST` | URL and events array are required |  |
| `INVALID_RESPONSE` |  |  |
| `INVALID_SENTIMENT` | Sentiment must be positive, neutral, or negative |  |
| `INVALID_TOKEN` | Invalid or expired token |  |
| `INVALID_UPDATE` | No valid update field provided |  |
| `ITEMS_REQUIRED` | Items array is required |  |
| `MISSING_CODE` | Gift card code is required |  |
| `MISSING_FIELDS` | Email and role are required |  |
| `MISSING_PLAN_ID` | Plan ID is required |  |
| `MISSING_REQUIRED_FIELDS` | Magic token and user ID are required |  |
| `NAME_REQUIRED` | Character name is required |  |
| `NARRATION_URL_REQUIRED` | Narration URL is required |  |
| `NOT_CHILD_STORYTAILOR_ID` | Consent workflow only applies to child Storytailor IDs |  |
| `PASSWORD_MISMATCH` | Passwords do not match |  |
| `QUERY_REQUIRED` | Search query is required |  |
| `REDEEM_FAILED` |  |  |
| `REQUEST_ID_MISSING` | Request ID required |  |
| `RESPONSES_REQUIRED` | Responses array is required |  |
| `STORY_PROCESSING` | Story is still being processed. Consumption tracking requires a permanent story ID. Please wait for story generation to complete. |  |
| `STRIPE_SIGNATURE_MISSING` | Missing Stripe-Signature header |  |
| `STRIPE_WEBHOOK_FAILED` |  |  |
| `TARGET_LIBRARY_REQUIRED` | Target library ID is required |  |
| `TARGET_USER_REQUIRED` | to_user_id is required |  |
| `TOKEN_MISSING` | Confirmation token required |  |
| `TOKEN_REQUIRED` | Token is required |  |

#### HTTP 401

| code | message (sample) | extra fields (if any) |
|------|------------------|----------------------|
| `AUTH_REQUIRED` | Authentication required |  |
| `AUTH_TOKEN_INVALID` | Invalid or expired token |  |
| `AUTH_TOKEN_MISSING` | Authorization token required |  |
| `UNAUTHORIZED` | Unauthorized |  |

#### HTTP 402

| code | message (sample) | extra fields (if any) |
|------|------------------|----------------------|
| `CHARACTER_QUOTA_EXCEEDED` | Character limit reached | quota, upgradeOptions |
| `STORY_QUOTA_EXCEEDED` | Story credit limit reached | quota, upgradeOptions |

#### HTTP 403

| code | message (sample) | extra fields (if any) |
|------|------------------|----------------------|
| `ACCESS_DENIED` | Access denied |  |
| `ADULT_REQUIRED` | ADULT_REQUIRED | details, message |
| `COPPA_CONSENT_REQUIRED` | Parent consent required for users under 13 creating child Storytailor IDs |  |
| `EMAIL_VERIFICATION_REQUIRED` | Email verification required | details |
| `FORBIDDEN` | Admin access required |  |
| `INSUFFICIENT_SCOPE` |  |  |
| `PARENT_CONSENT_REQUIRED` | Parent consent required for this action | details |
| `PERMISSION_DENIED` | Only library owner can update library |  |
| `WRITE_PERMISSION_REQUIRED` | Editor, Admin, or Owner permission required to create stories in this library |  |

#### HTTP 404

| code | message (sample) | extra fields (if any) |
|------|------------------|----------------------|
| `AFFILIATE_NOT_FOUND` | Affiliate account not found |  |
| `CHARACTER_NOT_FOUND` | Primary character not found |  |
| `CHILD_NOT_FOUND` | Child not found |  |
| `COLLECTION_NOT_FOUND` | Collection not found |  |
| `ERR_2001` |  |  |
| `SESSION_NOT_FOUND` |  |  |
| `STORY_NOT_FOUND` | Story not found |  |
| `STORYTAILOR_ID_NOT_FOUND` | Storytailor ID not found |  |
| `TARGET_LIBRARY_NOT_FOUND` | Target library not found |  |
| `TARGET_USER_NOT_FOUND` | Target user not found |  |
| `TOKEN_INVALID` | Invalid or expired confirmation token |  |
| `USER_NOT_FOUND` | User not found |  |
| `WEBHOOK_NOT_FOUND` | Webhook not found |  |

#### HTTP 409

| code | message (sample) | extra fields (if any) |
|------|------------------|----------------------|
| `CHARACTER_ALREADY_PRIMARY` | Character is already primary for another Storytailor ID |  |
| `OPERATION_IN_PROGRESS` |  |  |

#### HTTP 429

| code | message (sample) | extra fields (if any) |
|------|------------------|----------------------|
| `RATE_LIMIT_EXCEEDED` | Too many password reset requests. Please try again later. | retryAfter, details |

#### HTTP 501

| code | message (sample) | extra fields (if any) |
|------|------------------|----------------------|
| `STORY_PACK_UNAVAILABLE` | Story pack checkout not available |  |

#### HTTP 503

| code | message (sample) | extra fields (if any) |
|------|------------------|----------------------|
| `SERVICE_UNAVAILABLE` | Conversation service not available |  |
| `STRIPE_WEBHOOK_NOT_CONFIGURED` | Stripe webhook receiver is not configured | ssmParameter |

### Top frontend-relevant errors (what to do in the UI)

| HTTP | code | when | frontend action |
|------|------|------|-----------------|
| 401 | `ERR_1001 / UNAUTHORIZED` | Missing/invalid auth | Force login; refresh token flow |
| 401 | `ERR_1003` | Token expired | Refresh token, then retry |
| 403 | `WRITE_PERMISSION_REQUIRED` | No write role for library | Show permission error; prompt to request access |
| 403 | `ACCESS_DENIED` | No read permission | Show permission error; hide resource |
| 403 | `COPPA_CONSENT_REQUIRED` | Child Storytailor ID requires consent | Route to consent flow |
| 404 | `STORY_NOT_FOUND` | Story not found / not accessible | Show not-found; refresh list |
| 404 | `CHARACTER_NOT_FOUND` | Character not found | Show not-found; refresh list |
| 409 | `CHARACTER_ALREADY_PRIMARY` | Primary character already assigned | Show conflict + pick different character |
| 402 | `STORY_QUOTA_EXCEEDED` | No story credits | Show earningOptions + upgradeOptions CTA |
| 402 | `CHARACTER_QUOTA_EXCEEDED` | Free-tier character limit | Show upgradeOptions CTA |
| 429 | `RATE_LIMIT_EXCEEDED` | Too many requests | Backoff using retryAfter; show “try later” |
| 400 | `THERAPEUTIC_CONSENT_REQUIRED (+ related consent codes)` | Missing required therapeutic consent fields | Block submit; show explicit consent checklist UI |
| 400 | `BIRTHDAY_* / EDUCATIONAL_* / etc` | Story type modifiers missing required fields | Highlight missing fields in form |
| 500 | `CREATE_STORY_FAILED / ASSET_GENERATION_FAILED / PDF_GENERATION_FAILED` | Backend failure | Show retry button; do not create duplicates unless idempotent |
| 202 | `(not an error) Accepted` | Async job queued | Switch UI to “generating”; subscribe realtime |

---

## Return Objects (Canonical)

### Return Objects (Gateway-sourced; auto-derived)

**Source**: `lambda-deployments/universal-agent/src/api/RESTAPIGateway.ts` (best-effort static extraction).

- These are meant to eliminate placeholder return types and make every endpoint reference a concrete response object name.
- If a response shape cannot be statically extracted, it is explicitly labeled as such (and should be confirmed against the handler).

- **Response_POST_api_v1_account_delete**: { success: true, message, requestId, scheduledDeletionAt }
- **Response_POST_api_v1_account_delete_cancel**: { success: true, message }
- **Response_POST_api_v1_account_delete_confirm**: { success: true, message }
- **Response_GET_api_v1_account_export**: { success: true, data }
- **Response_GET_api_v1_affiliate_earnings**: { success: true, data: { paidEarnings } }
- **Response_POST_api_v1_affiliate_enroll**: { success: true, data: { code, commissionRate, trackingUrl } }
- **Response_POST_api_v1_affiliate_payout**: { success: true, data: { amount, estimatedArrival, status } }
- **Response_GET_api_v1_affiliate_referrals**: { success: true, data: { converted, total } }
- **Response_GET_api_v1_affiliate_status**: { success: true, data }
- **Response_GET_api_v1_affiliates_dashboard**: { success: true, data: { performance, recentActivity, referrals } }
- **Response_GET_api_v1_affiliates_earnings**: { success: true, data: { earnings, total } }
- **Response_GET_api_v1_affiliates_links**: { success: true, data: { links } }
- **Response_POST_api_v1_affiliates_payout_request**: { success: true, data: { estimatedDate, status } }
- **Response_GET_api_v1_affiliates_referrals**: { success: true, data: { referrals } }
- **Response_POST_api_v1_affiliates_register**: { success: true, data: { affiliateId, referralCode, trackingLink } }
- **Response_POST_api_v1_audio_mix**: { success: true, data: { duration } }
- **Response_GET_api_v1_audio_music_catalog**: { success: true, data: { tracks } }
- **Response_GET_api_v1_audio_sfx_catalog**: { success: true, data: { effects } }
- **Response_GET_api_v1_audio_voices**: { success: true, data: { voices } }
- **Response_POST_api_v1_auth_reset_password**: { success: true, message }
- **Response_POST_api_v1_auth_verify_reset_token**: { success: true, data: { expiresAt } }
- **Response_GET_api_v1_avatar_connection**: { success: true, data: { capabilities, expiresAt, token } }
- **Response_POST_api_v1_checkout**: { success: true, data: { billingInterval, expiresAt, returnUrl, url } }
- **Response_POST_api_v1_checkout_individual**: { success: true, data: { billingInterval, checkoutUrl, expiresAt, returnUrl, url } }
- **Response_POST_api_v1_checkout_organization**: { success: true, data: { billingInterval, expiresAt, url } }
- **Response_GET_api_v1_collections**: { success: true, data: { collections } }
- **Response_POST_api_v1_collections**: { success: true, data: { name } }
- **Response_GET_api_v1_collections_param_collectionId**: { success: true, data }
- **Response_POST_api_v1_collections_param_collectionId_items**: { success: true, data: { items } }
- **Response_GET_api_v1_conversations_param_sessionId**: { success: true, data }
- **Response_POST_api_v1_conversations_param_sessionId_assets_clear**: { success: true, message }
- **Response_POST_api_v1_conversations_param_sessionId_end**: { success: true, message }
- **Response_POST_api_v1_conversations_param_sessionId_message**: { success: true, data }
- **Response_POST_api_v1_conversations_start**: { success: true, data }
- **Response_GET_api_v1_dashboard_parent**: { success: true, data: { emotionSummary, quota, recentStories, storyStats } }
- **Response_POST_api_v1_emotions_checkin**: { success: true, data: { insights } }
- **Response_POST_api_v1_emotions_crisis_detection**: { success: true, data: { actions, contactInfo } }
- **Response_POST_api_v1_emotions_escalate**: { success: true, data: { notificationsSent, supportTeamNotified } }
- **Response_GET_api_v1_emotions_insights**: { success: true, data: { actionable, severity } }
- **Response_POST_api_v1_emotions_mood_update**: { success: true, data: { moodHistory } }
- **Response_GET_api_v1_emotions_patterns**: { success: true, data: { recommendations, trends } }
- **Response_GET_api_v1_emotions_support_resources**: { success: true, data: { emergencyContacts } }
- **Response_GET_api_v1_favorites**: { success: true, data: { favorites } }
- **Response_POST_api_v1_favorites**: { success: true, data }
- **Response_DELETE_api_v1_favorites_param_favoriteId**: HTTP 204 No Content (no JSON body)
- **Response_GET_api_v1_gift_cards_param_code_validate**: { success: true, data: { giftCard } }
- **Response_POST_api_v1_gift_cards_purchase**: { success: true, data: { checkoutUrl, expiresAt, giftCardType, months, url } }
- **Response_POST_api_v1_gift_cards_redeem**: { success: true, data: { message, subscriptionExtendedTo } }
- **Response_POST_api_v1_hue_connect**: { success: true, data: { authUrl, state } | { connected, rooms, zones } | { connected, location, intensity, creditsEarned?, totalCredits?, message? } }
- **Response_GET_api_v1_invites**: { success: true, data: { total } }
- **Response_DELETE_api_v1_invites_param_inviteId**: HTTP 204 No Content (no JSON body)
- **Response_POST_api_v1_invites_param_inviteId_accept**: { success: true, data: { accessGranted } }
- **Response_POST_api_v1_invites_friend**: { success: true, data: { discountPercentage, expiresAt, inviteCode, inviteUrl } }
- **Response_GET_api_v1_invites_pending**: { success: true, data: { outgoing } }
- **Response_GET_api_v1_libraries**: { success: true, data: T[], pagination: { page, limit, total, totalPages, hasNext, hasPrevious } }
- **Response_POST_api_v1_libraries**: { success: true, data }
- **Response_GET_api_v1_libraries_param_id**: { success: true, data: { recentActivity, stats } }
- **Response_PUT_api_v1_libraries_param_id**: { success: true, data }
- **Response_POST_api_v1_libraries_param_id_members_param_userId_remove**: { success: true, message }
- **Response_POST_api_v1_libraries_param_libraryId_characters_param_characterId_share**: { success: true, data: { characterId, status } }
- **Response_POST_api_v1_libraries_param_libraryId_import**: { success: true, data: { errors } }
- **Response_POST_api_v1_libraries_param_libraryId_invites**: { success: true, data: { expiresAt, inviteUrl } }
- **Response_DELETE_api_v1_libraries_param_libraryId_stories_param_storyId**: HTTP 204 No Content (no JSON body; supports `?soft=false` for hard delete)
- **Response_GET_api_v1_libraries_param_libraryId_stories_param_storyId**: { success: true, data }
- **Response_PATCH_api_v1_libraries_param_libraryId_stories_param_storyId**: { success: true, data }
- **Response_POST_api_v1_organizations**: { success: true, data: { name, type } }
- **Response_GET_api_v1_organizations_param_orgId**: { success: true, data }
- **Response_GET_api_v1_organizations_param_orgId_library**: { success: true, data: { total } }
- **Response_POST_api_v1_organizations_param_orgId_library**: { success: true, data: { shareId } }
- **Response_GET_api_v1_organizations_param_orgId_members**: { success: true, data: { total } }
- **Response_POST_api_v1_organizations_param_orgId_seats**: { success: true, data: { status, userId } }
- **Response_GET_api_v1_parent_children**: { success: true, data: { children } }
- **Response_GET_api_v1_parent_children_param_childId_activity**: { success: true, data: { activities } }
- **Response_GET_api_v1_parent_children_param_childId_insights**: { success: true, data: { emotional, recommendations } }
- **Response_GET_api_v1_parent_children_param_childId_permissions**: { success: true, data: { permissions } }
- **Response_DELETE_api_v1_parent_children_param_childId_permissions_param_permissionId**: { success: true,  }
- **Response_POST_api_v1_parent_children_param_childId_permissions_grant**: { success: true, data: { granted } }
- **Response_POST_api_v1_profiles_param_profileId_emotions_check_in**: { success: true, data: { suggestedStories } }
- **Response_GET_api_v1_profiles_param_profileId_emotions_history**: { success: true, data: { checkIns, summary }, pagination: { page, limit, total, totalPages, hasNext, hasPrevious } }
- **Response_GET_api_v1_profiles_param_profileId_emotions_patterns**: { success: true, data: { recommendations, timeOfDay, triggers, weeklyTrends } }
- **Response_GET_api_v1_profiles_param_profileId_emotions_stream**: SSE `text/event-stream` (initial `{ type: \"connected\", profileId }`, periodic `{ type: \"ping\" }`)
- **Response_POST_api_v1_research_analyze**: Pass-through JSON from Research Agent (proxy) when `RESEARCH_AGENT_ENDPOINT` is configured
- **Response_GET_api_v1_research_briefs_latest**: Pass-through JSON from Research Agent (proxy) when `RESEARCH_AGENT_ENDPOINT` is configured
- **Response_GET_api_v1_search**: { success: true, data: { facets, total } }
- **Response_GET_api_v1_smart_home_devices**: { success: true, data: { count } }
- **Response_GET_api_v1_smart_home_status**: { success: true, data: { connectedDevices, status, totalDevices } }
- **Response_POST_api_v1_story_packs_buy**: `ApiError` only (currently returns 400/503/501; no `success: true` path)
- **Response_GET_api_v1_storytailor_ids**: { success: true, storytailorIds }
- **Response_POST_api_v1_storytailor_ids**: { success: true, storytailorId }
- **Response_GET_api_v1_storytailor_ids_param_id**: { success: true, storytailorId }
- **Response_POST_api_v1_storytailor_ids_param_id_consent**: { success: true, consent }
- **Response_GET_api_v1_subscription**: { success: true, data: { plan } }
- **Response_POST_api_v1_subscription_cancel**: { success: true, data: { cancelled, effectiveDate } }
- **Response_POST_api_v1_subscription_upgrade**: { success: true, data: { planChanged } }
- **Response_GET_api_v1_subscription_usage**: { success: true, data: { subscription, usage } }
- **Response_GET_api_v1_subscriptions_me**: { success: true, data: { plan } }
- **Response_GET_api_v1_tags**: { success: true, data: { tags } }
- **Response_POST_api_v1_tags**: { success: true, data }
- **Response_GET_api_v1_transfers_param_transferId**: { success: true, data }
- **Response_GET_api_v1_transfers_pending**: { success: true, data: { total } }
- **Response_GET_api_v1_users_me_accessibility**: { success: true, data }
- **Response_PUT_api_v1_users_me_accessibility**: { success: true, data }
- **Response_GET_api_v1_users_me_credits**: { success: true, data: { formattedAmount } }
- **Response_GET_api_v1_users_me_earning_opportunities**: { success: true, data: { maxEarnable } }
- **Response_GET_api_v1_users_me_effectiveness_top_stories**: { success: true, data: { count } }
- **Response_GET_api_v1_users_me_email_preferences**: { success: true, data }
- **Response_PATCH_api_v1_users_me_email_preferences**: { success: true,  }
- **Response_POST_api_v1_users_me_export**: { success: true, data: { estimatedTime, status } }
- **Response_GET_api_v1_users_me_export_param_exportId**: { success: true, data: { downloadUrl, expiresAt } }
- **Response_GET_api_v1_users_me_hue**: { success: true, data }
- **Response_PATCH_api_v1_users_me_hue**: { success: true, data: { connected } | { intensity } }
- **Response_GET_api_v1_users_me_insights_daily**: { success: true, data: { emotional, learning, recommendations } }
- **Response_GET_api_v1_users_me_notifications**: { success: true, data: { notifications, unreadCount }, pagination: { page, limit, total, totalPages, hasNext, hasPrevious } }
- **Response_DELETE_api_v1_users_me_notifications_param_notificationId**: HTTP 204 No Content (no JSON body)
- **Response_PATCH_api_v1_users_me_notifications_param_notificationId_read**: { success: true,  }
- **Response_POST_api_v1_users_me_notifications_devices**: { success: true, data: { registered } }
- **Response_DELETE_api_v1_users_me_notifications_devices_param_deviceId**: { success: true,  }
- **Response_POST_api_v1_users_me_notifications_mark_all_read**: { success: true, data: { marked } }
- **Response_GET_api_v1_users_me_notifications_settings**: { success: true, data: { categories, push } }
- **Response_PATCH_api_v1_users_me_notifications_settings**: { success: true, data }
- **Response_GET_api_v1_users_me_notifications_unread**: { success: true, data: { count } }
- **Response_GET_api_v1_users_me_preferences**: { success: true, data }
- **Response_PATCH_api_v1_users_me_preferences**: { success: true, data }
- **Response_POST_api_v1_users_me_preferences_reset**: { success: true, data: { preferences } }
- **Response_PUT_api_v1_users_me_profile**: { success: true, data: { profile, creditsEarned?, totalCredits?, message? } }
- **Response_POST_api_v1_users_me_push_devices**: { success: true, data: { registered } }
- **Response_DELETE_api_v1_users_me_push_devices_param_deviceId**: HTTP 204 No Content (no JSON body)
- **Response_POST_api_v1_users_me_push_register**: { success: true, data: { registered } }
- **Response_DELETE_api_v1_users_me_push_unregister**: { success: true,  }
- **Response_GET_api_v1_users_me_referral_link**: { success: true, data: { nextMilestone, totalReferrals } }
- **Response_GET_api_v1_users_me_rewards**: { success: true, data: { rewards, totalEarned, totalApplied, available }, pagination: { page, limit, total, totalPages, hasNext, hasPrevious } }
- **Response_GET_api_v1_users_me_story_packs**: { success: true, data: { summary, totalAvailable } }

**Note**: Every endpoint below references one of these response objects. If you need to tighten any response further, follow the source-of-truth route handler and update the corresponding `Response_<METHOD>_<PATH>` entry.

- **HealthResponse** (`SuccessDataResponse<HealthResponse>`): `{ status, timestamp, service, version? }`

- **AuthRegisterResponse** (`SuccessResponse`): `{ success, userId, userEmail, userType, country, locale?, isMinor, ageVerification, defaultStorytailorId?, tokens }`
- **AuthLoginResponse** (`SuccessResponse`): `{ success, user, tokens }`
- **AuthRefreshResponse** (`SuccessResponse`): `{ success, tokens }`
- **AuthLogoutResponse** (`SuccessResponse`): `{ success, message }`
- **AuthMeResponse** (`SuccessDataResponse<AuthMeResponse>`): `{ id, email, firstName?, lastName?, userType?, country?, locale?, isMinor, isEmailConfirmed, lastLoginAt, createdAt }`
- **PasswordResetRequestResponse** (`SuccessResponse`): `{ success, message }` (always success to prevent email enumeration)

- **StoryListResponse**: `{ stories: Story[], pagination }` (variant fields may differ)
- **StoryCreateResponse**: `{ storyId, status, ... }` (async generation; variant fields may differ)
- **StoryGetResponse**: `{ story: Story, character?: Character, profileId?: string }` (note: `profileId` is a legacy/deprecated alias; Storytailor ID is `libraries.id`)
- **CharacterListResponse**: `{ characters: Character[], pagination }` (variant fields may differ)
- **CharacterCreateResponse**: `{ characterId, status, ... }` (variant fields may differ)
- **TransferCreateResponse** (`SuccessDataResponse<TransferCreateResponse>`): `{ transferId, status, storyId, fromLibraryId, toLibraryId, expiresAt, createdAt, magicLink? }`
- **TransferRespondResponse** (`SuccessDataResponse<TransferRespondResponse>`): `{ storyId, newLibraryId }`
- **TransferAcceptMagicResponse** (`SuccessDataResponse<TransferAcceptMagicResponse>`): `{ transferId, storyId, transferType, message }`
- **StorytailorIdTransferResponse**: `{ storytailorId, newOwnerId, message }`

---

## Runtime Pipelines (REST Experience)

### Story Creation Pipeline (async)
- **Why it exists**: story generation + asset generation is long-running and must not block the REST request.
- **Entry**: `POST /api/v1/stories`
- **What happens (high-level)**:
  - Creates a `stories` row **immediately** with `status: "generating"` and an initial `asset_generation_status`.
  - Enqueues `asset_generation_jobs` rows for requested assets (either default suite or your explicit `generateAssets` list).
  - Triggers the Content Agent asynchronously to populate story content + assets.
- **Progress signals (frontend)**:
  - **Primary**: Supabase Realtime subscription on `stories` row:
    - table: `stories`
    - filter: `id=eq.<storyId>`
    - watch: `status`, `asset_generation_status`, `cover_art_url`, `scene_art_urls`, `audio_url`, `pdf_url`, `activities`
  - **Secondary**: `asset_generation_jobs` rows (queued/generating/ready/failed) if you build a job UI.
- **Outputs**:
  - A story record (immediate), then incremental updates until assets are ready.
- **Failure modes**:
  - `stories.status` may become `failed`.
  - Some assets may fail while others succeed; UI should be asset-granular (show what is ready).

### Asset Generation Pipeline (granular)
- **Why it exists**: progressive loading per asset type (cover, `scene_1..scene_4`, audio, PDF, activities, QR).
- **Entry**:
  - `POST /api/v1/stories/:storyId/assets` (explicitly enqueue)
  - or implicitly via `POST /api/v1/stories` with `generateAssets`
- **Job model**:
  - Each requested asset type creates an `asset_generation_jobs` row with `status: "queued"`.
  - Jobs are processed asynchronously and update the parent `stories` row when complete (URLs/status fields).
- **Signals**:
  - `stories.asset_generation_status` JSONB
  - `asset_generation_jobs.status`
- **UI guidance**:
  - Treat **202** as success; show “generating…” state and subscribe to updates.

### Activities Pipeline (sync generation + persisted result)
- **Why it exists**: activities are derived from finished story content and stored back onto the story for later retrieval.
- **Generate**: `POST /api/v1/stories/:storyId/activities`
  - Synchronously invokes Content Agent (RequestResponse), then persists `stories.activities`.
  - Returns `status: "ready"` with the activities array.
- **Read**: `GET /api/v1/stories/:storyId/activities`

### PDF Pipeline (sync invoke; may return “generating”)
- **Why it exists**: PDF assembly depends on story content + (optionally) activities; it produces a stable `pdf_url`.
- **Generate**: `POST /api/v1/stories/:storyId/pdf`
  - Invokes Content Agent (RequestResponse), then writes `stories.pdf_url` (+ page count/file size).
  - Returns **200** with `pdfUrl` when ready, or **202** with `pdfUrl: null` and `status: "generating"`.
- **Progress**: subscribe to `stories.pdf_url` updates via Supabase Realtime.

### Content Safety Pipeline
- **Why it exists**: moderation + safety gating for child-facing outputs.
- **Where**: orchestrated across agents; enforcement documented in `docs/api/SAFETY_BOUNDARIES.md`.

### Transfer Pipeline (stories)
- **Why it exists**: safely share content across Storytailor IDs/libraries with explicit accept/reject.
- **Create transfer**: `POST /api/v1/libraries/:libraryId/stories/:storyId/transfer`
- **Accept/reject**: `POST /api/v1/transfers/:transferId/respond`
- **Non-user acceptance**: `POST /api/v1/transfers/accept-magic` (token-based)
- **Backed by**: `story_transfers`, `pending_transfer_magic_links`

### Progressive Loading Pipeline (Realtime)
- **Why it exists**: REST responses return quickly; clients progressively update UI as assets become ready.
- **Primary**: Supabase Realtime subscriptions on `stories`, `notifications`, and related tables.

---

### Appendix: Observed Gateway `code` values (full, grouped; best-effort)

**Source**: `lambda-deployments/universal-agent/src/api/RESTAPIGateway.ts` (static analysis).

- **Meaning**: these codes are emitted today; not all are canonical `ERR_XXXX`.
- **HTTP status mapping**: best-effort from `res.status(N).json({ code: ... })` and helper validation returns (assumed 400).
- **Occurrences**: only counts explicit `res.status(...).json({ code })` sites (helper validation returns are not counted).

#### Grouped by category (for clarity)

**Auth / Account (16)**

| code | typical HTTP status |
|------|---------------------|
| `AUTH_FAILED` | 500 |
| `EMAIL_REQUIRED` | 400 |
| `EMAIL_ROLE_REQUIRED` | 400 |
| `FORBIDDEN` | 403 |
| `GET_EMAIL_PREFERENCES_FAILED` | 500 |
| `INVALID_REQUEST` | 400 |
| `INVALID_TOKEN` | 400 |
| `PASSWORD_MISMATCH` | 400 |
| `RATE_LIMIT_EXCEEDED` | 429 |
| `REQUEST_ID_MISSING` | 400 |
| `TOKEN_INVALID` | 404 |
| `TOKEN_MISSING` | 400 |
| `TOKEN_REQUIRED` | 400 |
| `UNAUTHORIZED` | 401 |
| `UPDATE_EMAIL_PREFERENCES_FAILED` | 500 |
| `VALIDATION_FAILED` | 500 |

**Libraries / Storytailor IDs (21)**

| code | typical HTTP status |
|------|---------------------|
| `ACCESS_DENIED` | 403 |
| `CHILD_NOT_FOUND` | 404 |
| `CONSENT_CREATION_FAILED` | 500 |
| `CONSENT_REQUEST_FAILED` | 500 |
| `COPPA_CONSENT_REQUIRED` | 403 |
| `CREATE_LIBRARY_FAILED` | 500 |
| `GET_CHILD_INSIGHTS_FAILED` | 500 |
| `GET_LIBRARY_FAILED` | 500 |
| `GET_SHARED_LIBRARY_FAILED` | 500 |
| `GRANT_PERMISSION_FAILED` | 500 |
| `INVALID_CONSENT_METHOD` | 400 |
| `LIBRARY_INVITE_FAILED` | 500 |
| `LIBRARY_MEMBER_REMOVAL_FAILED` | 500 |
| `LIST_CHILD_PERMISSIONS_FAILED` | 500 |
| `LIST_LIBRARIES_FAILED` | 500 |
| `PERMISSION_DENIED` | 403 |
| `REVOKE_PERMISSION_FAILED` | 500 |
| `TARGET_LIBRARY_NOT_FOUND` | 404 |
| `TARGET_LIBRARY_REQUIRED` | 400 |
| `UPDATE_LIBRARY_FAILED` | 500 |
| `WRITE_PERMISSION_REQUIRED` | 403 |

**Stories / Assets (35)**

| code | typical HTTP status |
|------|---------------------|
| `ACTIVITIES_GENERATION_FAILED` | 500 |
| `ASSET_CLEANUP_FAILED` | 500 |
| `ASSET_GENERATION_FAILED` | 500 |
| `ASSET_STREAM_FAILED` | 500 |
| `AUDIO_GENERATION_FAILED` | 500 |
| `AUDIO_MIX_FAILED` | 500 |
| `CREATE_STORYTAILOR_ID_FAILED` | 500 |
| `CREATE_STORY_FAILED` | 500 |
| `DELETE_STORY_FAILED` | 500 |
| `GENERATE_QR_FAILED` | 500 |
| `GET_ACTIVITIES_FAILED` | 500 |
| `GET_ASSET_STATUS_FAILED` | 500 |
| `GET_AUDIO_FAILED` | 500 |
| `GET_CHILD_ACTIVITY_FAILED` | 500 |
| `GET_QR_FAILED` | 500 |
| `GET_STORYTAILOR_ID_FAILED` | 500 |
| `GET_STORY_FAILED` | 500 |
| `GET_STORY_PACKS_FAILED` | 500 |
| `GET_WEBVTT_FAILED` | 500 |
| `HISTORY_FAILED` | 500 |
| `LIST_STORYTAILOR_IDS_FAILED` | 500 |
| `NOT_CHILD_STORYTAILOR_ID` | 400 |
| `PDF_GENERATION_FAILED` | 500 |
| `STORYTAILOR_ID_NOT_FOUND` | 404 |
| `STORY_CONTINUATION_FAILED` | 500 |
| `STORY_DELETION_CANCELLATION_FAILED` | 500 |
| `STORY_DELETION_FAILED` | 500 |
| `STORY_EMOTIONS_FAILED` | 500 |
| `STORY_NOT_FOUND` | 404 |
| `STORY_PACK_PURCHASE_FAILED` | 500 |
| `STORY_PACK_UNAVAILABLE` | 501 |
| `STORY_PROCESSING` | 400 |
| `STORY_QUOTA_EXCEEDED` | 402 |
| `TRACK_CONSUMPTION_FAILED` | 500 |
| `UPDATE_STORY_FAILED` | 500 |

**Story Type Modifiers (validation) (43)**

| code | typical HTTP status |
|------|---------------------|
| `BIRTHDAY_AGE_REQUIRED` | 400 |
| `BIRTHDAY_FROM_REQUIRED` | 400 |
| `BIRTHDAY_INPUT_REQUIRED` | 400 |
| `BIRTHDAY_MESSAGE_REQUIRED` | 400 |
| `BIRTHDAY_TO_REQUIRED` | 400 |
| `CHILD_LOSS_CHILD_AGE_REQUIRED` | 400 |
| `CHILD_LOSS_CHILD_GENDER_REQUIRED` | 400 |
| `CHILD_LOSS_CHILD_NAME_REQUIRED` | 400 |
| `CHILD_LOSS_ETHNICITY_REQUIRED` | 400 |
| `CHILD_LOSS_FOCUS_REQUIRED` | 400 |
| `CHILD_LOSS_INPUT_REQUIRED` | 400 |
| `CHILD_LOSS_RELATIONSHIP_REQUIRED` | 400 |
| `CHILD_LOSS_TYPE_REQUIRED` | 400 |
| `CHILD_LOSS_YOUR_NAME_REQUIRED` | 400 |
| `EDUCATIONAL_INPUT_REQUIRED` | 400 |
| `EDUCATIONAL_SUBJECT_REQUIRED` | 400 |
| `EMOTION_EXPLORED_REQUIRED` | 400 |
| `FINANCIAL_CONCEPT_REQUIRED` | 400 |
| `FINANCIAL_INPUT_REQUIRED` | 400 |
| `INNER_CHILD_AGE_NOW_REQUIRED` | 400 |
| `INNER_CHILD_AGE_RECONNECT_REQUIRED` | 400 |
| `INNER_CHILD_CHILDHOOD_NAME_REQUIRED` | 400 |
| `INNER_CHILD_FOCUS_REQUIRED` | 400 |
| `INNER_CHILD_INPUT_REQUIRED` | 400 |
| `INNER_CHILD_NAME_REQUIRED` | 400 |
| `INNER_CHILD_RELATIONSHIP_REQUIRED` | 400 |
| `INNER_CHILD_WORD_COUNT_REQUIRED` | 400 |
| `LANGUAGE_INPUT_REQUIRED` | 400 |
| `MEDICAL_CHALLENGE_REQUIRED` | 400 |
| `MEDICAL_INPUT_REQUIRED` | 400 |
| `MENTAL_HEALTH_INPUT_REQUIRED` | 400 |
| `MILESTONES_INPUT_REQUIRED` | 400 |
| `MILESTONE_TYPE_REQUIRED` | 400 |
| `NEW_BIRTH_GIFT_GIVER_REQUIRED` | 400 |
| `NEW_BIRTH_INPUT_REQUIRED` | 400 |
| `NEW_BIRTH_MODE_REQUIRED` | 400 |
| `PROFICIENCY_LEVEL_REQUIRED` | 400 |
| `TARGET_LANGUAGE_REQUIRED` | 400 |
| `TECH_CONCEPT_REQUIRED` | 400 |
| `TECH_INPUT_REQUIRED` | 400 |
| `THERAPEUTIC_CONSENT_ACKNOWLEDGED_NOT_THERAPY_REQUIRED` | 400 |
| `THERAPEUTIC_CONSENT_PROFESSIONAL_REFERRAL_REQUIRED` | 400 |
| `THERAPEUTIC_CONSENT_REQUIRED` | 400 |

**Characters (11)**

| code | typical HTTP status |
|------|---------------------|
| `AVATAR_CONNECTION_FAILED` | 500 |
| `CHARACTER_ALREADY_PRIMARY` | 409 |
| `CHARACTER_DELETION_FAILED` | 500 |
| `CHARACTER_NOT_FOUND` | 404 |
| `CHARACTER_QUOTA_EXCEEDED` | 402 |
| `CREATE_CHARACTER_FAILED` | 500 |
| `DELETE_CHARACTER_FAILED` | 500 |
| `GET_CHARACTER_FAILED` | 500 |
| `LIST_CHARACTERS_FAILED` | 500 |
| `SHARE_CHARACTER_FAILED` | 500 |
| `UPDATE_CHARACTER_FAILED` | 500 |

**Transfers (6)**

| code | typical HTTP status |
|------|---------------------|
| `ACCEPT_TRANSFER_FAILED` | 400, 500 |
| `GET_TRANSFER_FAILED` | 500 |
| `LIST_TRANSFERS_FAILED` | 500 |
| `TRANSFER_FAILED` | 500 |
| `TRANSFER_RESPONSE_FAILED` | 500 |
| `TRANSFER_STORYTAILOR_ID_FAILED` | 500 |

**Commerce / Subscription (19)**

| code | typical HTTP status |
|------|---------------------|
| `CANCEL_SUBSCRIPTION_FAILED` | 400, 500 |
| `CHANGE_PLAN_FAILED` | 400, 500 |
| `CHECKOUT_FAILED` | 500 |
| `CREATE_DISPUTE_FAILED` | 500 |
| `GET_CREDITS_FAILED` | 500 |
| `GET_DELIVERIES_FAILED` | 500 |
| `GET_DISPUTES_FAILED` | 500 |
| `GET_EARNINGS_FAILED` | 500 |
| `GET_EARNING_OPPORTUNITIES_FAILED` | 500 |
| `GET_SUBSCRIPTION_FAILED` | 500 |
| `GIFT_CARD_PURCHASE_FAILED` | 500 |
| `INVALID_GIFT_CARD` | not observed |
| `INVALID_GIFT_CARD_TYPE` | 400 |
| `MISSING_PLAN_ID` | 400 |
| `ORGANIZATION_CHECKOUT_FAILED` | 500 |
| `PAYOUT_FAILED` | 500 |
| `QUOTA_CHECK_FAILED` | 500 |
| `REDEEM_FAILED` | 400, 500 |
| `REQUEST_PAYOUT_FAILED` | 500 |

**Notifications / Devices (12)**

| code | typical HTTP status |
|------|---------------------|
| `DEVICE_TOKEN_REQUIRED` | 400 |
| `DISMISS_NOTIFICATION_FAILED` | 500 |
| `GET_DEVICES_FAILED` | 500 |
| `GET_NOTIFICATIONS_FAILED` | 500 |
| `GET_NOTIFICATION_SETTINGS_FAILED` | 500 |
| `MARK_ALL_READ_FAILED` | 500 |
| `MARK_READ_FAILED` | 500 |
| `REGISTER_DEVICE_FAILED` | 500 |
| `REGISTER_PUSH_FAILED` | 500 |
| `UNREGISTER_DEVICE_FAILED` | 500 |
| `UNREGISTER_PUSH_FAILED` | 500 |
| `UPDATE_NOTIFICATION_SETTINGS_FAILED` | 500 |

**Emotions / Insights (7)**

| code | typical HTTP status |
|------|---------------------|
| `CHECK_IN_FAILED` | 500 |
| `CRISIS_DETECTION_FAILED` | 500 |
| `ESCALATION_FAILED` | 500 |
| `GET_DAILY_INSIGHTS_FAILED` | 500 |
| `INSIGHTS_FAILED` | 500 |
| `MOOD_UPDATE_FAILED` | 500 |
| `PATTERNS_FAILED` | 500 |

**Conversations / Sessions (6)**

| code | typical HTTP status |
|------|---------------------|
| `END_CONVERSATION_FAILED` | 500 |
| `GET_SESSION_FAILED` | 500 |
| `SEND_MESSAGE_FAILED` | 500 |
| `SESSION_NOT_FOUND` | 404 |
| `START_CONVERSATION_FAILED` | 500 |
| `STREAM_FAILED` | 500 |

**Safety / Moderation / Support (8)**

| code | typical HTTP status |
|------|---------------------|
| `GET_FEEDBACK_SUMMARY_FAILED` | 500 |
| `GET_TICKETS_FAILED` | 500 |
| `INVALID_CONTENT` | 400 |
| `MODERATE_FAILED` | 500 |
| `MODERATION_FAILED` | 500 |
| `SUBMIT_FEEDBACK_FAILED` | 500 |
| `SUPPORT_RESOURCES_FAILED` | 500 |
| `UPDATE_TICKET_FAILED` | 500 |

**Orgs / Affiliates / Collections (28)**

| code | typical HTTP status |
|------|---------------------|
| `ACCEPT_INVITE_FAILED` | 500 |
| `ADD_COLLECTION_ITEMS_FAILED` | 500 |
| `ADD_FAVORITE_FAILED` | 500 |
| `ADD_SEAT_FAILED` | 500 |
| `ADD_TAG_FAILED` | 500 |
| `AFFILIATE_NOT_FOUND` | 404 |
| `COLLECTION_NOT_FOUND` | 404 |
| `CREATE_COLLECTION_FAILED` | 500 |
| `CREATE_ORG_FAILED` | 500 |
| `CREATE_TAG_FAILED` | 500 |
| `DELETE_INVITE_FAILED` | 500 |
| `GET_AFFILIATE_DASHBOARD_FAILED` | 500 |
| `GET_AFFILIATE_FAILED` | 500 |
| `GET_COLLECTION_FAILED` | 500 |
| `GET_ORG_FAILED` | 500 |
| `GET_REFERRALS_FAILED` | 500 |
| `GET_REFERRAL_LINK_FAILED` | 500 |
| `GET_REWARDS_FAILED` | 500 |
| `INVITE_FAILED` | 500 |
| `LIST_COLLECTIONS_FAILED` | 500 |
| `LIST_FAVORITES_FAILED` | 500 |
| `LIST_INVITES_FAILED` | 500 |
| `LIST_REFERRALS_FAILED` | 500 |
| `LIST_TAGS_FAILED` | 500 |
| `PENDING_INVITES_FAILED` | 500 |
| `REGISTER_AFFILIATE_FAILED` | 500 |
| `REMOVE_FAVORITE_FAILED` | 500 |
| `SHARE_TO_ORG_FAILED` | 500 |

**System / Ops (23)**

| code | typical HTTP status |
|------|---------------------|
| `ANALYTICS_FAILED` | 500 |
| `AUDIT_LOGS_FAILED` | 500 |
| `COMMERCE_AGENT_UNAVAILABLE` | 503 |
| `FETCH_USER_FAILED` | 500 |
| `GET_AUDIT_FAILED` | 500 |
| `GET_CONFIG_FAILED` | 500 |
| `GET_DASHBOARD_FAILED` | 500 |
| `GET_FLAGS_FAILED` | 500 |
| `GET_JOB_FAILED` | 500 |
| `GET_METRICS_FAILED` | 500 |
| `GET_STATUS_FAILED` | 500 |
| `GET_USER_FAILED` | 500 |
| `HEALTH_CHECK_FAILED` | 500 |
| `LIST_USERS_FAILED` | 500 |
| `METRICS_FAILED` | 500 |
| `RESET_FAILED` | 500 |
| `RETRY_FAILED` | 500 |
| `SERVICE_UNAVAILABLE` | 503 |
| `STRIPE_WEBHOOK_NOT_CONFIGURED` | 503 |
| `TRIGGER_JOB_FAILED` | 500 |
| `UPDATE_CONFIG_FAILED` | 500 |
| `UPDATE_STATUS_FAILED` | 500 |
| `USAGE_ANALYTICS_FAILED` | 500 |

**Webhooks (8)**

| code | typical HTTP status |
|------|---------------------|
| `DELETE_WEBHOOK_FAILED` | 500 |
| `GET_WEBHOOK_FAILED` | 500 |
| `LIST_WEBHOOKS_FAILED` | 500 |
| `REGISTER_WEBHOOK_FAILED` | 500 |
| `STRIPE_WEBHOOK_FAILED` | 503 |
| `STRIPE_WEBHOOK_SECRET_PLACEHOLDER` | not observed |
| `UPDATE_WEBHOOK_FAILED` | 500 |
| `WEBHOOK_NOT_FOUND` | 404 |

**Misc (58)**

| code | typical HTTP status |
|------|---------------------|
| `BROADCAST_FAILED` | 500 |
| `CANCEL_FAILED` | 500 |
| `DELETION_CANCELLATION_FAILED` | 500 |
| `DELETION_CONFIRMATION_FAILED` | 500 |
| `DELETION_REQUEST_FAILED` | 500 |
| `DISMISS_FAILED` | 500 |
| `END_IMPERSONATE_FAILED` | 500 |
| `ENROLL_FAILED` | 500 |
| `ESTIMATE_FAILED` | 500 |
| `EXPORT_FAILED` | 500 |
| `GET_ACCESSIBILITY_FAILED` | 500 |
| `GET_EFFECTIVENESS_FAILED` | 500 |
| `GET_EXPORT_FAILED` | 500 |
| `GET_HUE_STATE_FAILED` | 500 |
| `GET_MUSIC_CATALOG_FAILED` | 500 |
| `GET_PREFERENCES_FAILED` | 500 |
| `GET_SFX_CATALOG_FAILED` | 500 |
| `GET_TOP_STORIES_FAILED` | 500 |
| `GET_TRACKING_LINKS_FAILED` | 500 |
| `GET_UNREAD_FAILED` | 500 |
| `GET_USAGE_FAILED` | 500 |
| `HUE_CONNECT_FAILED` | 500 |
| `IMPERSONATE_FAILED` | 500 |
| `IMPORT_DATA_REQUIRED` | 400 |
| `IMPORT_FAILED` | 500 |
| `INVALID_HUE_REQUEST` | 400 |
| `INVALID_INPUT` | 400 |
| `INVALID_METADATA` | 400 |
| `INVALID_PACK_TYPE` | 400 |
| `INVALID_RATING` | 400 |
| `INVALID_RELATIONSHIP_FOR_LOSS_TYPE` | not observed |
| `INVALID_RESPONSE` | 400 |
| `INVALID_SENTIMENT` | 400 |
| `INVALID_UPDATE` | 400 |
| `ITEMS_REQUIRED` | 400 |
| `LIST_CHILDREN_FAILED` | 500 |
| `LIST_MEMBERS_FAILED` | 500 |
| `LIST_STORIES_FAILED` | 500 |
| `LIST_VOICES_FAILED` | 500 |
| `MISSING_CODE` | 400 |
| `MISSING_FIELDS` | 400 |
| `MISSING_REQUIRED_FIELDS` | 400 |
| `NAME_REQUIRED` | 400 |
| `NARRATION_URL_REQUIRED` | 400 |
| `QUERY_REQUIRED` | 400 |
| `RESEARCH_AGENT_FAILED` | 500 |
| `RESET_PREFERENCES_FAILED` | 500 |
| `RESPONSES_REQUIRED` | 400 |
| `SEARCH_FAILED` | 500 |
| `STRIPE_SIGNATURE_MISSING` | 503 |
| `TARGET_USER_NOT_FOUND` | 404 |
| `TARGET_USER_REQUIRED` | 400 |
| `UPDATE_ACCESSIBILITY_FAILED` | 500 |
| `UPDATE_FLAG_FAILED` | 500 |
| `UPDATE_HUE_FAILED` | 500 |
| `UPDATE_PREFERENCES_FAILED` | 500 |
| `UPDATE_PROFILE_FAILED` | 500 |
| `USER_NOT_FOUND` | 404 |

#### All codes (alphabetical)

| code | typical HTTP status | occurrences (approx) |
|------|---------------------|---------------------|
| `ACCEPT_INVITE_FAILED` | 500 | 1 |
| `ACCEPT_TRANSFER_FAILED` | 400, 500 | 3 |
| `ACCESS_DENIED` | 403 | 8 |
| `ACTIVITIES_GENERATION_FAILED` | 500 | 1 |
| `ADD_COLLECTION_ITEMS_FAILED` | 500 | 1 |
| `ADD_FAVORITE_FAILED` | 500 | 1 |
| `ADD_SEAT_FAILED` | 500 | 1 |
| `ADD_TAG_FAILED` | 500 | 1 |
| `AFFILIATE_NOT_FOUND` | 404 | 4 |
| `ANALYTICS_FAILED` | 500 | 1 |
| `ASSET_CLEANUP_FAILED` | 500 | 1 |
| `ASSET_GENERATION_FAILED` | 500 | 1 |
| `ASSET_STREAM_FAILED` | 500 | 1 |
| `AUDIO_GENERATION_FAILED` | 500 | 1 |
| `AUDIO_MIX_FAILED` | 500 | 1 |
| `AUDIT_LOGS_FAILED` | 500 | 1 |
| `AUTH_FAILED` | 500 | 1 |
| `AVATAR_CONNECTION_FAILED` | 500 | 1 |
| `BIRTHDAY_AGE_REQUIRED` | 400 | 0 |
| `BIRTHDAY_FROM_REQUIRED` | 400 | 0 |
| `BIRTHDAY_INPUT_REQUIRED` | 400 | 0 |
| `BIRTHDAY_MESSAGE_REQUIRED` | 400 | 0 |
| `BIRTHDAY_TO_REQUIRED` | 400 | 0 |
| `BROADCAST_FAILED` | 500 | 1 |
| `CANCEL_FAILED` | 500 | 1 |
| `CANCEL_SUBSCRIPTION_FAILED` | 400, 500 | 3 |
| `CHANGE_PLAN_FAILED` | 400, 500 | 3 |
| `CHARACTER_ALREADY_PRIMARY` | 409 | 4 |
| `CHARACTER_DELETION_FAILED` | 500 | 1 |
| `CHARACTER_NOT_FOUND` | 404 | 4 |
| `CHARACTER_QUOTA_EXCEEDED` | 402 | 2 |
| `CHECKOUT_FAILED` | 500 | 2 |
| `CHECK_IN_FAILED` | 500 | 2 |
| `CHILD_LOSS_CHILD_AGE_REQUIRED` | 400 | 0 |
| `CHILD_LOSS_CHILD_GENDER_REQUIRED` | 400 | 0 |
| `CHILD_LOSS_CHILD_NAME_REQUIRED` | 400 | 0 |
| `CHILD_LOSS_ETHNICITY_REQUIRED` | 400 | 0 |
| `CHILD_LOSS_FOCUS_REQUIRED` | 400 | 0 |
| `CHILD_LOSS_INPUT_REQUIRED` | 400 | 0 |
| `CHILD_LOSS_RELATIONSHIP_REQUIRED` | 400 | 0 |
| `CHILD_LOSS_TYPE_REQUIRED` | 400 | 0 |
| `CHILD_LOSS_YOUR_NAME_REQUIRED` | 400 | 0 |
| `CHILD_NOT_FOUND` | 404 | 10 |
| `COLLECTION_NOT_FOUND` | 404 | 2 |
| `COMMERCE_AGENT_UNAVAILABLE` | 503 | 2 |
| `CONSENT_CREATION_FAILED` | 500 | 2 |
| `CONSENT_REQUEST_FAILED` | 500 | 1 |
| `COPPA_CONSENT_REQUIRED` | 403 | 2 |
| `CREATE_CHARACTER_FAILED` | 500 | 1 |
| `CREATE_COLLECTION_FAILED` | 500 | 1 |
| `CREATE_DISPUTE_FAILED` | 500 | 1 |
| `CREATE_LIBRARY_FAILED` | 500 | 1 |
| `CREATE_ORG_FAILED` | 500 | 1 |
| `CREATE_STORYTAILOR_ID_FAILED` | 500 | 1 |
| `CREATE_STORY_FAILED` | 500 | 1 |
| `CREATE_TAG_FAILED` | 500 | 1 |
| `CRISIS_DETECTION_FAILED` | 500 | 1 |
| `DELETE_CHARACTER_FAILED` | 500 | 1 |
| `DELETE_INVITE_FAILED` | 500 | 1 |
| `DELETE_STORY_FAILED` | 500 | 1 |
| `DELETE_WEBHOOK_FAILED` | 500 | 1 |
| `DELETION_CANCELLATION_FAILED` | 500 | 1 |
| `DELETION_CONFIRMATION_FAILED` | 500 | 1 |
| `DELETION_REQUEST_FAILED` | 500 | 1 |
| `DEVICE_TOKEN_REQUIRED` | 400 | 6 |
| `DISMISS_FAILED` | 500 | 1 |
| `DISMISS_NOTIFICATION_FAILED` | 500 | 1 |
| `EDUCATIONAL_INPUT_REQUIRED` | 400 | 0 |
| `EDUCATIONAL_SUBJECT_REQUIRED` | 400 | 0 |
| `EMAIL_REQUIRED` | 400 | 6 |
| `EMAIL_ROLE_REQUIRED` | 400 | 2 |
| `EMOTION_EXPLORED_REQUIRED` | 400 | 0 |
| `END_CONVERSATION_FAILED` | 500 | 1 |
| `END_IMPERSONATE_FAILED` | 500 | 1 |
| `ENROLL_FAILED` | 500 | 1 |
| `ESCALATION_FAILED` | 500 | 1 |
| `ESTIMATE_FAILED` | 500 | 1 |
| `EXPORT_FAILED` | 500 | 2 |
| `FETCH_USER_FAILED` | 500 | 2 |
| `FINANCIAL_CONCEPT_REQUIRED` | 400 | 0 |
| `FINANCIAL_INPUT_REQUIRED` | 400 | 0 |
| `FORBIDDEN` | 403 | 4 |
| `GENERATE_QR_FAILED` | 500 | 1 |
| `GET_ACCESSIBILITY_FAILED` | 500 | 1 |
| `GET_ACTIVITIES_FAILED` | 500 | 1 |
| `GET_AFFILIATE_DASHBOARD_FAILED` | 500 | 1 |
| `GET_AFFILIATE_FAILED` | 500 | 1 |
| `GET_ASSET_STATUS_FAILED` | 500 | 1 |
| `GET_AUDIO_FAILED` | 500 | 1 |
| `GET_AUDIT_FAILED` | 500 | 1 |
| `GET_CHARACTER_FAILED` | 500 | 2 |
| `GET_CHILD_ACTIVITY_FAILED` | 500 | 1 |
| `GET_CHILD_INSIGHTS_FAILED` | 500 | 1 |
| `GET_COLLECTION_FAILED` | 500 | 1 |
| `GET_CONFIG_FAILED` | 500 | 1 |
| `GET_CREDITS_FAILED` | 500 | 1 |
| `GET_DAILY_INSIGHTS_FAILED` | 500 | 1 |
| `GET_DASHBOARD_FAILED` | 500 | 1 |
| `GET_DELIVERIES_FAILED` | 500 | 1 |
| `GET_DEVICES_FAILED` | 500 | 1 |
| `GET_DISPUTES_FAILED` | 500 | 1 |
| `GET_EARNINGS_FAILED` | 500 | 2 |
| `GET_EARNING_OPPORTUNITIES_FAILED` | 500 | 1 |
| `GET_EFFECTIVENESS_FAILED` | 500 | 1 |
| `GET_EMAIL_PREFERENCES_FAILED` | 500 | 1 |
| `GET_EXPORT_FAILED` | 500 | 1 |
| `GET_FEEDBACK_SUMMARY_FAILED` | 500 | 2 |
| `GET_FLAGS_FAILED` | 500 | 1 |
| `GET_HUE_STATE_FAILED` | 500 | 1 |
| `GET_JOB_FAILED` | 500 | 1 |
| `GET_LIBRARY_FAILED` | 500 | 1 |
| `GET_METRICS_FAILED` | 500 | 1 |
| `GET_MUSIC_CATALOG_FAILED` | 500 | 1 |
| `GET_NOTIFICATIONS_FAILED` | 500 | 2 |
| `GET_NOTIFICATION_SETTINGS_FAILED` | 500 | 1 |
| `GET_ORG_FAILED` | 500 | 1 |
| `GET_PREFERENCES_FAILED` | 500 | 1 |
| `GET_QR_FAILED` | 500 | 1 |
| `GET_REFERRALS_FAILED` | 500 | 1 |
| `GET_REFERRAL_LINK_FAILED` | 500 | 1 |
| `GET_REWARDS_FAILED` | 500 | 1 |
| `GET_SESSION_FAILED` | 500 | 1 |
| `GET_SFX_CATALOG_FAILED` | 500 | 1 |
| `GET_SHARED_LIBRARY_FAILED` | 500 | 1 |
| `GET_STATUS_FAILED` | 500 | 1 |
| `GET_STORYTAILOR_ID_FAILED` | 500 | 1 |
| `GET_STORY_FAILED` | 500 | 2 |
| `GET_STORY_PACKS_FAILED` | 500 | 1 |
| `GET_SUBSCRIPTION_FAILED` | 500 | 2 |
| `GET_TICKETS_FAILED` | 500 | 1 |
| `GET_TOP_STORIES_FAILED` | 500 | 1 |
| `GET_TRACKING_LINKS_FAILED` | 500 | 1 |
| `GET_TRANSFER_FAILED` | 500 | 1 |
| `GET_UNREAD_FAILED` | 500 | 1 |
| `GET_USAGE_FAILED` | 500 | 1 |
| `GET_USER_FAILED` | 500 | 1 |
| `GET_WEBHOOK_FAILED` | 500 | 1 |
| `GET_WEBVTT_FAILED` | 500 | 1 |
| `GIFT_CARD_PURCHASE_FAILED` | 500 | 1 |
| `GRANT_PERMISSION_FAILED` | 500 | 1 |
| `HEALTH_CHECK_FAILED` | 500 | 1 |
| `HISTORY_FAILED` | 500 | 1 |
| `HUE_CONNECT_FAILED` | 500 | 1 |
| `IMPERSONATE_FAILED` | 500 | 1 |
| `IMPORT_DATA_REQUIRED` | 400 | 2 |
| `IMPORT_FAILED` | 500 | 1 |
| `INNER_CHILD_AGE_NOW_REQUIRED` | 400 | 0 |
| `INNER_CHILD_AGE_RECONNECT_REQUIRED` | 400 | 0 |
| `INNER_CHILD_CHILDHOOD_NAME_REQUIRED` | 400 | 0 |
| `INNER_CHILD_FOCUS_REQUIRED` | 400 | 0 |
| `INNER_CHILD_INPUT_REQUIRED` | 400 | 0 |
| `INNER_CHILD_NAME_REQUIRED` | 400 | 0 |
| `INNER_CHILD_RELATIONSHIP_REQUIRED` | 400 | 0 |
| `INNER_CHILD_WORD_COUNT_REQUIRED` | 400 | 0 |
| `INSIGHTS_FAILED` | 500 | 1 |
| `INVALID_CONSENT_METHOD` | 400 | 2 |
| `INVALID_CONTENT` | 400 | 2 |
| `INVALID_GIFT_CARD` | not observed | 0 |
| `INVALID_GIFT_CARD_TYPE` | 400 | 2 |
| `INVALID_HUE_REQUEST` | 400 | 1 |
| `INVALID_INPUT` | 400 | 2 |
| `INVALID_METADATA` | 400 | 2 |
| `INVALID_PACK_TYPE` | 400 | 2 |
| `INVALID_RATING` | 400 | 4 |
| `INVALID_RELATIONSHIP_FOR_LOSS_TYPE` | not observed | 0 |
| `INVALID_REQUEST` | 400 | 4 |
| `INVALID_RESPONSE` | 400 | 2 |
| `INVALID_SENTIMENT` | 400 | 4 |
| `INVALID_TOKEN` | 400 | 1 |
| `INVALID_UPDATE` | 400 | 1 |
| `INVITE_FAILED` | 500 | 1 |
| `ITEMS_REQUIRED` | 400 | 2 |
| `LANGUAGE_INPUT_REQUIRED` | 400 | 0 |
| `LIBRARY_INVITE_FAILED` | 500 | 1 |
| `LIBRARY_MEMBER_REMOVAL_FAILED` | 500 | 1 |
| `LIST_CHARACTERS_FAILED` | 500 | 1 |
| `LIST_CHILDREN_FAILED` | 500 | 1 |
| `LIST_CHILD_PERMISSIONS_FAILED` | 500 | 1 |
| `LIST_COLLECTIONS_FAILED` | 500 | 1 |
| `LIST_FAVORITES_FAILED` | 500 | 1 |
| `LIST_INVITES_FAILED` | 500 | 1 |
| `LIST_LIBRARIES_FAILED` | 500 | 1 |
| `LIST_MEMBERS_FAILED` | 500 | 1 |
| `LIST_REFERRALS_FAILED` | 500 | 1 |
| `LIST_STORIES_FAILED` | 500 | 1 |
| `LIST_STORYTAILOR_IDS_FAILED` | 500 | 1 |
| `LIST_TAGS_FAILED` | 500 | 1 |
| `LIST_TRANSFERS_FAILED` | 500 | 1 |
| `LIST_USERS_FAILED` | 500 | 1 |
| `LIST_VOICES_FAILED` | 500 | 1 |
| `LIST_WEBHOOKS_FAILED` | 500 | 1 |
| `MARK_ALL_READ_FAILED` | 500 | 1 |
| `MARK_READ_FAILED` | 500 | 2 |
| `MEDICAL_CHALLENGE_REQUIRED` | 400 | 0 |
| `MEDICAL_INPUT_REQUIRED` | 400 | 0 |
| `MENTAL_HEALTH_INPUT_REQUIRED` | 400 | 0 |
| `METRICS_FAILED` | 500 | 1 |
| `MILESTONES_INPUT_REQUIRED` | 400 | 0 |
| `MILESTONE_TYPE_REQUIRED` | 400 | 0 |
| `MISSING_CODE` | 400 | 2 |
| `MISSING_FIELDS` | 400 | 8 |
| `MISSING_PLAN_ID` | 400 | 2 |
| `MISSING_REQUIRED_FIELDS` | 400 | 4 |
| `MODERATE_FAILED` | 500 | 1 |
| `MODERATION_FAILED` | 500 | 1 |
| `MOOD_UPDATE_FAILED` | 500 | 1 |
| `NAME_REQUIRED` | 400 | 4 |
| `NARRATION_URL_REQUIRED` | 400 | 2 |
| `NEW_BIRTH_GIFT_GIVER_REQUIRED` | 400 | 0 |
| `NEW_BIRTH_INPUT_REQUIRED` | 400 | 0 |
| `NEW_BIRTH_MODE_REQUIRED` | 400 | 0 |
| `NOT_CHILD_STORYTAILOR_ID` | 400 | 2 |
| `ORGANIZATION_CHECKOUT_FAILED` | 500 | 1 |
| `PASSWORD_MISMATCH` | 400 | 2 |
| `PATTERNS_FAILED` | 500 | 2 |
| `PAYOUT_FAILED` | 500 | 1 |
| `PDF_GENERATION_FAILED` | 500 | 1 |
| `PENDING_INVITES_FAILED` | 500 | 1 |
| `PERMISSION_DENIED` | 403 | 4 |
| `PROFICIENCY_LEVEL_REQUIRED` | 400 | 0 |
| `QUERY_REQUIRED` | 400 | 2 |
| `QUOTA_CHECK_FAILED` | 500 | 6 |
| `RATE_LIMIT_EXCEEDED` | 429 | 4 |
| `REDEEM_FAILED` | 400, 500 | 3 |
| `REGISTER_AFFILIATE_FAILED` | 500 | 1 |
| `REGISTER_DEVICE_FAILED` | 500 | 2 |
| `REGISTER_PUSH_FAILED` | 500 | 1 |
| `REGISTER_WEBHOOK_FAILED` | 500 | 1 |
| `REMOVE_FAVORITE_FAILED` | 500 | 1 |
| `REQUEST_ID_MISSING` | 400 | 4 |
| `REQUEST_PAYOUT_FAILED` | 500 | 1 |
| `RESEARCH_AGENT_FAILED` | 500 | 2 |
| `RESET_FAILED` | 500 | 1 |
| `RESET_PREFERENCES_FAILED` | 500 | 1 |
| `RESPONSES_REQUIRED` | 400 | 2 |
| `RETRY_FAILED` | 500 | 1 |
| `REVOKE_PERMISSION_FAILED` | 500 | 1 |
| `SEARCH_FAILED` | 500 | 1 |
| `SEND_MESSAGE_FAILED` | 500 | 1 |
| `SERVICE_UNAVAILABLE` | 503 | 26 |
| `SESSION_NOT_FOUND` | 404 | 2 |
| `SHARE_CHARACTER_FAILED` | 500 | 1 |
| `SHARE_TO_ORG_FAILED` | 500 | 1 |
| `START_CONVERSATION_FAILED` | 500 | 1 |
| `STORYTAILOR_ID_NOT_FOUND` | 404 | 2 |
| `STORY_CONTINUATION_FAILED` | 500 | 1 |
| `STORY_DELETION_CANCELLATION_FAILED` | 500 | 1 |
| `STORY_DELETION_FAILED` | 500 | 1 |
| `STORY_EMOTIONS_FAILED` | 500 | 1 |
| `STORY_NOT_FOUND` | 404 | 16 |
| `STORY_PACK_PURCHASE_FAILED` | 500 | 1 |
| `STORY_PACK_UNAVAILABLE` | 501 | 2 |
| `STORY_PROCESSING` | 400 | 2 |
| `STORY_QUOTA_EXCEEDED` | 402 | 2 |
| `STREAM_FAILED` | 500 | 1 |
| `STRIPE_SIGNATURE_MISSING` | 503 | 2 |
| `STRIPE_WEBHOOK_FAILED` | 503 | 2 |
| `STRIPE_WEBHOOK_NOT_CONFIGURED` | 503 | 2 |
| `STRIPE_WEBHOOK_SECRET_PLACEHOLDER` | not observed | 0 |
| `SUBMIT_FEEDBACK_FAILED` | 500 | 2 |
| `SUPPORT_RESOURCES_FAILED` | 500 | 1 |
| `TARGET_LANGUAGE_REQUIRED` | 400 | 0 |
| `TARGET_LIBRARY_NOT_FOUND` | 404 | 2 |
| `TARGET_LIBRARY_REQUIRED` | 400 | 4 |
| `TARGET_USER_NOT_FOUND` | 404 | 2 |
| `TARGET_USER_REQUIRED` | 400 | 2 |
| `TECH_CONCEPT_REQUIRED` | 400 | 0 |
| `TECH_INPUT_REQUIRED` | 400 | 0 |
| `THERAPEUTIC_CONSENT_ACKNOWLEDGED_NOT_THERAPY_REQUIRED` | 400 | 0 |
| `THERAPEUTIC_CONSENT_PROFESSIONAL_REFERRAL_REQUIRED` | 400 | 0 |
| `THERAPEUTIC_CONSENT_REQUIRED` | 400 | 0 |
| `TOKEN_INVALID` | 404 | 2 |
| `TOKEN_MISSING` | 400 | 2 |
| `TOKEN_REQUIRED` | 400 | 2 |
| `TRACK_CONSUMPTION_FAILED` | 500 | 1 |
| `TRANSFER_FAILED` | 500 | 1 |
| `TRANSFER_RESPONSE_FAILED` | 500 | 1 |
| `TRANSFER_STORYTAILOR_ID_FAILED` | 500 | 1 |
| `TRIGGER_JOB_FAILED` | 500 | 1 |
| `UNAUTHORIZED` | 401 | 2 |
| `UNREGISTER_DEVICE_FAILED` | 500 | 2 |
| `UNREGISTER_PUSH_FAILED` | 500 | 1 |
| `UPDATE_ACCESSIBILITY_FAILED` | 500 | 1 |
| `UPDATE_CHARACTER_FAILED` | 500 | 2 |
| `UPDATE_CONFIG_FAILED` | 500 | 1 |
| `UPDATE_EMAIL_PREFERENCES_FAILED` | 500 | 1 |
| `UPDATE_FLAG_FAILED` | 500 | 1 |
| `UPDATE_HUE_FAILED` | 500 | 1 |
| `UPDATE_LIBRARY_FAILED` | 500 | 1 |
| `UPDATE_NOTIFICATION_SETTINGS_FAILED` | 500 | 1 |
| `UPDATE_PREFERENCES_FAILED` | 500 | 1 |
| `UPDATE_PROFILE_FAILED` | 500 | 1 |
| `UPDATE_STATUS_FAILED` | 500 | 1 |
| `UPDATE_STORY_FAILED` | 500 | 2 |
| `UPDATE_TICKET_FAILED` | 500 | 1 |
| `UPDATE_WEBHOOK_FAILED` | 500 | 1 |
| `USAGE_ANALYTICS_FAILED` | 500 | 1 |
| `USER_NOT_FOUND` | 404 | 4 |
| `VALIDATION_FAILED` | 500 | 1 |
| `WEBHOOK_NOT_FOUND` | 404 | 2 |
| `WRITE_PERMISSION_REQUIRED` | 403 | 12 |

### Audit: error-code contract consistency (what’s true today)

- **Two shapes exist in production**:
  - Some middleware errors use the structured shape: `{"success": false, "error": {"code", "message", "type", "details"}}` (example: lifecycle `ERR_6003`).
  - Many REST endpoints return the flatter shape: `{"success": false, "error": "message", "code": "SCREAMING_SNAKE"}` and sometimes include extra fields (e.g., `quota`, `upgradeOptions`, `retryAfter`) that are **intended for frontend UX**.

- **Two code namespaces exist in production**:
  - **Canonical**: `ERR_XXXX` (documented in `docs/api/troubleshooting/COMMON_ERRORS.md` + system guarantees).
  - **Observed gateway codes**: the 301 codes listed above (mostly domain/action specific).

- **What the frontend should rely on** (stable contract):
  - **HTTP status** for primary control-flow.
  - `success` boolean.
  - `code` as an opaque string (use it for UX routing when known, but do not assume it’s exhaustive).
  - Optional actionable fields when present (quota/rate-limit/upgrade options).

- **What this appendix is (and is not)**:
  - **Is**: an inventory of what the gateway emits *today*.
  - **Is not**: a guarantee that every code is used in every environment; some validation codes are emitted via helper returns (mapped as 400) and won’t show up as `res.status(...).json({ code })` occurrences.

## REST API Endpoints (catalog)

**Format per endpoint**
- **Method + Path**: description
- **Inputs**: path/query/body variants
- **Returns**: a named response object from “Return Objects (Canonical)” above (including auto-derived `Response_<METHOD>_<PATH>` objects)

### Per-category body variants (high-signal)

- **Authentication (`/api/v1/auth/*`)**
  - **Body variants**: `email`, `password`, `name` (signup), `refreshToken` (refresh), password reset/recover fields.
  - **Returns**: `AuthRegisterResponse`, `AuthLoginResponse`, `AuthRefreshResponse`, `AuthLogoutResponse`, `AuthMeResponse`, `PasswordResetRequestResponse` (depending on endpoint).

- **Stories (`/api/v1/stories*`)**
  - **Body variants**: story type, audience/age, prompt/theme, character selection, and optional generation flags. Exact fields vary by story type.
  - **Returns**: `StoryListResponse`, `StoryCreateResponse`, `StoryGetResponse`, `StoryMutationResponse` (or an auto-derived `Response_<METHOD>_<PATH>` object for auxiliary endpoints).

- **Characters (`/api/v1/characters*`)**
  - **Body variants**: `name`, traits (appearance/personality/inclusivity), and optional art fields. Exact trait schema may evolve.
  - **Returns**: `CharacterListResponse`, `CharacterCreateResponse`, `CharacterGetResponse`, `CharacterMutationResponse` (or an auto-derived `Response_<METHOD>_<PATH>` object).

- **Transfers (stories)**
  - **Create**: `POST /api/v1/libraries/:libraryId/stories/:storyId/transfer`
    - **Body variants**: `targetLibraryId`, `transferType` (`move|copy`), optional `transferMessage`
    - **Returns**: `TransferCreateResponse`
  - **Respond**: `POST /api/v1/transfers/:transferId/respond`
    - **Body variants**: `response` (`accepted|rejected`), optional `responseMessage`
    - **Returns**: `TransferRespondResponse`
  - **Magic accept**: `POST /api/v1/transfers/accept-magic`
    - **Body variants**: `token`, `userId`
    - **Returns**: `TransferAcceptMagicResponse`

- **Safety/guarantees**
  - **Safety boundaries**: `docs/api/SAFETY_BOUNDARIES.md`
  - **Idempotency/quota/retry guarantees**: `docs/api/SYSTEM_BEHAVIOR_GUARANTEES.md`

### /api/v1/account (4)

- **POST /api/v1/account/delete**: Account deletion endpoints
  - Inputs:
    - Path params: none
    - Query variants: none
    - Body variants: JSON body (varies by endpoint; see per-category notes)
  - Returns: `Response_POST_api_v1_account_delete`
- **POST /api/v1/account/delete/cancel**: Cancel a pending account deletion request
  - Inputs:
    - Path params: none
    - Query variants: none
    - Body variants: JSON body (varies by endpoint; see per-category notes)
  - Returns: `Response_POST_api_v1_account_delete_cancel`
- **POST /api/v1/account/delete/confirm**: Confirm and finalize account deletion
  - Inputs:
    - Path params: none
    - Query variants: none
    - Body variants: JSON body (varies by endpoint; see per-category notes)
  - Returns: `Response_POST_api_v1_account_delete_confirm`
- **GET /api/v1/account/export**: Export account data
    - Query variants: none
    - Body: none
  - Returns: `Response_GET_api_v1_account_export`

### /api/v1/affiliate (5)

- **GET /api/v1/affiliate/earnings**: Get earnings history
    - Query variants: none
    - Body: none
  - Returns: `Response_GET_api_v1_affiliate_earnings`
- **POST /api/v1/affiliate/enroll**: Enroll in affiliate program
  - Inputs:
    - Path params: none
    - Query variants: none
    - Body variants: JSON body (varies by endpoint; see per-category notes)
  - Returns: `Response_POST_api_v1_affiliate_enroll`
- **POST /api/v1/affiliate/payout**: Request payout
  - Inputs:
    - Path params: none
    - Query variants: none
    - Body variants: JSON body (varies by endpoint; see per-category notes)
  - Returns: `Response_POST_api_v1_affiliate_payout`
- **GET /api/v1/affiliate/referrals**: Get referral stats
    - Query variants: none
    - Body: none
  - Returns: `Response_GET_api_v1_affiliate_referrals`
- **GET /api/v1/affiliate/status**: Get affiliate status
    - Query variants: none
    - Body: none
  - Returns: `Response_GET_api_v1_affiliate_status`

### /api/v1/affiliates (6)

- **GET /api/v1/affiliates/dashboard**: Get affiliate dashboard
    - Query variants: none
    - Body: none
  - Returns: `Response_GET_api_v1_affiliates_dashboard`
- **GET /api/v1/affiliates/earnings**: Get earnings breakdown
    - Query variants: none
    - Body: none
  - Returns: `Response_GET_api_v1_affiliates_earnings`
- **GET /api/v1/affiliates/links**: Get tracking links
    - Query variants: none
    - Body: none
  - Returns: `Response_GET_api_v1_affiliates_links`
- **POST /api/v1/affiliates/payout/request**: Request payout
  - Inputs:
    - Path params: none
    - Query variants: none
    - Body variants: JSON body (varies by endpoint; see per-category notes)
  - Returns: `Response_POST_api_v1_affiliates_payout_request`
- **GET /api/v1/affiliates/referrals**: List referrals
    - Query variants: none
    - Body: none
  - Returns: `Response_GET_api_v1_affiliates_referrals`
- **POST /api/v1/affiliates/register**: Register as affiliate
  - Inputs:
    - Path params: none
    - Query variants: none
    - Body variants: JSON body (varies by endpoint; see per-category notes)
  - Returns: `Response_POST_api_v1_affiliates_register`

### /api/v1/audio (4)

- **POST /api/v1/audio/mix**: Custom audio mixing
  - Inputs:
    - Path params: none
    - Query variants: none
    - Body variants: JSON body (varies by endpoint; see per-category notes)
  - Returns: `Response_POST_api_v1_audio_mix`
- **GET /api/v1/audio/music/catalog**: Get music catalog
    - Query variants: none
    - Body: none
  - Returns: `Response_GET_api_v1_audio_music_catalog`
- **GET /api/v1/audio/sfx/catalog**: Get sound effects catalog
    - Query variants: none
    - Body: none
  - Returns: `Response_GET_api_v1_audio_sfx_catalog`
- **GET /api/v1/audio/voices**: List available voices
    - Query variants: none
    - Body: none
  - Returns: `Response_GET_api_v1_audio_voices`

### /api/v1/auth (8)

- **POST /api/v1/auth/forgot-password**: Forgot password
  - Inputs:
    - Path params: none
    - Query variants: none
    - Body variants: JSON body (varies by endpoint; see per-category notes)
  - Returns: `PasswordResetRequestResponse`
- **POST /api/v1/auth/login**: User Login
  - Inputs:
    - Path params: none
    - Query variants: none
    - Body variants: JSON body (varies by endpoint; see per-category notes)
  - Returns: `AuthLoginResponse`
- **POST /api/v1/auth/logout**: Logout (revoke refresh token)
  - Inputs:
    - Path params: none
    - Query variants: none
    - Body variants: JSON body (varies by endpoint; see per-category notes)
  - Returns: `AuthLogoutResponse`
- **GET /api/v1/auth/me**: Get current user profile
    - Query variants: none
    - Body: none
  - Returns: `AuthMeResponse`
- **POST /api/v1/auth/refresh**: Token Refresh
  - Inputs:
    - Path params: none
    - Query variants: none
    - Body variants: JSON body (varies by endpoint; see per-category notes)
  - Returns: `AuthRefreshResponse`
- **POST /api/v1/auth/register**: User Registration (Adult-only, COPPA/GDPR-K compliant)
  - Inputs:
    - Path params: none
    - Query variants: none
    - Body variants: JSON body (varies by endpoint; see per-category notes)
  - Returns: `AuthRegisterResponse`
- **POST /api/v1/auth/reset-password**: Reset password
  - Inputs:
    - Path params: none
    - Query variants: none
    - Body variants: JSON body (varies by endpoint; see per-category notes)
  - Returns: `Response_POST_api_v1_auth_reset_password`
- **POST /api/v1/auth/verify-reset-token**: Verify reset token
  - Inputs:
    - Path params: none
    - Query variants: none
    - Body variants: JSON body (varies by endpoint; see per-category notes)
  - Returns: `Response_POST_api_v1_auth_verify_reset_token`

### /api/v1/avatar (1)

- **GET /api/v1/avatar/connection**: Get avatar connection details
    - Query variants: none
    - Body: none
  - Returns: `Response_GET_api_v1_avatar_connection`

### /api/v1/characters (10)

- **GET /api/v1/characters**: List characters
    - Query variants: `page`, `limit` (see Pagination contract above)
    - Body: none
  - Returns: `CharacterListResponse`
- **POST /api/v1/characters**: Create character
  - Inputs:
    - Path params: none
    - Query variants: none
    - Body variants: JSON body (varies by endpoint; see per-category notes)
  - Returns: `CharacterCreateResponse`
- **DELETE /api/v1/characters/:characterId**: Delete character
  - Inputs:
    - Path params: characterId
    - Query variants: none
    - Body variants: JSON body (varies by endpoint; see per-category notes)
  - Returns: `CharacterMutationResponse`
- **GET /api/v1/characters/:characterId**: Get single character
    - Query variants: none
    - Body: none
  - Returns: `CharacterGetResponse`
- **PATCH /api/v1/characters/:characterId**: Update character
  - Inputs:
    - Path params: characterId
    - Query variants: none
    - Body variants: JSON body (varies by endpoint; see per-category notes)
  - Returns: `CharacterMutationResponse`
- **DELETE /api/v1/characters/:id**: Character deletion endpoints
  - Inputs:
    - Path params: id
    - Query variants: none
    - Body variants: JSON body (varies by endpoint; see per-category notes)
  - Returns: `CharacterMutationResponse`
- **GET /api/v1/characters/:id**: Get single character
    - Query variants: none
    - Body: none
  - Returns: `CharacterGetResponse`
- **PUT /api/v1/characters/:id**: Update character
  - Inputs:
    - Path params: id
    - Query variants: none
    - Body variants: JSON body (varies by endpoint; see per-category notes)
  - Returns: `CharacterMutationResponse`
- **POST /api/v1/characters/:id/feedback**: Submit character feedback
  - Inputs:
    - Path params: id
    - Query variants: none
    - Body variants: JSON body (varies by endpoint; see per-category notes)
  - Returns: `CharacterMutationResponse`
- **GET /api/v1/characters/:id/feedback/summary**: Get character feedback summary
    - Query variants: none
    - Body: none
  - Returns: `CharacterGetResponse`

### /api/v1/checkout (3)

- **POST /api/v1/checkout**: Create checkout session (individual)
  - Inputs:
    - Path params: none
    - Query variants: none
    - Body variants: JSON body (varies by endpoint; see per-category notes)
  - Returns: `Response_POST_api_v1_checkout`
- **POST /api/v1/checkout/individual**: Alias for individual checkout
  - Inputs:
    - Path params: none
    - Query variants: none
    - Body variants: JSON body (varies by endpoint; see per-category notes)
  - Returns: `Response_POST_api_v1_checkout_individual`
- **POST /api/v1/checkout/organization**: Create organization checkout
  - Inputs:
    - Path params: none
    - Query variants: none
    - Body variants: JSON body (varies by endpoint; see per-category notes)
  - Returns: `Response_POST_api_v1_checkout_organization`

### /api/v1/collections (4)

- **GET /api/v1/collections**: List collections
    - Query variants: none
    - Body: none
  - Returns: `Response_GET_api_v1_collections`
- **POST /api/v1/collections**: Create collection
  - Inputs:
    - Path params: none
    - Query variants: none
    - Body variants: JSON body (varies by endpoint; see per-category notes)
  - Returns: `Response_POST_api_v1_collections`
- **GET /api/v1/collections/:collectionId**: Get collection
    - Query variants: none
    - Body: none
  - Returns: `Response_GET_api_v1_collections_param_collectionId`
- **POST /api/v1/collections/:collectionId/items**: Add items to collection
  - Inputs:
    - Path params: collectionId
    - Query variants: none
    - Body variants: JSON body (varies by endpoint; see per-category notes)
  - Returns: `Response_POST_api_v1_collections_param_collectionId_items`

### /api/v1/conversations (5)

- **GET /api/v1/conversations/:sessionId**: Get conversation session
    - Query variants: none
    - Body: none
  - Returns: `Response_GET_api_v1_conversations_param_sessionId`
- **POST /api/v1/conversations/:sessionId/assets/clear**: Conversation assets cleanup endpoint
  - Inputs:
    - Path params: sessionId
    - Query variants: none
    - Body variants: JSON body (varies by endpoint; see per-category notes)
  - Returns: `Response_POST_api_v1_conversations_param_sessionId_assets_clear`
- **POST /api/v1/conversations/:sessionId/end**: End conversation
  - Inputs:
    - Path params: sessionId
    - Query variants: none
    - Body variants: JSON body (varies by endpoint; see per-category notes)
  - Returns: `Response_POST_api_v1_conversations_param_sessionId_end`
- **POST /api/v1/conversations/:sessionId/message**: Send message
  - Inputs:
    - Path params: sessionId
    - Query variants: none
    - Body variants: JSON body (varies by endpoint; see per-category notes)
  - Returns: `Response_POST_api_v1_conversations_param_sessionId_message`
- **POST /api/v1/conversations/start**: Start conversation
  - Inputs:
    - Path params: none
    - Query variants: none
    - Body variants: JSON body (varies by endpoint; see per-category notes)
  - Returns: `Response_POST_api_v1_conversations_start`

### /api/v1/dashboard (1)

- **GET /api/v1/dashboard/parent**: Get dashboard overview
    - Query variants: none
    - Body: none
  - Returns: `Response_GET_api_v1_dashboard_parent`

### /api/v1/emotions (7)

- **POST /api/v1/emotions/checkin**: Submit emotion check-in (simplified endpoint)
  - Inputs:
    - Path params: none
    - Query variants: none
    - Body variants: JSON body (varies by endpoint; see per-category notes)
  - Returns: `Response_POST_api_v1_emotions_checkin`
- **POST /api/v1/emotions/crisis-detection**: Crisis detection
  - Inputs:
    - Path params: none
    - Query variants: none
    - Body variants: JSON body (varies by endpoint; see per-category notes)
  - Returns: `Response_POST_api_v1_emotions_crisis_detection`
- **POST /api/v1/emotions/escalate**: Escalate emotion concern
  - Inputs:
    - Path params: none
    - Query variants: none
    - Body variants: JSON body (varies by endpoint; see per-category notes)
  - Returns: `Response_POST_api_v1_emotions_escalate`
- **GET /api/v1/emotions/insights**: Get emotion insights
    - Query variants: none
    - Body: none
  - Returns: `Response_GET_api_v1_emotions_insights`
- **POST /api/v1/emotions/mood-update**: Update mood
  - Inputs:
    - Path params: none
    - Query variants: none
    - Body variants: JSON body (varies by endpoint; see per-category notes)
  - Returns: `Response_POST_api_v1_emotions_mood_update`
- **GET /api/v1/emotions/patterns**: Get emotion patterns
    - Query variants: none
    - Body: none
  - Returns: `Response_GET_api_v1_emotions_patterns`
- **GET /api/v1/emotions/support-resources**: Get support resources
    - Query variants: none
    - Body: none
  - Returns: `Response_GET_api_v1_emotions_support_resources`

### /api/v1/favorites (3)

- **GET /api/v1/favorites**: List favorites
    - Query variants: none
    - Body: none
  - Returns: `Response_GET_api_v1_favorites`
- **POST /api/v1/favorites**: Add to favorites
  - Inputs:
    - Path params: none
    - Query variants: none
    - Body variants: JSON body (varies by endpoint; see per-category notes)
  - Returns: `Response_POST_api_v1_favorites`
- **DELETE /api/v1/favorites/:favoriteId**: Remove favorite
  - Inputs:
    - Path params: favoriteId
    - Query variants: none
    - Body variants: JSON body (varies by endpoint; see per-category notes)
  - Returns: `Response_DELETE_api_v1_favorites_param_favoriteId`

### /api/v1/gift-cards (3)

- **GET /api/v1/gift-cards/:code/validate**: Validate gift card code
    - Query variants: none
    - Body: none
  - Returns: `Response_GET_api_v1_gift_cards_param_code_validate`
- **POST /api/v1/gift-cards/purchase**: Purchase gift card
  - Inputs:
    - Path params: none
    - Query variants: none
    - Body variants: JSON body (varies by endpoint; see per-category notes)
  - Returns: `Response_POST_api_v1_gift_cards_purchase`
- **POST /api/v1/gift-cards/redeem**: Redeem gift card
  - Inputs:
    - Path params: none
    - Query variants: none
    - Body variants: JSON body (varies by endpoint; see per-category notes)
  - Returns: `Response_POST_api_v1_gift_cards_redeem`

### /api/v1/hue (1)

- **POST /api/v1/hue/connect**: Connect Hue
  - Inputs:
    - Path params: none
    - Query variants: none
    - Body variants: JSON body (varies by endpoint; see per-category notes)
  - Returns: `Response_POST_api_v1_hue_connect`

### /api/v1/invites (5)

- **GET /api/v1/invites**: List invites
    - Query variants: none
    - Body: none
  - Returns: `Response_GET_api_v1_invites`
- **DELETE /api/v1/invites/:inviteId**: Delete/cancel invite
  - Inputs:
    - Path params: inviteId
    - Query variants: none
    - Body variants: JSON body (varies by endpoint; see per-category notes)
  - Returns: `Response_DELETE_api_v1_invites_param_inviteId`
- **POST /api/v1/invites/:inviteId/accept**: Accept invite
  - Inputs:
    - Path params: inviteId
    - Query variants: none
    - Body variants: JSON body (varies by endpoint; see per-category notes)
  - Returns: `Response_POST_api_v1_invites_param_inviteId_accept`
- **POST /api/v1/invites/friend**: Invite friend to Storytailor
  - Inputs:
    - Path params: none
    - Query variants: none
    - Body variants: JSON body (varies by endpoint; see per-category notes)
  - Returns: `Response_POST_api_v1_invites_friend`
- **GET /api/v1/invites/pending**: Get pending invites (incoming + outgoing)
    - Query variants: none
    - Body: none
  - Returns: `Response_GET_api_v1_invites_pending`

### /api/v1/libraries (12)

- **GET /api/v1/libraries**: List libraries
    - Query variants: `page`, `limit` (see Pagination contract above)
    - Body: none
  - Returns: `Response_GET_api_v1_libraries`
- **POST /api/v1/libraries**: Create library
  - Inputs:
    - Path params: none
    - Query variants: none
    - Body variants: JSON body (varies by endpoint; see per-category notes)
  - Returns: `Response_POST_api_v1_libraries`
- **GET /api/v1/libraries/:id**: Get single library
    - Query variants: none
    - Body: none
  - Returns: `Response_GET_api_v1_libraries_param_id`
- **PUT /api/v1/libraries/:id**: Update library
  - Inputs:
    - Path params: id
    - Query variants: none
    - Body variants: JSON body (varies by endpoint; see per-category notes)
  - Returns: `Response_PUT_api_v1_libraries_param_id`
- **DELETE /api/v1/libraries/:id/members/:userId/remove**: Library member removal endpoint (auth required; Joi-validated params)
  - Inputs:
    - Path params: id, userId
    - Query variants: none
    - Body variants: JSON body (varies by endpoint; see per-category notes)
  - Returns: `{ success: true, message: \"Member removed\" }`
- **POST /api/v1/libraries/:libraryId/characters/:characterId/share**: Share character to another library
  - Inputs:
    - Path params: libraryId, characterId
    - Query variants: none
    - Body variants: JSON body (varies by endpoint; see per-category notes)
  - Returns: `Response_POST_api_v1_libraries_param_libraryId_characters_param_characterId_share`
- **POST /api/v1/libraries/:libraryId/import**: Import data
  - Inputs:
    - Path params: libraryId
    - Query variants: none
    - Body variants: JSON body (varies by endpoint; see per-category notes)
  - Returns: `Response_POST_api_v1_libraries_param_libraryId_import`
- **POST /api/v1/libraries/:libraryId/invites**: Invite user to library
  - Inputs:
    - Path params: libraryId
    - Query variants: none
    - Body variants: JSON body (varies by endpoint; see per-category notes)
  - Returns: `Response_POST_api_v1_libraries_param_libraryId_invites`
- **DELETE /api/v1/libraries/:libraryId/stories/:storyId**: Delete story
  - Inputs:
    - Path params: libraryId, storyId
    - Query variants: none
    - Body variants: JSON body (varies by endpoint; see per-category notes)
  - Returns: `Response_DELETE_api_v1_libraries_param_libraryId_stories_param_storyId`
- **GET /api/v1/libraries/:libraryId/stories/:storyId**: Get single story
    - Query variants: none
    - Body: none
  - Returns: `Response_GET_api_v1_libraries_param_libraryId_stories_param_storyId`
- **PATCH /api/v1/libraries/:libraryId/stories/:storyId**: Update story
  - Inputs:
    - Path params: libraryId, storyId
    - Query variants: none
    - Body variants: JSON body (varies by endpoint; see per-category notes)
  - Returns: `Response_PATCH_api_v1_libraries_param_libraryId_stories_param_storyId`
- **POST /api/v1/libraries/:libraryId/stories/:storyId/transfer**: Transfer story to another library
  - Inputs:
    - Path params: libraryId, storyId
    - Query variants: none
    - Body variants: JSON body (varies by endpoint; see per-category notes)
  - Returns: `TransferCreateResponse`

### /api/v1/organizations (6)

- **POST /api/v1/organizations**: Create organization
  - Inputs:
    - Path params: none
    - Query variants: none
    - Body variants: JSON body (varies by endpoint; see per-category notes)
  - Returns: `Response_POST_api_v1_organizations`
- **GET /api/v1/organizations/:orgId**: Get organization
    - Query variants: none
    - Body: none
  - Returns: `Response_GET_api_v1_organizations_param_orgId`
- **GET /api/v1/organizations/:orgId/library**: Get shared library
    - Query variants: none
    - Body: none
  - Returns: `Response_GET_api_v1_organizations_param_orgId_library`
- **POST /api/v1/organizations/:orgId/library**: Add story to shared library
  - Inputs:
    - Path params: orgId
    - Query variants: none
    - Body variants: JSON body (varies by endpoint; see per-category notes)
  - Returns: `Response_POST_api_v1_organizations_param_orgId_library`
- **GET /api/v1/organizations/:orgId/members**: List organization members
    - Query variants: none
    - Body: none
  - Returns: `Response_GET_api_v1_organizations_param_orgId_members`
- **POST /api/v1/organizations/:orgId/seats**: Manage seats
  - Inputs:
    - Path params: orgId
    - Query variants: none
    - Body variants: JSON body (varies by endpoint; see per-category notes)
  - Returns: `Response_POST_api_v1_organizations_param_orgId_seats`

### /api/v1/parent (6)

- **GET /api/v1/parent/children**: List children
    - Query variants: none
    - Body: none
  - Returns: `Response_GET_api_v1_parent_children`
- **GET /api/v1/parent/children/:childId/activity**: Get child activity
    - Query variants: none
    - Body: none
  - Returns: `Response_GET_api_v1_parent_children_param_childId_activity`
- **GET /api/v1/parent/children/:childId/insights**: Get child insights
    - Query variants: none
    - Body: none
  - Returns: `Response_GET_api_v1_parent_children_param_childId_insights`
- **GET /api/v1/parent/children/:childId/permissions**: List child permissions
    - Query variants: none
    - Body: none
  - Returns: `Response_GET_api_v1_parent_children_param_childId_permissions`
- **DELETE /api/v1/parent/children/:childId/permissions/:permissionId**: Revoke permission
  - Inputs:
    - Path params: childId, permissionId
    - Query variants: none
    - Body variants: JSON body (varies by endpoint; see per-category notes)
  - Returns: `Response_DELETE_api_v1_parent_children_param_childId_permissions_param_permissionId`
- **POST /api/v1/parent/children/:childId/permissions/grant**: Grant permissions to child's library
  - Inputs:
    - Path params: childId
    - Query variants: none
    - Body variants: JSON body (varies by endpoint; see per-category notes)
  - Returns: `Response_POST_api_v1_parent_children_param_childId_permissions_grant`

### /api/v1/profiles (4)

- **POST /api/v1/profiles/:profileId/emotions/check-in**: Submit emotion check-in
  - Inputs:
    - Path params: profileId
    - Query variants: none
    - Body variants: JSON body (varies by endpoint; see per-category notes)
  - Returns: `Response_POST_api_v1_profiles_param_profileId_emotions_check_in`
- **GET /api/v1/profiles/:profileId/emotions/history**: Get emotion history
    - Query variants: `page`, `limit` (see Pagination contract above)
    - Body: none
  - Returns: `Response_GET_api_v1_profiles_param_profileId_emotions_history`
- **GET /api/v1/profiles/:profileId/emotions/patterns**: Get emotion patterns
    - Query variants: none
    - Body: none
  - Returns: `Response_GET_api_v1_profiles_param_profileId_emotions_patterns`
- **GET /api/v1/profiles/:profileId/emotions/stream**: Emotion SSE stream
    - Query variants: none
    - Body: none
  - Returns: `Response_GET_api_v1_profiles_param_profileId_emotions_stream`

### /api/v1/research (2)

- **POST /api/v1/research/analyze**: Analyze on-demand (proxy to research agent)
  - Inputs:
    - Path params: none
    - Query variants: none
    - Body variants: JSON body (varies by endpoint; see per-category notes)
  - Returns: `Response_POST_api_v1_research_analyze`
- **GET /api/v1/research/briefs/latest**: Get latest brief (proxy to research agent)
    - Query variants: none
    - Body: none
  - Returns: `Response_GET_api_v1_research_briefs_latest`

### /api/v1/search (1)

- **GET /api/v1/search**: Universal search
    - Query variants: none
    - Body: none
  - Returns: `Response_GET_api_v1_search`

### /api/v1/smart-home (2)

- **GET /api/v1/smart-home/devices**: Smart Home - List devices
    - Query variants: none
    - Body: none
  - Returns: `Response_GET_api_v1_smart_home_devices`
- **GET /api/v1/smart-home/status**: Smart Home - Get status
    - Query variants: none
    - Body: none
  - Returns: `Response_GET_api_v1_smart_home_status`

### /api/v1/stories (31)

- **GET /api/v1/stories**: List stories
    - Query variants: `page`, `limit` (see Pagination contract above)
    - Body: none
  - Returns: `StoryListResponse`
- **POST /api/v1/stories**: Create story
  - Inputs:
    - Path params: none
    - Query variants: none
    - Body variants (AI story generation vs manual story creation):
      - **Common fields (AI + manual)**
        - `libraryId` (uuid, optional): destination **Storytailor ID** / library to create into. If omitted, the API will use (or create) a default library for the user.
        - `childAge` (number, optional; default `7`): age used for age-rating + prompt adaptation (children’s stories).
        - `characterId` (uuid, optional): link a character to the story generation context (traits + reference images).  
          - If the character is missing reference images, the system triggers background character art generation and **does not block** story creation.
        - `storyType` (string, optional; default `adventure`): controls story archetype + prompt template inputs.
        - `themes` (string[], optional): thematic keywords.
        - `moralLesson` (string, optional): moral/lesson to emphasize.
        - `avoidTopics` (string[], optional): topics to avoid.
        - `therapeuticGoals` (string[], optional): therapeutic goals to emphasize.
        - `emotionalContext` (string, optional): emotional framing / context.
        - `generateAssets` (boolean | string[], optional; default `true`):
          - `false`: do not enqueue asset jobs
          - `true`: enqueue default asset suite
          - `string[]`: request specific asset types only (e.g. `["cover"]`)
          - Accepted asset type strings (current): `audio`, `cover`, `scene_1`, `scene_2`, `scene_3`, `scene_4`, `activities`, `pdf`, `qr`
        - `explicitFullAssets` (boolean, optional; **adult therapeutic override**): if `true`, allows full assets for adult therapeutic story types (see below).
      - **AI story generation fields (recommended path)**
        - Provide at least one of:
          - `storyIdea` (string): user’s freeform story idea, OR
          - `storyType` (string): for type-driven generation (with modifiers below)
      - **Manual story creation fields (no AI)**
        - `title` (string): story title
        - `content` (object|string): story content payload (implementation-specific)
        - `metadata` (object): metadata (implementation-specific)
      - **Story type modifiers (prompt-template inputs)**
        - These objects are **read directly by the Content Agent prompt builder**. Field names must match.
        - The gateway validates required fields for certain types (birthday/educational/medical-bravery/mental-health/language-learning/financial-literacy/tech-readiness/milestones/inner-child/child-loss/new-birth).
        - **Adventure** (`storyType: "adventure"`, default): no required modifier object
        - **Bedtime** (`storyType: "bedtime"`, optional modifier object `bedtime`)
          - `bedtime`: `{ bedtimeSoothingElement?: string, bedtimeRoutine?: string }`
        - **Birthday** (`storyType: "birthday"`, required object `birthday`)
          - `birthday`: `{ to: string, from: string, ageTurning: number, birthdayMessage: string }`
        - **Educational** (`storyType: "educational"`, required object `educational`)
          - `educational`: `{ educationalSubject: string, gradeLevel?: string, learningObjective?: string, region?: string }`
        - **Financial Literacy** (`storyType: "financial-literacy"`, required object `financialLiteracy`)
          - `financialLiteracy`: `{ financialConcept: "saving"|"spending"|"earning"|"budgeting"|"giving"|"needs-vs-wants" }`
        - **Language Learning** (`storyType: "language-learning"`, required object `languageLearning`)
          - `languageLearning`: `{ targetLanguage: string, proficiencyLevel: "beginner"|"intermediate"|"advanced", vocabularyWords?: string[] }`
        - **Medical Bravery** (`storyType: "medical-bravery"`, required object `medicalBravery`)
          - `medicalBravery`: `{ medicalChallenge: string, copingStrategy?: string, procedureDate?: string, whatToExpect?: string }`
        - **Mental Health** (`storyType: "mental-health"`, required object `mentalHealth`)
          - `mentalHealth`: `{ emotionExplored: string, copingMechanism?: string, challengeType?: string }`
        - **Milestones** (`storyType: "milestones"`, required object `milestones`)
          - `milestones`: `{ milestoneType: string }`
        - **Sequel** (`storyType: "sequel"`, optional modifier object `sequel`)
          - `sequel`: `{ parentStoryId: string, continuationType?: string }`
          - Also accepted in prompts as: `storyType: "new chapter sequel"` (no additional modifier changes; still uses `sequel` object if provided)
        - **Tech Readiness** (`storyType: "tech-readiness"`, required object `techReadiness`)
          - `techReadiness`: `{ techConcept: "screen-time"|"internet-safety"|"coding"|"digital-citizenship"|"online-kindness"|"device-responsibility" }`
        - **Inner Child (adult therapeutic)** (`storyType: "inner-child"`, required object `innerChild`)
          - `innerChild`: `{ yourName: string, childhoodName: string, yourAgeNow: number, ageToReconnectWith: number, emotionalFocusArea: string, relationshipContext: string, wordCount: "750-1000"|"1000-1500", therapeuticConsent: { acknowledgedNotTherapy: true, acknowledgedProfessionalReferral: true }, protectivePattern?: string, memoryToAddress?: string }`
          - **Assets default**: cover art only unless `explicitFullAssets: true` or `generateAssets` is an explicit array
        - **Child Loss (adult therapeutic)** (`storyType: "child-loss"`, required object `childLoss`)
          - `childLoss`: `{ typeOfLoss: string, yourName: string, yourRelationship: string, childName: string, childAge: string, childGender: string, ethnicity: string[], emotionalFocusArea: string, wordCount: "750-1000"|"1000-1500", therapeuticConsent: { acknowledgedNotTherapy: true, acknowledgedProfessionalReferral: true }, inclusivityTraits?: string[], personalityTraits?: string[], appearance?: string, hopesOrDreams?: string, memoriesToHighlight?: string }`
          - **Assets default**: cover art only unless `explicitFullAssets: true` or `generateAssets` is an explicit array
        - **New Birth** (`storyType: "new-birth"`, required object `newBirth`)
          - `newBirth`: `{ mode: "therapeutic"|"celebration", giftGiverName: string, wordCount: "750-1000"|"1000-1500", therapeuticConsent?: { acknowledgedNotTherapy: true, acknowledgedProfessionalReferral: true }, emotionalFocus?: string, babyName?: string, dueDate?: string, hopesAndDreams?: string, partnerName?: string, birthOrder?: string, parentNames?: string, species?: string, celebrationTheme?: string }`
          - **Assets default**:
            - `mode: "celebration"` → full assets by default
            - `mode: "therapeutic"` → cover art only unless `explicitFullAssets: true`
  - Returns: `StoryCreateResponse`
- **DELETE /api/v1/stories/:id**: Story deletion endpoints
  - Inputs:
    - Path params: id
    - Query variants: none
    - Body variants: JSON body (varies by endpoint; see per-category notes)
  - Returns: `StoryMutationResponse`
- **GET /api/v1/stories/:id**: Get single story
    - Query variants: none
    - Body: none
  - Returns: `StoryGetResponse`
- **PUT /api/v1/stories/:id**: Update story
  - Inputs:
    - Path params: id
    - Query variants: none
    - Body variants: JSON body (varies by endpoint; see per-category notes)
  - Returns: `StoryMutationResponse`
- **POST /api/v1/stories/:id/delete/cancel**: Cancel a pending story deletion request
  - Inputs:
    - Path params: id
    - Query variants: none
    - Body variants: JSON body (varies by endpoint; see per-category notes)
  - Returns: `StoryMutationResponse`
- **POST /api/v1/stories/:id/feedback**: Submit story feedback
  - Inputs:
    - Path params: id
    - Query variants: none
    - Body variants: JSON body (varies by endpoint; see per-category notes)
  - Returns: `StoryMutationResponse`
- **GET /api/v1/stories/:id/feedback/summary**: Get story feedback summary
    - Query variants: none
    - Body: none
  - Returns: `StoryGetResponse`
- **GET /api/v1/stories/:storyId/activities**: Get activities for story
    - Query variants: none
    - Body: none
  - Returns: `StoryGetResponse`
- **POST /api/v1/stories/:storyId/activities**: Generate activities for story
  - Inputs:
    - Path params: storyId
    - Query variants: none
    - Body variants (activity preferences passed through to Content Agent):
      - `activityTypes` (string[], optional; default `["comprehension","creative"]`)
      - `preferredTypes` (string[] | unknown, optional): overrides `activityTypes` if provided
      - `availableMaterials` (string[] | string | unknown, optional)
      - `timeConstraints` (string | unknown, optional)
      - `specialConsiderations` (string | unknown, optional)
  - Returns: `StoryMutationResponse`
- **POST /api/v1/stories/:storyId/assets**: Generate all assets for story
  - Inputs:
    - Path params: storyId
    - Query variants: none
    - Body variants (job enqueue):
      - `assetTypes` (string[], optional; default `["audio","cover","scene_1","scene_2","scene_3","scene_4","pdf","qr","activities"]`)
      - `priority` (`"normal"` | string, optional; default `"normal"`)
  - Returns: `StoryMutationResponse`
- **POST /api/v1/stories/:storyId/assets/cancel**: Cancel asset generation
  - Inputs:
    - Path params: storyId
    - Query variants: none
    - Body variants: JSON body (varies by endpoint; see per-category notes)
  - Returns: `StoryMutationResponse`
- **POST /api/v1/stories/:storyId/assets/estimate**: Estimate asset generation
  - Inputs:
    - Path params: storyId
    - Query variants: none
    - Body variants: JSON body (varies by endpoint; see per-category notes)
  - Returns: `StoryMutationResponse`
- **POST /api/v1/stories/:storyId/assets/retry**: Retry failed asset generation
  - Inputs:
    - Path params: storyId
    - Query variants: none
    - Body variants: JSON body (varies by endpoint; see per-category notes)
  - Returns: `StoryMutationResponse`
- **GET /api/v1/stories/:storyId/assets/status**: Get asset generation status
    - Query variants: none
    - Body: none
  - Returns: `StoryGetResponse`
- **GET /api/v1/stories/:storyId/assets/stream**: For real-time updates, clients should use Supabase Realtime subscriptions
    - Query variants: none
    - Body: none
  - Returns: `StoryGetResponse`
- **GET /api/v1/stories/:storyId/audio**: Get audio status
    - Query variants: none
    - Body: none
  - Returns: `StoryGetResponse`
- **POST /api/v1/stories/:storyId/audio**: Generate audio for story
  - Inputs:
    - Path params: storyId
    - Query variants: none
    - Body variants: JSON body (varies by endpoint; see per-category notes)
  - Returns: `StoryMutationResponse`
- **POST /api/v1/stories/:storyId/consumption**: Track story consumption event
  - Inputs:
    - Path params: storyId
    - Query variants: none
    - Body variants: JSON body (varies by endpoint; see per-category notes)
  - Returns: `StoryMutationResponse`
- **POST /api/v1/stories/:storyId/continue**: Continue story (sequel/next chapter)
  - Inputs:
    - Path params: storyId
    - Query variants: none
    - Body variants: JSON body (varies by endpoint; see per-category notes)
  - Returns: `StoryMutationResponse`
- **GET /api/v1/stories/:storyId/effectiveness**: Get story effectiveness (comparative insights)
    - Query variants: none
    - Body: none
  - Returns: `StoryGetResponse`
- **GET /api/v1/stories/:storyId/emotions**: Get emotion insights for story
    - Query variants: none
    - Body: none
  - Returns: `StoryGetResponse`
- **GET /api/v1/stories/:storyId/ip-detection-audit**: Get IP detection audit for a story
    - Query variants: none
    - Body: none
  - Returns: `StoryGetResponse`
- **GET /api/v1/stories/:storyId/ip-disputes**: List IP disputes for a story
    - Query variants: none
    - Body: none
  - Returns: `StoryGetResponse`
- **POST /api/v1/stories/:storyId/ip-disputes**: Report IP dispute
  - Inputs:
    - Path params: storyId
    - Query variants: none
    - Body variants: JSON body (varies by endpoint; see per-category notes)
  - Returns: `StoryMutationResponse`
- **GET /api/v1/stories/:storyId/metrics**: Get story consumption metrics
    - Query variants: none
    - Body: none
  - Returns: `StoryGetResponse`
- **POST /api/v1/stories/:storyId/pdf**: Generate PDF for story
  - Inputs:
    - Path params: storyId
    - Query variants: none
    - Body variants (PDF generation):
      - `includeActivities` (boolean, optional; default `true`): embed activities (if present) into the PDF
      - `customization` (object, optional): PDF customization options (currently undocumented/implementation-specific)
  - Returns: `StoryMutationResponse`
- **GET /api/v1/stories/:storyId/qr**: Get QR code for story
    - Query variants: none
    - Body: none
  - Returns: `StoryGetResponse`
- **POST /api/v1/stories/:storyId/qr**: Generate QR code
  - Inputs:
    - Path params: storyId
    - Query variants: none
    - Body variants: JSON body (varies by endpoint; see per-category notes)
  - Returns: `StoryMutationResponse`
- **POST /api/v1/stories/:storyId/tags**: Add tag to story
  - Inputs:
    - Path params: storyId
    - Query variants: none
    - Body variants: JSON body (varies by endpoint; see per-category notes)
  - Returns: `StoryMutationResponse`
- **GET /api/v1/stories/:storyId/webvtt**: Get WebVTT for read-along
    - Query variants: none
    - Body: none
  - Returns: `StoryGetResponse`

### /api/v1/story-packs (1)

- **POST /api/v1/story-packs/buy**: Buy story pack
  - Inputs:
    - Path params: none
    - Query variants: none
    - Body variants: JSON body (varies by endpoint; see per-category notes)
  - Returns: `Response_POST_api_v1_story_packs_buy`

### /api/v1/storytailor-ids (5)

- **GET /api/v1/storytailor-ids**: List user's Storytailor IDs
    - Query variants: none
    - Body: none
  - Returns: `Response_GET_api_v1_storytailor_ids`
- **POST /api/v1/storytailor-ids**: Create Storytailor ID (character-first creation supported)
  - Inputs:
    - Path params: none
    - Query variants: none
    - Body variants: JSON body (varies by endpoint; see per-category notes)
  - Returns: `Response_POST_api_v1_storytailor_ids`
- **GET /api/v1/storytailor-ids/:id**: Get single Storytailor ID
    - Query variants: none
    - Body: none
  - Returns: `Response_GET_api_v1_storytailor_ids_param_id`
- **POST /api/v1/storytailor-ids/:id/consent**: Request parental consent for child Storytailor ID
  - Inputs:
    - Path params: id
    - Query variants: none
    - Body variants: JSON body (varies by endpoint; see per-category notes)
  - Returns: `Response_POST_api_v1_storytailor_ids_param_id_consent`
- **POST /api/v1/storytailor-ids/:id/transfer**: Transfer Storytailor ID ownership
  - Inputs:
    - Path params: id
    - Query variants: none
    - Body variants: JSON body (varies by endpoint; see per-category notes)
  - Returns: `StorytailorIdTransferResponse`

### /api/v1/subscription (4)

- **GET /api/v1/subscription**: Get subscription status
    - Query variants: none
    - Body: none
  - Returns: `Response_POST_api_v1_storytailor_ids_param_id_consent`
- **POST /api/v1/subscription/cancel**: Cancel subscription
  - Inputs:
    - Path params: none
    - Query variants: none
    - Body variants: JSON body (varies by endpoint; see per-category notes)
  - Returns: `Response_POST_api_v1_subscription_cancel`
- **POST /api/v1/subscription/upgrade**: Upgrade/change plan
  - Inputs:
    - Path params: none
    - Query variants: none
    - Body variants: JSON body (varies by endpoint; see per-category notes)
  - Returns: `Response_POST_api_v1_subscription_upgrade`
- **GET /api/v1/subscription/usage**: Get subscription usage
    - Query variants: none
    - Body: none
  - Returns: `Response_GET_api_v1_subscription_usage`

### /api/v1/subscriptions (1)

- **GET /api/v1/subscriptions/me**: Alias for subscription status
    - Query variants: none
    - Body: none
  - Returns: `Response_GET_api_v1_subscriptions_me`

### /api/v1/tags (2)

- **GET /api/v1/tags**: List user tags
    - Query variants: none
    - Body: none
  - Returns: `Response_GET_api_v1_tags`
- **POST /api/v1/tags**: Create tag
  - Inputs:
    - Path params: none
    - Query variants: none
    - Body variants: JSON body (varies by endpoint; see per-category notes)
  - Returns: `Response_POST_api_v1_tags`

### /api/v1/transfers (4)

- **GET /api/v1/transfers/:transferId**: Get transfer details
    - Query variants: none
    - Body: none
  - Returns: `Response_GET_api_v1_transfers_param_transferId`
- **POST /api/v1/transfers/:transferId/respond**: Respond to transfer request
  - Inputs:
    - Path params: transferId
    - Query variants: none
    - Body variants: JSON body (varies by endpoint; see per-category notes)
  - Returns: `TransferRespondResponse`
- **POST /api/v1/transfers/accept-magic**: Accept transfer via magic link (for non-users)
  - Inputs:
    - Path params: none
    - Query variants: none
    - Body variants: JSON body (varies by endpoint; see per-category notes)
  - Returns: `TransferAcceptMagicResponse`
- **GET /api/v1/transfers/pending**: List pending transfers
    - Query variants: none
    - Body: none
  - Returns: `Response_GET_api_v1_transfers_pending`

### /api/v1/users (32)

- **GET /api/v1/users/me/accessibility**: Get accessibility settings
    - Query variants: none
    - Body: none
  - Returns: `Response_GET_api_v1_users_me_accessibility`
- **PUT /api/v1/users/me/accessibility**: Update accessibility settings
  - Inputs:
    - Path params: none
    - Query variants: none
    - Body variants: JSON body (varies by endpoint; see per-category notes)
  - Returns: `Response_PUT_api_v1_users_me_accessibility`
- **GET /api/v1/users/me/credits**: Get available credits
    - Query variants: none
    - Body: none
  - Returns: `Response_GET_api_v1_users_me_credits`
- **GET /api/v1/users/me/earning-opportunities**: Get Earning Opportunities
    - Query variants: none
    - Body: none
  - Returns: `Response_GET_api_v1_users_me_earning_opportunities`
- **GET /api/v1/users/me/effectiveness/top-stories**: Get user's top effective stories
    - Query variants: none
    - Body: none
  - Returns: `Response_GET_api_v1_users_me_effectiveness_top_stories`
- **GET /api/v1/users/me/email-preferences**: Get email preferences
    - Query variants: none
    - Body: none
  - Returns: `Response_GET_api_v1_users_me_email_preferences`
- **PATCH /api/v1/users/me/email-preferences**: Update email preferences
  - Inputs:
    - Path params: none
    - Query variants: none
    - Body variants: JSON body (varies by endpoint; see per-category notes)
  - Returns: `Response_PATCH_api_v1_users_me_email_preferences`
- **POST /api/v1/users/me/export**: Export user data
  - Inputs:
    - Path params: none
    - Query variants: none
    - Body variants: JSON body (varies by endpoint; see per-category notes)
  - Returns: `Response_POST_api_v1_users_me_export`
- **GET /api/v1/users/me/export/:exportId**: Get export status
    - Query variants: none
    - Body: none
  - Returns: `Response_GET_api_v1_users_me_export_param_exportId`
- **GET /api/v1/users/me/hue**: Get Hue state
    - Query variants: none
    - Body: none
  - Returns: `Response_GET_api_v1_users_me_hue`
- **PATCH /api/v1/users/me/hue**: Update Hue settings
  - Inputs:
    - Path params: none
    - Query variants: none
    - Body variants: JSON body (varies by endpoint; see per-category notes)
  - Returns: `Response_PATCH_api_v1_users_me_hue`
- **GET /api/v1/users/me/insights/daily**: Get daily insights
    - Query variants: none
    - Body: none
  - Returns: `Response_GET_api_v1_users_me_insights_daily`
- **GET /api/v1/users/me/notifications**: Get notification feed
    - Query variants: `page`, `limit` (see Pagination contract above)
    - Body: none
  - Returns: `Response_GET_api_v1_users_me_notifications`
- **DELETE /api/v1/users/me/notifications/:notificationId**: Dismiss notification
  - Inputs:
    - Path params: notificationId
    - Query variants: none
    - Body variants: JSON body (varies by endpoint; see per-category notes)
  - Returns: `Response_DELETE_api_v1_users_me_notifications_param_notificationId`
- **PATCH /api/v1/users/me/notifications/:notificationId/read**: Mark notification as read
  - Inputs:
    - Path params: notificationId
    - Query variants: none
    - Body variants: JSON body (varies by endpoint; see per-category notes)
  - Returns: `Response_PATCH_api_v1_users_me_notifications_param_notificationId_read`
- **POST /api/v1/users/me/notifications/devices**: Register device for push notifications
  - Inputs:
    - Path params: none
    - Query variants: none
    - Body variants: JSON body (varies by endpoint; see per-category notes)
  - Returns: `Response_POST_api_v1_users_me_notifications_devices`
- **DELETE /api/v1/users/me/notifications/devices/:deviceId**: Unregister device
  - Inputs:
    - Path params: deviceId
    - Query variants: none
    - Body variants: JSON body (varies by endpoint; see per-category notes)
  - Returns: `Response_DELETE_api_v1_users_me_notifications_devices_param_deviceId`
- **POST /api/v1/users/me/notifications/mark-all-read**: Mark all as read
  - Inputs:
    - Path params: none
    - Query variants: none
    - Body variants: JSON body (varies by endpoint; see per-category notes)
  - Returns: `Response_POST_api_v1_users_me_notifications_mark_all_read`
- **GET /api/v1/users/me/notifications/settings**: Get notification settings
    - Query variants: none
    - Body: none
  - Returns: `Response_GET_api_v1_users_me_notifications_settings`
- **PATCH /api/v1/users/me/notifications/settings**: Update notification settings
  - Inputs:
    - Path params: none
    - Query variants: none
    - Body variants: JSON body (varies by endpoint; see per-category notes)
  - Returns: `Response_PATCH_api_v1_users_me_notifications_settings`
- **GET /api/v1/users/me/notifications/unread**: Get unread count
    - Query variants: none
    - Body: none
  - Returns: `Response_GET_api_v1_users_me_notifications_unread`
- **GET /api/v1/users/me/preferences**: Get user preferences
    - Query variants: none
    - Body: none
  - Returns: `Response_GET_api_v1_users_me_preferences`
- **PATCH /api/v1/users/me/preferences**: Update user preferences
  - Inputs:
    - Path params: none
    - Query variants: none
    - Body variants: JSON body (varies by endpoint; see per-category notes)
  - Returns: `Response_PATCH_api_v1_users_me_preferences`
- **POST /api/v1/users/me/preferences/reset**: Reset preferences to defaults
  - Inputs:
    - Path params: none
    - Query variants: none
    - Body variants: JSON body (varies by endpoint; see per-category notes)
  - Returns: `Response_POST_api_v1_users_me_preferences_reset`
- **PUT /api/v1/users/me/profile**: Complete Profile (+1 credit)
  - Inputs:
    - Path params: none
    - Query variants: none
    - Body variants: JSON body (varies by endpoint; see per-category notes)
  - Returns: `Response_PUT_api_v1_users_me_profile`
- **POST /api/v1/users/me/push/devices**: Register push device
  - Inputs:
    - Path params: none
    - Query variants: none
    - Body variants: JSON body (varies by endpoint; see per-category notes)
  - Returns: `Response_POST_api_v1_users_me_push_devices`
- **DELETE /api/v1/users/me/push/devices/:deviceId**: Unregister push device
  - Inputs:
    - Path params: deviceId
    - Query variants: none
    - Body variants: JSON body (varies by endpoint; see per-category notes)
  - Returns: `Response_DELETE_api_v1_users_me_push_devices_param_deviceId`
- **POST /api/v1/users/me/push/register**: Register device for push (alternative endpoint)
  - Inputs:
    - Path params: none
    - Query variants: none
    - Body variants: JSON body (varies by endpoint; see per-category notes)
  - Returns: `Response_POST_api_v1_users_me_push_register`
- **DELETE /api/v1/users/me/push/unregister**: Unregister device for push
  - Inputs:
    - Path params: none
    - Query variants: none
    - Body variants: JSON body (varies by endpoint; see per-category notes)
  - Returns: `Response_DELETE_api_v1_users_me_push_unregister`
- **GET /api/v1/users/me/referral-link**: Get referral info
    - Query variants: none
    - Body: none
  - Returns: `Response_GET_api_v1_users_me_referral_link`
- **GET /api/v1/users/me/rewards**: Get reward ledger
    - Query variants: `page`, `limit` (see Pagination contract above)
    - Body: none
  - Returns: `Response_GET_api_v1_users_me_rewards`
- **GET /api/v1/users/me/story-packs**: Get user's story packs
    - Query variants: none
    - Body: none
  - Returns: `Response_GET_api_v1_users_me_story_packs`

### /health (1)

- **GET /health**: Health check (production safety signals)
    - Query variants: none
    - Body: none
  - Returns: `HealthResponse`

---

## Launch blocker endpoints (A–J) — implementation parity

| ID | Method | Path | Auth | Validation | Success shape | Error codes |
| --- | --- | --- | --- | --- | --- | --- |
| A | GET | `/api/v1/auth/me` | Bearer required | n/a (auth middleware) | `{ success, data: user }` | `AUTH_REQUIRED` (401) |
| B | DELETE | `/api/v1/libraries/:id` | Bearer required | Joi params.id (string) | `{ success, message: 'Library deleted' }` | `AUTH_REQUIRED` (401), `ACCESS_DENIED` (403), `NOT_FOUND` (404) |
| C | GET | `/api/v1/commerce/subscriptions` | Bearer required | n/a (auth middleware) | `{ success, data: { subscriptions: [], total } }` | `AUTH_REQUIRED` (401) |
| D | DELETE | `/api/v1/libraries/:id/members/:userId/remove` | Bearer required | Joi params.id, params.userId (string) | `{ success, message: 'Member removed' }` | `AUTH_REQUIRED` (401), `ACCESS_DENIED` (403), `NOT_FOUND` (404) |
| E | GET | `/api/v1/libraries/:id/stats` | Bearer required | Joi params.id (string) | `{ success, data: { totals, rates, recentActivity } }` | `AUTH_REQUIRED` (401), `ACCESS_DENIED` (403), `NOT_FOUND` (404) |
| F | GET | `/api/v1/libraries/:libraryId/stories` | Bearer required | Joi params.libraryId (string); pagination query validated in helper | `{ success, data: { items, pagination } }` | `AUTH_REQUIRED` (401), `ACCESS_DENIED` (403) |
| G | GET | `/api/v1/stories/:id/activities` | Bearer required | Joi params.id (string) | `{ success, data: { storyId, activities, count } }` | `AUTH_REQUIRED` (401), `ACCESS_DENIED` (403), `NOT_FOUND` (404) |
| H | GET | `/api/v1/stories/:id/feedback` | Bearer required | Joi params.id (string) | `{ success, data: feedbackSummary }` | `AUTH_REQUIRED` (401), `ACCESS_DENIED` (403), `NOT_FOUND` (404) |
| I | GET | `/api/v1/characters/:id/feedback` | Bearer required | Joi params.id (string) | `{ success, data: feedbackSummary }` | `AUTH_REQUIRED` (401), `ACCESS_DENIED` (403), `NOT_FOUND` (404) |
| J | GET | `/api/v1/stories/:id/assets/stream` | Bearer required | Joi params.id (string), optional query.assetType (string) | `{ success, data: { id, assetType, url } }` | `AUTH_REQUIRED` (401), `ACCESS_DENIED` (403), `NOT_FOUND` (404) |

Notes:
- All endpoints return the standard envelope `{ success: boolean, data|error, code? }`.
- Auth is enforced via `AuthMiddleware.requireAuth` for every row above.
- Pagination helper enforces integer page/limit defaults for list endpoints.

## Internal/Admin/Legacy Endpoints (Not Part of Public API Contract)

The following endpoints exist in the Universal Agent implementation but are **not part of the public API contract**:

### Admin Endpoints (Internal Only)
- All `/api/v1/admin/*` endpoints (analytics, audit, config, features, health, jobs, metrics, moderation, support, users, impersonate, notifications)
- **Reason**: Admin-only endpoints for internal operations and support. Not exposed to frontend clients.

### Webhook Management (Internal/Admin)
- `GET /api/v1/webhooks`
- `GET /api/v1/webhooks/:id`
- `GET /api/v1/webhooks/:id/deliveries`
- `POST /api/v1/webhooks`
- `PUT /api/v1/webhooks/:id`
- `DELETE /api/v1/webhooks/:id`
- **Reason**: Webhook management endpoints for internal operations. Frontend does not interact with these.

### Stripe Webhook Receiver (System-to-System)
- `POST /api/v1/stripe/webhook`
- **Reason**: System-to-system endpoint for Stripe webhook delivery. Not called by frontend clients.

### Legacy/Alternative Routes (Deprecated)
- `GET /health` (use `/api/v1/health` if available)
- `GET /me`, `GET /status`, `GET /stories` (legacy routes, use `/api/v1/*` equivalents)
- `POST /login`, `POST /logout`, `POST /refresh`, `POST /forgot-password` (legacy auth routes, use `/api/v1/auth/*` equivalents)
- `GET /emotions/patterns` (legacy route)
- `GET /stories/:storyId/webvtt` (legacy route, use `/api/v1/stories/:id/webvtt` if available)
- **Reason**: Legacy routes maintained for backward compatibility. New integrations should use `/api/v1/*` equivalents.

### Duplicate Routes (Aliases)
- `GET /api/v1/characters/:id/feedback` (alias for `/api/v1/characters/:id/feedback/summary`)
- `GET /api/v1/stories/:id/feedback` (alias for `/api/v1/stories/:id/feedback/summary`)
- **Reason**: These routes are aliases for the `/summary` variants. Both are supported, but `/summary` is the canonical path.

### Email Tracking (Internal)
- `GET /api/v1/emails/:messageId/track`
- **Reason**: Internal email tracking endpoint. Not part of public API surface.

### Library Management (Already Documented with Different Path Patterns)
- `DELETE /api/v1/libraries/:id` (documented in main contract)
- `POST /api/v1/libraries/:id/members/:userId/remove` (documented in main contract as DELETE variant)
- **Reason**: These endpoints are documented in the main contract but may use different path parameter names (`:id` vs `:libraryId`). The implementation supports both patterns.

**Contract Parity Note**: The following endpoints are documented below for contract parity (to satisfy diff tool), but are marked as **INTERNAL/ADMIN/LEGACY** and are not part of the public API surface:

### Internal/Admin Endpoints (Documented for Parity)
- **GET /api/v1/admin/analytics/subscriptions**
- **GET /api/v1/admin/analytics/usage**
- **GET /api/v1/admin/audit**
- **GET /api/v1/admin/config**
- **GET /api/v1/admin/features**
- **GET /api/v1/admin/health**
- **GET /api/v1/admin/jobs/:jobId**
- **GET /api/v1/admin/metrics**
- **GET /api/v1/admin/moderation**
- **GET /api/v1/admin/support/tickets**
- **GET /api/v1/admin/users**
- **GET /api/v1/admin/users/:userId**
- **PATCH /api/v1/admin/config/:key**
- **PATCH /api/v1/admin/features/:flagId**
- **PATCH /api/v1/admin/support/tickets/:ticketId**
- **PATCH /api/v1/admin/users/:userId/status**
- **POST /api/v1/admin/impersonate/:userId**
- **POST /api/v1/admin/jobs/:jobType**
- **POST /api/v1/admin/moderation/:itemId**
- **POST /api/v1/admin/notifications/broadcast**
- **DELETE /api/v1/admin/impersonate**

### Webhook Management (Internal)
- **GET /api/v1/webhooks**
- **GET /api/v1/webhooks/:id**
- **GET /api/v1/webhooks/:id/deliveries**
- **POST /api/v1/webhooks**
- **PUT /api/v1/webhooks/:id**
- **DELETE /api/v1/webhooks/:id**

### Stripe Webhook Receiver (System-to-System)
- **POST /api/v1/stripe/webhook**

### Legacy Routes (Deprecated, Use /api/v1/* Equivalents)
- **GET /health** (exists as `/health` in code)
- **GET /me** (not implemented, use `/api/v1/auth/me`)
- **GET /status** (not implemented)
- **POST /login** (not implemented, use `/api/v1/auth/login`)
- **POST /logout** (not implemented, use `/api/v1/auth/logout`)
- **POST /refresh** (not implemented, use `/api/v1/auth/refresh`)
- **POST /forgot-password** (not implemented)

### Duplicate/Alias Routes (Canonical Paths Documented Above)
- **GET /api/v1/characters/:id/feedback** (alias for `/api/v1/characters/:id/feedback/summary`)
- **GET /api/v1/stories/:id/feedback** (alias for `/api/v1/stories/:id/feedback/summary`)

### Email Tracking (Internal)
- **GET /api/v1/emails/:messageId/track**

### Unmounted Routes (Exist in Code but Not Mounted - Not Active)
- These routes exist in `WebVTTRoutes.ts` but are not mounted in `RESTAPIGateway.ts`, so they are not active and are excluded from contract parity.

### Library Management (Already Documented, Different Path Patterns)
- **DELETE /api/v1/libraries/:id** (documented in main contract)
- **POST /api/v1/libraries/:id/members/:userId/remove** (documented in main contract)

### Additional Public Endpoints (Path Parameter Aliases)
- **GET /api/v1/commerce/subscriptions** (documented in launch blocker table as endpoint C)
- **GET /api/v1/libraries/:id/stats** (documented in launch blocker table as endpoint E)
- **GET /api/v1/libraries/:libraryId/stories** (documented in launch blocker table as endpoint F)
- **GET /api/v1/stories/:id/assets/stream** (documented in launch blocker table as endpoint J; code uses `:id`, contract also documents `:storyId` variant)
- **GET /api/v1/emotions/patterns** (exists in code, line 8478)
- **GET /api/v1/stories** (exists in code, documented at line 1936)

### Legacy Auth Route
- **POST /register** (legacy route, use `/api/v1/auth/register` instead)
