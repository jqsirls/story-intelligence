### Commerce REST API Contracts (canonical, audit-grade)

This document is the canonical source of truth for Storytailor commerce REST API contracts.

- **Governing ruleset**: `docs/commerce/entitlement-model.md` defines entitlement precedence, state machines, and invariants. This doc defines the **wire contracts** for commerce endpoints and ties them to current implementation + current Supabase schema.
- **No guessing rule**: every contract statement must be grounded in current code and current Supabase schema. If the schema does not match code, we mark the mismatch explicitly as **NOT PRESENT** or **NON-CANONICAL**.

---

### Preflight (required; must stay at top)

#### 1) Implementation inventory (current code)

For every endpoint documented in this file, this inventory lists:

- **method + path**
- **exact handler function name** (or **anonymous inline handler** if unnamed)
- **exact file path + line range**

**Primary router file**: `packages/universal-agent/src/api/RESTAPIGateway.ts`

| Endpoint                        | Method | Handler function name                                                                 | Implementation location (file + lines)                             | Downstream call(s)                                                                                                                                     |
| ------------------------------- | -----: | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `/api/v1/checkout`              |   POST | Anonymous inline async handler (registered in `RESTAPIGateway.setupRoutes`)           | `packages/universal-agent/src/api/RESTAPIGateway.ts` L12342-L12389 | `(this.commerceAgent as any).createIndividualCheckout(userId, planId, interval, discountCode)`                                                         |
| `/api/v1/checkout/individual`   |   POST | Anonymous inline async handler (registered in `RESTAPIGateway.setupRoutes`)           | `packages/universal-agent/src/api/RESTAPIGateway.ts` L12391-L12439 | `(this.commerceAgent as any).createIndividualCheckout(userId, planId, interval, discountCode)`                                                         |
| `/api/v1/checkout/organization` |   POST | Anonymous inline async handler (registered in `RESTAPIGateway.setupRoutes`)           | `packages/universal-agent/src/api/RESTAPIGateway.ts` L12441-L12496 | `(this.commerceAgent as any).createOrganizationCheckout(userId, organizationName, seatCount, planId, interval)`                                        |
| `/api/v1/subscription`          |    GET | Anonymous inline async handler (registered in `RESTAPIGateway.setupRoutes`)           | `packages/universal-agent/src/api/RESTAPIGateway.ts` L12498-L12549 | `this.commerceAgent.getSubscriptionStatus(userId)`                                                                                                     |
| `/api/v1/subscriptions/me`      |    GET | Anonymous inline async handler (registered in `RESTAPIGateway.setupRoutes`)           | `packages/universal-agent/src/api/RESTAPIGateway.ts` L12551-L12603 | `this.commerceAgent.getSubscriptionStatus(userId)`                                                                                                     |
| `/api/v1/subscription/cancel`   |   POST | Anonymous inline async handler (registered in `RESTAPIGateway.setupRoutes`)           | `packages/universal-agent/src/api/RESTAPIGateway.ts` L12604-L12649 | `this.commerceAgent.cancelSubscription(userId, immediate===true)`                                                                                      |
| `/api/v1/subscription/upgrade`  |   POST | Anonymous inline async handler (registered in `RESTAPIGateway.setupRoutes`)           | `packages/universal-agent/src/api/RESTAPIGateway.ts` L12651-L12703 | `this.commerceAgent.changePlan(userId, planId)` — **CANONICAL contract, but CURRENTLY NON-FUNCTIONAL until `subscriptions.updated_at` drift is fixed** |
| `/api/v1/subscription/usage`    |    GET | Anonymous inline async handler (registered in `RESTAPIGateway.setupRoutes`)           | `packages/universal-agent/src/api/RESTAPIGateway.ts` L12705-L12765 | Direct Supabase reads: `subscriptions`, `stories`, `characters`                                                                                        |
| `/api/v1/users/me/story-packs`  |    GET | Anonymous inline async handler (registered in `RESTAPIGateway.setupRoutes`)           | `packages/universal-agent/src/api/RESTAPIGateway.ts` L12815-L12857 | Direct Supabase reads: `story_packs`; RPC: `get_total_pack_credits(p_user_id)`                                                                         |
| `/api/v1/stripe/webhook`        |   POST | Anonymous inline async handler (registered in `RESTAPIGateway` constructor; raw body) | `packages/universal-agent/src/api/RESTAPIGateway.ts` L148-L317     | Upsert `stripe_webhook_events`; calls CommerceAgent event handlers by type (see below)                                                                 |

##### Webhook downstream handler inventory (called by `/api/v1/stripe/webhook`)

These functions are invoked (via `any` access) by the webhook receiver in `RESTAPIGateway.ts` for the listed Stripe event types:

| Stripe event type string        | Canonical status                            | CommerceAgent function name                          | Implementation location (file + lines)                   | Notes                                                                                                                                                                                                                                                          |
| ------------------------------- | ------------------------------------------- | ---------------------------------------------------- | -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `checkout.session.completed`    | **NON-CANONICAL (unsupported until fixed)** | `handleCheckoutCompleted` (declared `private`)       | `packages/commerce-agent/src/CommerceAgent.ts` L354-L409 | Organization path writes to `public.organization_accounts` (**NOT PRESENT**). This event type must be treated as **unsupported** until code is aligned to canonical org schema (`organizations` + `organization_members`) or the missing schema is introduced. |
| `customer.subscription.created` | **CANONICAL**                               | `handleSubscriptionCreated` (declared `private`)     | `packages/commerce-agent/src/CommerceAgent.ts` L411-L434 | Inserts into `public.subscriptions` (PRESENT).                                                                                                                                                                                                                 |
| `customer.subscription.updated` | **CANONICAL**                               | `handleSubscriptionUpdated` (declared `private`)     | `packages/commerce-agent/src/CommerceAgent.ts` L436-L502 | Updates `public.subscriptions` (PRESENT).                                                                                                                                                                                                                      |
| `customer.subscription.deleted` | **CANONICAL**                               | `handleSubscriptionDeleted` (declared `private`)     | `packages/commerce-agent/src/CommerceAgent.ts` L504-L542 | Updates `public.subscriptions.status` to `canceled` (PRESENT).                                                                                                                                                                                                 |
| `invoice.payment_succeeded`     | **PARTIALLY CANONICAL**                     | `handleInvoicePaymentSucceeded` (declared `private`) | `packages/commerce-agent/src/CommerceAgent.ts` L544-L666 | **Canonical**: may create `organizations` + `organization_members` (Flow 3 bootstrap). **NON-CANONICAL**: attempts to insert into `subscriptions` with `stripe_customer_id` column (**NOT PRESENT**). That portion is unsupported until fixed.                 |
| `invoice.payment_failed`        | **CANONICAL**                               | `handleInvoicePaymentFailed` (declared `private`)    | `packages/commerce-agent/src/CommerceAgent.ts` L668-L694 | No Supabase writes; non-blocking email attempt only.                                                                                                                                                                                                           |

##### Non-canonical endpoints (documented as NON-CANONICAL)

These endpoints exist in code but are **unsafe today** due to schema mismatches (see “NON-CANONICAL endpoints” section for details and required remediation).

| Endpoint                             | Method | Handler function name          | Implementation location (file + lines)                           |
| ------------------------------------ | -----: | ------------------------------ | ---------------------------------------------------------------- |
| `/api/v1/organizations`              |   POST | Anonymous inline async handler | `packages/universal-agent/src/api/RESTAPIGateway.ts` L7895-L7954 |
| `/api/v1/organizations/:orgId/seats` |   POST | Anonymous inline async handler | `packages/universal-agent/src/api/RESTAPIGateway.ts` L7989-L8067 |

---

#### 2) Schema inventory (wired Supabase project)

For every entitlement-critical database object referenced by handlers in this document, we list:

- table name
- columns + types + defaults
- keys + constraints (PK/UK/check/FK)
- RLS enabled + policy names
- required DB functions (RPC) used by handlers

##### Missing objects rule (hard)

If any referenced table/column/function does not exist in the wired Supabase project:

- mark it **NOT PRESENT**
- treat the endpoint or behavior as **NON-CANONICAL** unless the handler already guards it safely
- do **not** invent schema

##### Supabase objects referenced by the CANONICAL endpoints

###### `public.subscriptions` (PRESENT)

**Columns**

| Column                   | Type        | Nullable | Default              |
| ------------------------ | ----------- | -------: | -------------------- |
| `id`                     | uuid        |    false | `gen_random_uuid()`  |
| `user_id`                | uuid        |    false | —                    |
| `stripe_subscription_id` | text        |     true | —                    |
| `plan_id`                | text        |    false | —                    |
| `status`                 | text        |    false | —                    |
| `current_period_start`   | timestamptz |     true | —                    |
| `current_period_end`     | timestamptz |     true | —                    |
| `created_at`             | timestamptz |     true | `now()`              |
| `tier`                   | text        |     true | `'individual'::text` |
| `story_limit`            | integer     |     true | —                    |
| `interval`               | text        |     true | `'month'::text`      |

**Keys / constraints**

| Name                                       |  Type | Definition                                                                                                     |
| ------------------------------------------ | ----: | -------------------------------------------------------------------------------------------------------------- |
| `subscriptions_pkey`                       |    PK | PRIMARY KEY (`id`)                                                                                             |
| `subscriptions_stripe_subscription_id_key` |    UK | UNIQUE (`stripe_subscription_id`)                                                                              |
| `subscriptions_status_check`               | CHECK | CHECK status ∈ {`trialing`,`active`,`past_due`,`paused`,`canceled`,`unpaid`,`incomplete`,`incomplete_expired`} |
| `subscriptions_user_id_fkey`               |    FK | FOREIGN KEY (`user_id`) REFERENCES `users(id)`                                                                 |

**RLS**

- enabled: **true**
- policies: `subscription_access`

###### `public.stripe_webhook_events` (PRESENT)

**Columns**

| Column          | Type        | Nullable | Default |
| --------------- | ----------- | -------: | ------- |
| `event_id`      | text        |    false | —       |
| `type`          | text        |     true | —       |
| `livemode`      | boolean     |     true | —       |
| `event_created` | timestamptz |     true | —       |
| `received_at`   | timestamptz |     true | `now()` |
| `processed_at`  | timestamptz |     true | —       |
| `status`        | text        |     true | —       |
| `error_message` | text        |     true | —       |
| `payload_hash`  | text        |     true | —       |

**Keys / constraints**

| Name                         | Type | Definition               |
| ---------------------------- | ---: | ------------------------ |
| `stripe_webhook_events_pkey` |   PK | PRIMARY KEY (`event_id`) |

**RLS**

- enabled: **false** (no policies)

###### `public.organizations` (PRESENT)

**Columns**

| Column               | Type        | Nullable | Default             |
| -------------------- | ----------- | -------: | ------------------- |
| `id`                 | uuid        |    false | `gen_random_uuid()` |
| `name`               | text        |    false | —                   |
| `owner_user_id`      | uuid        |    false | —                   |
| `stripe_customer_id` | text        |     true | —                   |
| `created_at`         | timestamptz |    false | `now()`             |
| `updated_at`         | timestamptz |    false | `now()`             |
| `max_seats`          | integer     |    false | `1`                 |
| `used_seats`         | integer     |    false | `0`                 |

**Keys / constraints**

| Name                                   |  Type | Definition                          |
| -------------------------------------- | ----: | ----------------------------------- |
| `organizations_pkey`                   |    PK | PRIMARY KEY (`id`)                  |
| `organizations_stripe_customer_id_key` |    UK | UNIQUE (`stripe_customer_id`)       |
| `valid_seat_usage`                     | CHECK | CHECK (`used_seats` <= `max_seats`) |

**RLS**

- enabled: **true**
- policies: `org_owner_full`, `organizations_policy`

###### `public.organization_members` (PRESENT)

**Columns**

| Column            | Type        | Nullable | Default |
| ----------------- | ----------- | -------: | ------- |
| `organization_id` | uuid        |    false | —       |
| `user_id`         | uuid        |    false | —       |
| `role`            | text        |    false | —       |
| `created_at`      | timestamptz |    false | `now()` |
| `updated_at`      | timestamptz |    false | `now()` |

**Keys / constraints**

| Name                                        |  Type | Definition                                                                       |
| ------------------------------------------- | ----: | -------------------------------------------------------------------------------- |
| `organization_members_pkey`                 |    PK | PRIMARY KEY (`organization_id`, `user_id`)                                       |
| `organization_members_organization_id_fkey` |    FK | FOREIGN KEY (`organization_id`) REFERENCES `organizations(id)` ON DELETE CASCADE |
| `organization_members_role_check`           | CHECK | CHECK role ∈ {`owner`,`admin`,`teacher`,`viewer`}                                |

**RLS**

- enabled: **true**
- policies: `org_members_read`, `org_admin_write`

###### `public.story_packs` (PRESENT)

**Columns**

| Column                       | Type        | Nullable | Default             |
| ---------------------------- | ----------- | -------: | ------------------- |
| `id`                         | uuid        |    false | `gen_random_uuid()` |
| `user_id`                    | uuid        |    false | —                   |
| `pack_type`                  | text        |    false | —                   |
| `stories_remaining`          | integer     |    false | —                   |
| `stripe_payment_intent_id`   | text        |     true | —                   |
| `stripe_checkout_session_id` | text        |     true | —                   |
| `purchased_at`               | timestamptz |     true | `now()`             |
| `expires_at`                 | timestamptz |     true | —                   |
| `created_at`                 | timestamptz |     true | `now()`             |
| `updated_at`                 | timestamptz |     true | `now()`             |

**Keys / constraints**

| Name                                  |  Type | Definition                                                            |
| ------------------------------------- | ----: | --------------------------------------------------------------------- |
| `story_packs_pkey`                    |    PK | PRIMARY KEY (`id`)                                                    |
| `story_packs_pack_type_check`         | CHECK | CHECK pack_type ∈ {`5_pack`,`10_pack`,`25_pack`}                      |
| `story_packs_stories_remaining_check` | CHECK | CHECK (`stories_remaining` >= 0)                                      |
| `story_packs_user_id_fkey`            |    FK | FOREIGN KEY (`user_id`) REFERENCES `auth.users(id)` ON DELETE CASCADE |

**RLS**

- enabled: **true**
- policies: `story_packs_own_records`, `story_packs_system_modify`

###### `public.reward_ledger` (PRESENT; referenced for completeness)

This table exists in the wired Supabase project. It is **not directly referenced by the CANONICAL endpoints** listed above, but it is entitlement-adjacent and appears in the commerce ecosystem.

**Columns**

| Column                  | Type        | Nullable | Default             |
| ----------------------- | ----------- | -------: | ------------------- |
| `id`                    | uuid        |    false | `gen_random_uuid()` |
| `user_id`               | uuid        |    false | —                   |
| `source`                | text        |    false | —                   |
| `amount`                | integer     |    false | —                   |
| `currency`              | text        |    false | `'usd'::text`       |
| `stripe_balance_txn_id` | text        |     true | —                   |
| `stripe_customer_id`    | text        |     true | —                   |
| `status`                | text        |    false | `'pending'::text`   |
| `applied_to_invoice`    | text        |     true | —                   |
| `applied_at`            | timestamptz |     true | —                   |
| `expires_at`            | timestamptz |     true | —                   |
| `description`           | text        |     true | —                   |
| `metadata`              | jsonb       |     true | `'{}'::jsonb`       |
| `created_at`            | timestamptz |    false | `now()`             |
| `updated_at`            | timestamptz |    false | `now()`             |

**Keys / constraints**

| Name                         |  Type | Definition                                                                                                                             |
| ---------------------------- | ----: | -------------------------------------------------------------------------------------------------------------------------------------- |
| `reward_ledger_pkey`         |    PK | PRIMARY KEY (`id`)                                                                                                                     |
| `reward_ledger_amount_check` | CHECK | CHECK (`amount` > 0)                                                                                                                   |
| `reward_ledger_status_check` | CHECK | CHECK status ∈ {`pending`,`applied`,`expired`,`refunded`}                                                                              |
| `reward_ledger_source_check` | CHECK | CHECK source ∈ {`referral`,`story_share`,`teacher_referral`,`milestone_bonus`,`power_user_reward`,`seasonal_campaign`,`manual_credit`} |
| `reward_ledger_user_id_fkey` |    FK | FOREIGN KEY (`user_id`) REFERENCES `auth.users(id)` ON DELETE CASCADE                                                                  |

**RLS**

- enabled: **true**
- policies: “Users can view their own reward ledger”, “System can insert reward ledger”

##### Required DB functions (RPC) used by CANONICAL handlers

| Function                                | Used by                                |         Present | Security | Notes                                                                              |
| --------------------------------------- | -------------------------------------- | --------------: | -------- | ---------------------------------------------------------------------------------- |
| `public.get_total_pack_credits(uuid)`   | `GET /api/v1/users/me/story-packs`     |         PRESENT | DEFINER  | Must exist; handler calls `.rpc('get_total_pack_credits', { p_user_id })`.         |
| `public.is_org_member(uuid)`            | Org RLS (indirectly required)          |         PRESENT | DEFINER  | Used by org/member RLS policies.                                                   |
| `public.is_org_admin(uuid)`             | Org RLS (indirectly required)          |         PRESENT | DEFINER  | Used by org/member RLS policies.                                                   |
| `public.set_updated_at_org_members()`   | Org triggers                           |         PRESENT | INVOKER  | Used by `organization_members_set_updated_at` trigger.                             |
| `public.deduct_story_pack_credit(uuid)` | (not a canonical endpoint in this doc) |         PRESENT | DEFINER  | Present; used elsewhere (e.g. story creation), not in canonical list above.        |
| `public.calculate_user_credits(uuid)`   | (not a canonical endpoint in this doc) | **NOT PRESENT** | —        | Not present in the wired Supabase project; any handler calling it is non-reliable. |

##### Explicit NOT PRESENT objects referenced by implementation (important)

The following objects are referenced by code paths reachable from the webhook handler, but do **not** exist in the wired Supabase project:

| Object                             | Kind     |     Present | Referenced by                                                                         | Impact                                                                                    |
| ---------------------------------- | -------- | ----------: | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `public.organization_accounts`     | table    | NOT PRESENT | `CommerceAgent.handleCheckoutCompleted` → `createOrganizationAccount`                 | `checkout.session.completed` event handling will fail if it takes the organization path.  |
| `public.manage_organization_seats` | function | NOT PRESENT | `CommerceAgent.manageOrganizationSeats` (not invoked by canonical endpoints directly) | Any code path attempting this RPC will fail.                                              |
| `public.invite_discounts`          | table    | NOT PRESENT | CommerceAgent (invite/discount features)                                              | Not part of canonical endpoints in this doc; feature non-operational until schema exists. |
| `public.referral_tracking`         | table    | NOT PRESENT | CommerceAgent (invite/discount features)                                              | Not part of canonical endpoints in this doc; feature non-operational until schema exists. |
| `public.billing_events`            | table    | NOT PRESENT | Legacy commerce migration                                                             | Not part of canonical endpoints in this doc.                                              |

---

### Cross-cutting: Canonical Commerce Entities

These entity definitions are required context for every contract. They are governed by `docs/commerce/entitlement-model.md`.

| Entity              | Source of truth                                                 | Primary identifier(s)                   | Key invariants                                                                                                               |
| ------------------- | --------------------------------------------------------------- | --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| User                | `public.users` + `auth.users`                                   | `user.id` (UUID)                        | Authenticated endpoints must derive user identity exclusively from the validated JWT (`req.user.id`), not from request body. |
| Subscription        | `public.subscriptions`                                          | `stripe_subscription_id` (unique), `id` | Only `status='active'` is treated as an active entitlement in current read models.                                           |
| Organization        | `public.organizations`                                          | `id`, `stripe_customer_id` (unique)     | `used_seats <= max_seats` must always hold (DB check).                                                                       |
| Membership          | `public.organization_members`                                   | (`organization_id`,`user_id`)           | Role must be one of {`owner`,`admin`,`teacher`,`viewer`} (DB check).                                                         |
| Seat                | Derived (`organizations.max_seats`, `organizations.used_seats`) | —                                       | Reconciliation policy must be consistent (see entitlement model).                                                            |
| StoryPack           | `public.story_packs`                                            | `id`                                    | `stories_remaining >= 0`; expiration rules apply.                                                                            |
| WebhookEvent        | `public.stripe_webhook_events`                                  | `event_id`                              | Exactly one row per event_id; duplicates must be skipped.                                                                    |
| EntitlementSnapshot | Derived read model                                              | —                                       | Must follow precedence rules in entitlement model.                                                                           |

---

### Cross-cutting: Error envelope (canonical normalization)

#### Canonical normalized error object (required by clients)

All commerce endpoints **must be representable** as this normalized error object, even if the current wire format is legacy.

```json
{
  "error": {
    "code": "<string>",
    "message": "<string>",
    "requestId": "<string|null>",
    "details": "<object|null>"
  }
}
```

#### Current wire format (legacy, observed)

Most current handlers respond with a legacy envelope:

- Success: `{ "success": true, "data": <object> }`
- Error: `{ "success": false, "error": "<string>", "code": "<string>", ... }`

**Normalization mapping** (client-side):

- `error.code` ← legacy `code`
- `error.message` ← legacy `error`
- `error.requestId` ← `null` (no request id is emitted by these handlers today)
- `error.details` ← remaining legacy fields (if any)

---

## CANONICAL endpoints (full contracts)

All canonical endpoints below are required to be stable and gateable. Contracts include:

- Contract header (purpose/auth/idempotency/side-effects/observability)
- Request schema + field table + example
- Response schema + example
- Error table (400/401/403/404/409/422/429/500), with stable codes and emitting layer

> Note: examples are sanitized. Do not copy secrets, tokens, or environment values into logs or docs.

---

### POST `/api/v1/checkout`

#### A) Contract header

- **Purpose**: Create a Stripe Checkout Session for an **individual** subscription purchase.
- **Auth**: User JWT required (`authMiddleware.requireAuth`).
- **Idempotency**: **No** (each call may create a new Checkout Session).
- **Side effects**:
  - Supabase: none by this handler.
  - Stripe: creates a `checkout.session` (mode = `subscription`).
  - Reads `public.users.email` via CommerceAgent.
- **Observability**:
  - Logs on failure: message `Checkout creation failed` with `{ error: <message> }`.
  - Redaction: never log Authorization headers or any Stripe secrets; never write secrets to artifacts.

#### B) Request contract

**Request body JSON Schema (2020-12)**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "planId": { "type": "string" },
    "billingInterval": { "type": "string", "enum": ["monthly", "yearly"] },
    "discountCode": { "type": "string" },
    "returnUrl": { "type": "string" }
  }
}
```

**Field table**

| Field             | Type   | Required | Validation            | Notes                                                                                                                                  |
| ----------------- | ------ | -------: | --------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `planId`          | string |       no | —                     | Defaults to `pro_individual` in handler.                                                                                               |
| `billingInterval` | string |       no | `monthly` or `yearly` | Handler computes `interval` but downstream CommerceAgent currently does **not** implement billing interval selection (see Known Gaps). |
| `discountCode`    | string |       no | —                     | Handler passes through, but downstream argument order is currently mismatched (see Known Gaps).                                        |
| `returnUrl`       | string |       no | —                     | If omitted, server returns a configured default.                                                                                       |

**Example request (sanitized)**

```json
{
  "planId": "pro_individual",
  "billingInterval": "monthly",
  "discountCode": "WELCOME10",
  "returnUrl": "<frontendBaseUrl>/subscription/success"
}
```

#### C) Response contract

**Success response JSON Schema (2020-12)**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "required": ["success", "data"],
  "additionalProperties": false,
  "properties": {
    "success": { "const": true },
    "data": {
      "type": "object",
      "required": [
        "sessionId",
        "url",
        "expiresAt",
        "billingInterval",
        "returnUrl"
      ],
      "additionalProperties": false,
      "properties": {
        "sessionId": { "type": "string" },
        "url": { "type": "string" },
        "expiresAt": { "type": "string", "format": "date-time" },
        "billingInterval": { "type": "string", "enum": ["monthly", "yearly"] },
        "returnUrl": { "type": "string" }
      }
    }
  }
}
```

**Example success response (sanitized)**

```json
{
  "success": true,
  "data": {
    "sessionId": "cs_test_...",
    "url": "<stripeHostedCheckoutUrl>",
    "expiresAt": "2026-01-04T12:00:00.000Z",
    "billingInterval": "monthly",
    "returnUrl": "<frontendBaseUrl>/subscription/success"
  }
}
```

#### D) Error contract

**Observed wire error** (legacy; handler emits):

- HTTP 503: `{ success:false, error:'Commerce service unavailable', code:'SERVICE_UNAVAILABLE' }`
- HTTP 500: `{ success:false, error:<message>, code:'CHECKOUT_FAILED' }`

**Error table**

| HTTP | When                                                                      | `error.code`                     | Emitted by                                     |
| ---: | ------------------------------------------------------------------------- | -------------------------------- | ---------------------------------------------- |
|  400 | Invalid request shape (not enforced by handler except via runtime errors) | `BAD_REQUEST` (reserved)         | Handler (recommended; not implemented)         |
|  401 | Missing/invalid JWT                                                       | `UNAUTHORIZED`                   | AuthMiddleware                                 |
|  403 | Authenticated but forbidden                                               | `FORBIDDEN`                      | AuthMiddleware / handler (reserved)            |
|  404 | Not found                                                                 | `NOT_FOUND` (reserved)           | Handler (reserved)                             |
|  409 | Conflict                                                                  | `CONFLICT` (reserved)            | Handler (reserved)                             |
|  422 | Validation error                                                          | `VALIDATION_FAILED` (reserved)   | Handler (reserved)                             |
|  429 | Rate limited                                                              | `RATE_LIMIT_EXCEEDED` (reserved) | Middleware (not implemented for this endpoint) |
|  500 | Checkout creation failure                                                 | `CHECKOUT_FAILED`                | Handler                                        |
|  503 | Commerce agent unavailable                                                | `SERVICE_UNAVAILABLE`            | Handler                                        |

---

### POST `/api/v1/checkout/individual`

This endpoint is an alias of `POST /api/v1/checkout` with the same semantics and contract, except the response includes an additional `checkoutUrl` field.

#### A) Contract header

- **Purpose**: Alias for individual checkout.
- **Auth**: User JWT required.
- **Idempotency**: No.
- **Side effects**: same as `/api/v1/checkout`.
- **Observability**: same as `/api/v1/checkout`.

#### B) Request contract

Same as `/api/v1/checkout`.

#### C) Response contract

**Success response JSON Schema (2020-12)**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "required": ["success", "data"],
  "additionalProperties": false,
  "properties": {
    "success": { "const": true },
    "data": {
      "type": "object",
      "required": [
        "sessionId",
        "url",
        "checkoutUrl",
        "expiresAt",
        "billingInterval",
        "returnUrl"
      ],
      "additionalProperties": false,
      "properties": {
        "sessionId": { "type": "string" },
        "url": { "type": "string" },
        "checkoutUrl": { "type": "string" },
        "expiresAt": { "type": "string", "format": "date-time" },
        "billingInterval": { "type": "string", "enum": ["monthly", "yearly"] },
        "returnUrl": { "type": "string" }
      }
    }
  }
}
```

#### D) Error contract

Same as `/api/v1/checkout`.

---

### POST `/api/v1/checkout/organization`

#### A) Contract header

- **Purpose**: Create a Stripe Checkout Session for an **organization** (seat-based) subscription purchase.
- **Auth**: User JWT required.
- **Idempotency**: No.
- **Side effects**:
  - Supabase: none by this handler.
  - Stripe: creates a `checkout.session` (mode = `subscription`) with seat quantity.
  - Checkout + subscription metadata is set by CommerceAgent and is required for Flow 3 org bootstrap (see Webhook Contract).
- **Observability**:
  - Logs on failure: message `Organization checkout failed` with `{ error: <message> }`.
  - Redaction: never log Authorization headers or Stripe secrets.

#### B) Request contract

**Request body JSON Schema (2020-12)**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "additionalProperties": false,
  "required": ["organizationName", "seatCount"],
  "properties": {
    "organizationName": { "type": "string", "minLength": 1 },
    "seatCount": { "type": "integer", "minimum": 1 },
    "planId": { "type": "string" },
    "billingInterval": { "type": "string", "enum": ["monthly", "yearly"] }
  }
}
```

**Field table**

| Field              | Type    | Required | Validation     | Notes                                                                                                                        |
| ------------------ | ------- | -------: | -------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `organizationName` | string  |      yes | non-empty      | Used as org name in Flow 3 bootstrap.                                                                                        |
| `seatCount`        | integer |      yes | ≥ 1            | Used as Stripe subscription item quantity; used as `max_seats` in org creation.                                              |
| `planId`           | string  |       no | —              | Defaults to `pro_organization` in handler.                                                                                   |
| `billingInterval`  | string  |       no | monthly/yearly | Handler computes interval but downstream CommerceAgent currently does **not** implement interval selection (see Known Gaps). |

**Example request (sanitized)**

```json
{
  "organizationName": "Acme School",
  "seatCount": 5,
  "planId": "pro_organization",
  "billingInterval": "monthly"
}
```

#### C) Response contract

**Success response JSON Schema (2020-12)**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "required": ["success", "data"],
  "additionalProperties": false,
  "properties": {
    "success": { "const": true },
    "data": {
      "type": "object",
      "required": ["sessionId", "url", "expiresAt", "billingInterval"],
      "additionalProperties": false,
      "properties": {
        "sessionId": { "type": "string" },
        "url": { "type": "string" },
        "expiresAt": { "type": "string", "format": "date-time" },
        "billingInterval": { "type": "string", "enum": ["monthly", "yearly"] }
      }
    }
  }
}
```

#### D) Error contract

**Observed wire errors**

- HTTP 400: `MISSING_REQUIRED_FIELDS`
- HTTP 503: `SERVICE_UNAVAILABLE`
- HTTP 500: `ORGANIZATION_CHECKOUT_FAILED`

**Error table**

| HTTP | When                                          | `error.code`                     | Emitted by                                     |
| ---: | --------------------------------------------- | -------------------------------- | ---------------------------------------------- |
|  400 | Missing `organizationName` or `seatCount`     | `MISSING_REQUIRED_FIELDS`        | Handler                                        |
|  401 | Missing/invalid JWT                           | `UNAUTHORIZED`                   | AuthMiddleware                                 |
|  403 | Forbidden                                     | `FORBIDDEN`                      | AuthMiddleware / handler (reserved)            |
|  409 | Conflict                                      | `CONFLICT` (reserved)            | Handler (reserved)                             |
|  422 | Validation failure (e.g. seatCount too large) | `VALIDATION_FAILED` (reserved)   | Handler / CommerceAgent (not standardized)     |
|  429 | Rate limited                                  | `RATE_LIMIT_EXCEEDED` (reserved) | Middleware (not implemented for this endpoint) |
|  500 | Checkout creation failure                     | `ORGANIZATION_CHECKOUT_FAILED`   | Handler                                        |
|  503 | Commerce agent unavailable                    | `SERVICE_UNAVAILABLE`            | Handler                                        |

---

### GET `/api/v1/subscription`

#### A) Contract header

- **Purpose**: Read the authenticated user’s current subscription status.
- **Auth**: User JWT required.
- **Idempotency**: Yes (read-only).
- **Side effects**: none.
- **Observability**:
  - Logs on failure: `Get subscription failed` with `{ error: <message> }`.

#### B) Request contract

No request body.

#### C) Response contract

**Success response JSON Schema (2020-12)**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "required": ["success", "data"],
  "additionalProperties": false,
  "properties": {
    "success": { "const": true },
    "data": {
      "type": "object",
      "oneOf": [
        {
          "required": ["hasSubscription", "plan"],
          "additionalProperties": false,
          "properties": {
            "hasSubscription": { "const": false },
            "plan": { "const": "free" }
          }
        },
        {
          "required": ["hasSubscription", "subscription"],
          "additionalProperties": false,
          "properties": {
            "hasSubscription": { "const": true },
            "subscription": {
              "type": "object",
              "required": [
                "id",
                "planId",
                "status",
                "currentPeriodStart",
                "currentPeriodEnd"
              ],
              "additionalProperties": false,
              "properties": {
                "id": { "type": "string", "format": "uuid" },
                "planId": { "type": "string" },
                "status": { "type": "string" },
                "currentPeriodStart": { "type": ["string", "null"] },
                "currentPeriodEnd": { "type": ["string", "null"] }
              }
            }
          }
        }
      ]
    }
  }
}
```

#### D) Error contract

**Observed wire errors**

- HTTP 503: `SERVICE_UNAVAILABLE`
- HTTP 500: `GET_SUBSCRIPTION_FAILED`

**Error table**

| HTTP | When                       | `error.code`              | Emitted by     |
| ---: | -------------------------- | ------------------------- | -------------- |
|  401 | Missing/invalid JWT        | `UNAUTHORIZED`            | AuthMiddleware |
|  500 | Unexpected error           | `GET_SUBSCRIPTION_FAILED` | Handler        |
|  503 | Commerce agent unavailable | `SERVICE_UNAVAILABLE`     | Handler        |

---

### GET `/api/v1/subscriptions/me`

Alias of `GET /api/v1/subscription` with the same response contract.

---

### POST `/api/v1/subscription/cancel`

#### A) Contract header

- **Purpose**: Cancel the authenticated user’s subscription (period-end or immediate).
- **Auth**: User JWT required.
- **Idempotency**: No explicit guarantee (repeat calls may repeat Stripe updates).
- **Side effects**:
  - Stripe: cancels immediately or sets `cancel_at_period_end`.
  - Supabase: handler does not write `subscriptions`; webhook updates are expected later.
- **Observability**:
  - Logs on failure: `Cancel subscription failed` with `{ error: <message> }`.

#### B) Request contract

**Request body JSON Schema (2020-12)**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "immediate": { "type": "boolean" }
  }
}
```

**Field table**

| Field       | Type    | Required | Validation | Notes                                                                       |
| ----------- | ------- | -------: | ---------- | --------------------------------------------------------------------------- |
| `immediate` | boolean |       no | —          | If `true`, cancels immediately; otherwise requests period-end cancellation. |

#### C) Response contract

**Success response JSON Schema (2020-12)**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "required": ["success", "data"],
  "additionalProperties": false,
  "properties": {
    "success": { "const": true },
    "data": {
      "type": "object",
      "required": ["cancelled", "effectiveDate"],
      "additionalProperties": false,
      "properties": {
        "subscription": { "type": ["object", "null"] },
        "cancelled": { "const": true },
        "effectiveDate": { "type": ["string", "null"] }
      }
    }
  }
}
```

#### D) Error contract

**Observed wire errors**

- HTTP 400: `CANCEL_SUBSCRIPTION_FAILED` (when `result.success` is false)
- HTTP 500: `CANCEL_SUBSCRIPTION_FAILED` (catch-all)
- HTTP 503: `SERVICE_UNAVAILABLE`

**Error table**

| HTTP | When                                    | `error.code`                 | Emitted by     |
| ---: | --------------------------------------- | ---------------------------- | -------------- |
|  400 | CommerceAgent returns `{success:false}` | `CANCEL_SUBSCRIPTION_FAILED` | Handler        |
|  401 | Missing/invalid JWT                     | `UNAUTHORIZED`               | AuthMiddleware |
|  500 | Unexpected error                        | `CANCEL_SUBSCRIPTION_FAILED` | Handler        |
|  503 | Commerce agent unavailable              | `SERVICE_UNAVAILABLE`        | Handler        |

---

### POST `/api/v1/subscription/upgrade`

#### A) Contract header

- **Purpose**: Change the authenticated user’s subscription plan (upgrade or downgrade).
- **Auth**: User JWT required.
- **Idempotency**: No explicit guarantee.
- **Side effects**:
  - Stripe: subscription item price update.
  - Supabase: attempts to update `subscriptions` (see Known Gaps: `subscriptions.updated_at` is NOT PRESENT).
- **Observability**:
  - Logs on failure: `Change plan failed` with `{ error: <message> }`.

#### B) Request contract

**Request body JSON Schema (2020-12)**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "additionalProperties": false,
  "required": ["planId"],
  "properties": {
    "planId": { "type": "string", "minLength": 1 }
  }
}
```

#### C) Response contract

**Success response JSON Schema (2020-12)**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "required": ["success", "data"],
  "additionalProperties": false,
  "properties": {
    "success": { "const": true },
    "data": {
      "type": "object",
      "required": ["planChanged"],
      "additionalProperties": false,
      "properties": {
        "subscription": { "type": ["object", "null"] },
        "planChanged": { "const": true }
      }
    }
  }
}
```

#### D) Error contract

**Observed wire errors**

- HTTP 400: `MISSING_PLAN_ID` (missing request field)
- HTTP 400: `CHANGE_PLAN_FAILED` (when `result.success` false)
- HTTP 500: `CHANGE_PLAN_FAILED` (catch-all)
- HTTP 503: `SERVICE_UNAVAILABLE`

**Error table**

| HTTP | When                                    | `error.code`          | Emitted by     |
| ---: | --------------------------------------- | --------------------- | -------------- |
|  400 | Missing `planId`                        | `MISSING_PLAN_ID`     | Handler        |
|  400 | CommerceAgent returns `{success:false}` | `CHANGE_PLAN_FAILED`  | Handler        |
|  401 | Missing/invalid JWT                     | `UNAUTHORIZED`        | AuthMiddleware |
|  500 | Unexpected error                        | `CHANGE_PLAN_FAILED`  | Handler        |
|  503 | Commerce agent unavailable              | `SERVICE_UNAVAILABLE` | Handler        |

---

### GET `/api/v1/subscription/usage`

#### A) Contract header

- **Purpose**: Provide subscription plan and usage counters for stories and characters.
- **Auth**: User JWT required.
- **Idempotency**: Yes (read-only).
- **Side effects**: none.
- **Observability**:
  - Logs on failure: `Get subscription usage failed` with `{ error: <message> }`.

#### B) Request contract

No request body.

#### C) Response contract

**Success response JSON Schema (2020-12)**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "required": ["success", "data"],
  "additionalProperties": false,
  "properties": {
    "success": { "const": true },
    "data": {
      "type": "object",
      "required": ["plan", "usage", "subscription"],
      "additionalProperties": false,
      "properties": {
        "plan": { "type": "string" },
        "usage": {
          "type": "object",
          "required": ["stories", "characters"],
          "additionalProperties": false,
          "properties": {
            "stories": {
              "type": "object",
              "required": ["created", "limit"],
              "additionalProperties": false,
              "properties": {
                "created": { "type": "integer", "minimum": 0 },
                "limit": {
                  "oneOf": [
                    { "type": "string", "const": "unlimited" },
                    { "type": "integer" }
                  ]
                }
              }
            },
            "characters": {
              "type": "object",
              "required": ["created", "limit"],
              "additionalProperties": false,
              "properties": {
                "created": { "type": "integer", "minimum": 0 },
                "limit": {
                  "oneOf": [
                    { "type": "string", "const": "unlimited" },
                    { "type": "integer" }
                  ]
                }
              }
            }
          }
        },
        "subscription": {
          "oneOf": [
            { "type": "null" },
            {
              "type": "object",
              "required": ["status", "planId"],
              "additionalProperties": false,
              "properties": {
                "status": { "type": "string" },
                "planId": { "type": "string" }
              }
            }
          ]
        }
      }
    }
  }
}
```

#### D) Error contract

**Observed wire errors**

- HTTP 500: `GET_USAGE_FAILED`

**Error table**

| HTTP | When                | `error.code`       | Emitted by     |
| ---: | ------------------- | ------------------ | -------------- |
|  401 | Missing/invalid JWT | `UNAUTHORIZED`     | AuthMiddleware |
|  500 | Unexpected error    | `GET_USAGE_FAILED` | Handler        |

---

### GET `/api/v1/users/me/story-packs`

#### A) Contract header

- **Purpose**: List the authenticated user’s active story packs and total available story-pack credits.
- **Auth**: User JWT required.
- **Idempotency**: Yes (read-only).
- **Side effects**: none.
- **Observability**:
  - Logs on failure: `Get story packs failed` with `{ error: <message> }`.

#### B) Request contract

No request body.

#### C) Response contract

**Success response JSON Schema (2020-12)**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "required": ["success", "data"],
  "additionalProperties": false,
  "properties": {
    "success": { "const": true },
    "data": {
      "type": "object",
      "required": ["packs", "totalAvailable", "summary"],
      "additionalProperties": false,
      "properties": {
        "packs": {
          "type": "array",
          "items": {
            "type": "object",
            "required": [
              "id",
              "pack_type",
              "stories_remaining",
              "purchased_at",
              "expires_at"
            ],
            "additionalProperties": false,
            "properties": {
              "id": { "type": "string", "format": "uuid" },
              "pack_type": { "type": "string" },
              "stories_remaining": { "type": "integer", "minimum": 0 },
              "purchased_at": { "type": ["string", "null"] },
              "expires_at": { "type": ["string", "null"] }
            }
          }
        },
        "totalAvailable": { "type": "integer", "minimum": 0 },
        "summary": {
          "type": "object",
          "required": ["active", "totalStories"],
          "additionalProperties": false,
          "properties": {
            "active": { "type": "integer", "minimum": 0 },
            "totalStories": { "type": "integer", "minimum": 0 }
          }
        }
      }
    }
  }
}
```

#### D) Error contract

**Observed wire errors**

- HTTP 500: `GET_STORY_PACKS_FAILED`

**Error table**

| HTTP | When                | `error.code`             | Emitted by     |
| ---: | ------------------- | ------------------------ | -------------- |
|  401 | Missing/invalid JWT | `UNAUTHORIZED`           | AuthMiddleware |
|  500 | Unexpected error    | `GET_STORY_PACKS_FAILED` | Handler        |

---

### POST `/api/v1/stripe/webhook`

#### A) Contract header

- **Purpose**: Receive Stripe webhook events, enforce idempotency, and apply entitlement updates.
- **Auth**: Stripe signature required; no user JWT.
- **Idempotency**: Yes (durable idempotency via `stripe_webhook_events` primary key).
- **Side effects**:
  - Supabase (always; canonical):
    - upsert into `stripe_webhook_events` (new event → insert row)
    - update `stripe_webhook_events` to `processed` or `failed`
  - Supabase (conditional; **canonical only when schema matches**):
    - `subscriptions`: insert/update for subscription lifecycle events (`customer.subscription.*`)
    - `organizations` + `organization_members`: org bootstrap on `invoice.payment_succeeded` when required metadata is present
  - Supabase (conditional; **NON-CANONICAL / unsupported until fixed**):
    - Any path that writes to **NOT PRESENT** tables/columns (e.g. `organization_accounts`, `subscriptions.stripe_customer_id`)
  - Stripe: no writes (webhook receiver only reads/validates event and may retrieve subscription for metadata inside CommerceAgent).
- **Observability**:
  - Required log keys for webhook lifecycle:
    - `eventId`
    - `type`
    - `duplicate` (derived)
    - `payload_hash` (hash only; never log raw payload)
  - Redaction requirements:
    - Never log `Stripe-Signature` header
    - Never log raw Authorization tokens
    - Never persist secrets in artifacts

#### B) Request contract

This endpoint requires the **raw request body** (not JSON parsing).

**Request body JSON Schema (2020-12)** (raw string payload)

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "string"
}
```

**Headers**

| Header             | Required | Notes                                                                                       |
| ------------------ | -------: | ------------------------------------------------------------------------------------------- |
| `Stripe-Signature` |      yes | Required for verification. Missing header returns HTTP 400 with `STRIPE_SIGNATURE_MISSING`. |

#### C) Response contract

**Success response variants (observed wire format)**

1. Processed (first receipt)

```json
{
  "received": true,
  "status": "processed",
  "eventId": "evt_...",
  "duplicate": false
}
```

2. Skipped duplicate (replay)

```json
{
  "received": true,
  "status": "skipped_duplicate",
  "eventId": "evt_...",
  "duplicate": true
}
```

3. Failed (processing error or insert error)

```json
{
  "received": true,
  "status": "failed",
  "eventId": "evt_...",
  "duplicate": false,
  "error": "<message>"
}
```

**Response JSON Schema (2020-12)** (union)

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "oneOf": [
    {
      "type": "object",
      "required": ["received", "status", "eventId", "duplicate"],
      "additionalProperties": false,
      "properties": {
        "received": { "const": true },
        "status": { "const": "processed" },
        "eventId": { "type": "string" },
        "duplicate": { "const": false }
      }
    },
    {
      "type": "object",
      "required": ["received", "status", "eventId", "duplicate"],
      "additionalProperties": false,
      "properties": {
        "received": { "const": true },
        "status": { "const": "skipped_duplicate" },
        "eventId": { "type": "string" },
        "duplicate": { "const": true }
      }
    },
    {
      "type": "object",
      "required": ["received", "status", "eventId", "duplicate", "error"],
      "additionalProperties": false,
      "properties": {
        "received": { "const": true },
        "status": { "const": "failed" },
        "eventId": { "type": "string" },
        "duplicate": { "const": false },
        "error": { "type": "string" }
      }
    }
  ]
}
```

#### D) Error contract

**Observed wire errors**

| HTTP | Body shape                                                                                                 | Notes                                                                  |
| ---: | ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
|  503 | `{success:false, error:'Stripe webhook receiver is not configured', code:'STRIPE_WEBHOOK_NOT_CONFIGURED'}` | Configuration guard.                                                   |
|  400 | `{success:false, error:'Missing Stripe-Signature header', code:'STRIPE_SIGNATURE_MISSING'}`                | Missing required header.                                               |
|  400 | `{success:false, error:<message>, code:'STRIPE_SIGNATURE_INVALID'}`                                        | Signature verification failure.                                        |
|  400 | `{success:false, error:<message>, code:'STRIPE_WEBHOOK_FAILED'}`                                           | Catch-all exception outside main flow.                                 |
|  200 | `{received:true, status:'failed', ...}`                                                                    | Fail-closed for processing errors: returns 200 but marks event failed. |

**Error table (canonical expectations + observed)**

| HTTP | When                          | `error.code`                                              | Emitted by                              |
| ---: | ----------------------------- | --------------------------------------------------------- | --------------------------------------- |
|  400 | Missing signature header      | `STRIPE_SIGNATURE_MISSING`                                | Handler                                 |
|  400 | Signature invalid             | `STRIPE_SIGNATURE_INVALID`                                | Handler                                 |
|  409 | Duplicate event               | `DUPLICATE_EVENT` (not used; webhook returns 200 skipped) | —                                       |
|  500 | CommerceAgent not initialized | `COMMERCE_AGENT_UNAVAILABLE`                              | Handler (currently emitted as HTTP 500) |
|  503 | Webhook not configured        | `STRIPE_WEBHOOK_NOT_CONFIGURED`                           | Handler                                 |

---

## NON-CANONICAL endpoints (do not rely on these)

These endpoints exist but are non-canonical due to verified schema mismatches. They must be fixed (schema + handler) before being treated as stable.

### POST `/api/v1/organizations` (NON-CANONICAL)

**Why unsafe today (exact mismatches)**

- Handler writes columns that are **NOT PRESENT** on `public.organizations`:
  - attempts: `type`, `owner_id`, `billing_email`, `metadata`, `status`
  - actual table columns: `id`, `name`, `owner_user_id`, `stripe_customer_id`, `max_seats`, `used_seats`, `created_at`, `updated_at`
- Handler attempts to insert into `organization_members` with fields **NOT PRESENT**:
  - attempts: `status: 'active'`
  - actual columns: `organization_id`, `user_id`, `role`, `created_at`, `updated_at`

**What must change to become canonical**

- Handler must write to **canonical** schema:
  - `organizations(owner_user_id, name, max_seats, used_seats, stripe_customer_id)` (or a minimal subset)
  - `organization_members(organization_id, user_id, role)` with role values constrained to {`owner`,`admin`,`teacher`,`viewer`}
- If additional org fields are required (type, billing_email, metadata, status), schema must be extended **explicitly** and migrations applied; until then, do not reference those fields.

**Recommended status behavior until fixed**

- Return HTTP `501` with structured error:
  - `code`: `NOT_IMPLEMENTED`
  - `message`: “Organization creation is webhook-driven; direct org creation endpoint is not supported.”

### POST `/api/v1/organizations/:orgId/seats` (NON-CANONICAL)

**Why unsafe today (exact mismatches)**

- Handler assumes `organization_members` has:
  - `id` column (NOT PRESENT; PK is composite)
  - `status` column (NOT PRESENT)
- Handler default role is `member`, but `organization_members_role_check` allows only {`owner`,`admin`,`teacher`,`viewer`}. `member` is **rejected**.
- Handler references `organization_invites` for invite path, which is **NOT PRESENT**.

**What must change to become canonical**

- Handler must:
  - Use canonical role values and validate them
  - Insert membership using only (`organization_id`, `user_id`, `role`)
  - Define and enforce seat capacity policy (`used_seats` reconciliation) consistent with `docs/commerce/entitlement-model.md`
  - Add any required invite table/function via migration if invites are supported

**Recommended status behavior until fixed**

- Return HTTP `501` with structured error:
  - `code`: `NOT_IMPLEMENTED`
  - `message`: “Seat management endpoint is not available until canonical seat lifecycle is implemented.”

---

## Webhook contract details (explicit)

#### Handled Stripe event types (current code)

The webhook receiver dispatches only these event types:

| Event type                      |
| ------------------------------- |
| `checkout.session.completed`    |
| `customer.subscription.created` |
| `customer.subscription.updated` |
| `customer.subscription.deleted` |
| `invoice.payment_succeeded`     |
| `invoice.payment_failed`        |

#### Canonical support matrix (event types)

The receiver may accept all events above, but **canonical support** depends on whether the handler’s side effects are fully backed by **PRESENT** schema.

| Event type                      | Canonical status                        | Notes                                                                                                                                                                          |
| ------------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `customer.subscription.created` | CANONICAL                               | Writes `subscriptions` with columns that are PRESENT.                                                                                                                          |
| `customer.subscription.updated` | CANONICAL                               | Writes `subscriptions` with columns that are PRESENT.                                                                                                                          |
| `customer.subscription.deleted` | CANONICAL                               | Writes `subscriptions` with columns that are PRESENT.                                                                                                                          |
| `invoice.payment_succeeded`     | PARTIALLY CANONICAL                     | Canonical org bootstrap (`organizations`, `organization_members`) is supported; any attempt to write NOT PRESENT `subscriptions.*` columns is non-canonical and must be fixed. |
| `invoice.payment_failed`        | CANONICAL                               | No DB writes.                                                                                                                                                                  |
| `checkout.session.completed`    | NON-CANONICAL (unsupported until fixed) | Organization path references `organization_accounts` (NOT PRESENT).                                                                                                            |

#### Idempotency rules (durable storage)

- Idempotency key: `stripe_webhook_events.event_id` (PK).
- Receiver behavior:
  - First-seen event_id: inserts a row and processes the event.
  - Duplicate event_id: does **not** process; returns `{status:'skipped_duplicate', duplicate:true}`.

#### Retry behavior

- Stripe may retry deliveries.
- This receiver treats replays as duplicates once recorded.
- **Fail-closed** for processing errors: processing errors are recorded (`status='failed'`) and the HTTP response is still `200` with `{status:'failed'}`.

#### Flow 3 org creation metadata contract (required)

For Flow 3 org bootstrapping on `invoice.payment_succeeded`, CommerceAgent reads metadata from the Stripe subscription:

| Key                |                            Required | Type             | Source                |
| ------------------ | ----------------------------------: | ---------------- | --------------------- |
| `accountType`      |                                 yes | string           | subscription.metadata |
| `organizationName` | yes (when accountType=organization) | string           | subscription.metadata |
| `seatCount`        | yes (when accountType=organization) | string (numeric) | subscription.metadata |
| `userId`           | yes (when accountType=organization) | string (UUID)    | subscription.metadata |
| `planId`           |                            optional | string           | subscription.metadata |

Current behavior:

- Org bootstrap only occurs when `accountType === 'organization'` and all required keys are present.
- Org membership bootstrap inserts `role='owner'`.

---

## Compatibility + Known Gaps (must be resolved before claiming full canonical compliance)

These are verified drifts between current code and wired Supabase schema and/or between route handler intent and downstream implementation.

| Area                                                          | What code does today                                                                               | Why it’s wrong (grounded)                                                                                                                                                                        | Target contract we want                                                                                                                | Required code change                                                                                                                                                                                        |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Checkout argument order (`/checkout`, `/checkout/individual`) | REST handler calls `createIndividualCheckout(userId, planId, interval, discountCode)`              | CommerceAgent signature is `createIndividualCheckout(userId, planId, discountCode?)` (no interval param). Interval is currently passed as `discountCode`, and the real discount code is dropped. | `POST /api/v1/checkout` request should support **both** `billingInterval` and `discountCode` (independently) and apply them correctly. | Change REST handler call to match signature **and** update CommerceAgent to accept interval explicitly (e.g. `createIndividualCheckout(userId, planId, billingInterval, discountCode?)` or options object). |
| Org checkout interval (`/checkout/organization`)              | REST handler computes `billingInterval` and passes it                                              | CommerceAgent `createOrganizationCheckout` does not accept interval; billingInterval is silently ignored downstream.                                                                             | `POST /api/v1/checkout/organization` must create a session consistent with requested billing interval.                                 | Update CommerceAgent `createOrganizationCheckout` to accept interval and select correct Stripe price; update handler call.                                                                                  |
| Webhook `checkout.session.completed` org path                 | `handleCheckoutCompleted` calls `createOrganizationAccount` → inserts into `organization_accounts` | `organization_accounts` table is **NOT PRESENT** in wired Supabase. This webhook path is therefore non-canonical and must be considered unsupported.                                             | Webhook org lifecycle must write only canonical org-seat model: `organizations` + `organization_members` (Flow 3).                     | Either (A) delete/disable the org path for this event type, or (B) rewrite it to use canonical schema (`organizations`, `organization_members`) and seat invariants.                                        |
| Webhook `invoice.payment_succeeded` subscription insert       | `handleInvoicePaymentSucceeded` inserts into `subscriptions` including `stripe_customer_id`        | `subscriptions.stripe_customer_id` column is **NOT PRESENT**. Insert attempt will fail or be dropped by PostgREST schema cache rules.                                                            | Org bootstrap is the canonical effect; subscription persistence must use only PRESENT subscription columns.                            | Remove `stripe_customer_id` from the insert **or** add the column via migration and backfill strategy; keep idempotency semantics intact.                                                                   |
| Subscription plan change update (`/subscription/upgrade`)     | `changePlan` updates `subscriptions.updated_at`                                                    | `subscriptions.updated_at` is **NOT PRESENT**. Update will fail.                                                                                                                                 | `/api/v1/subscription/upgrade` must be reliable and update the subscription record deterministically (or return a stable error).       | Either (A) stop writing `updated_at` until schema exists, or (B) add `updated_at` column via migration + trigger standard.                                                                                  |
| Standard error envelope                                       | Handlers use `{success:false,error,code}`                                                          | Prompt requires a normalized `{error:{code,message,requestId,details}}` envelope across commerce endpoints.                                                                                      | All commerce endpoints return the canonical error envelope (or provide a stable compatibility mapping).                                | Introduce a shared error helper and update handlers to emit the canonical envelope; keep legacy fields only during deprecation window.                                                                      |

---

## End-to-end scenarios (expected outcomes)

These scenarios are used to validate contracts and prevent drift.

|   # | Scenario                               | Endpoint(s)                                               | Expected outcome                                                                                                                          |
| --: | -------------------------------------- | --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
|   1 | Checkout individual success            | `POST /api/v1/checkout`                                   | HTTP 200; returns Checkout Session `sessionId`, `url`, `expiresAt`.                                                                       |
|   2 | Checkout individual alias success      | `POST /api/v1/checkout/individual`                        | HTTP 200; includes `checkoutUrl` and `url` fields (same value).                                                                           |
|   3 | Checkout org success (Flow 3 metadata) | `POST /api/v1/checkout/organization`                      | HTTP 200; Checkout Session created; subscription metadata includes `accountType=organization`, `organizationName`, `seatCount`, `userId`. |
|   4 | Duplicate webhook replay               | `POST /api/v1/stripe/webhook` twice with same event       | First: `{status:'processed', duplicate:false}`; second: `{status:'skipped_duplicate', duplicate:true}`.                                   |
|   5 | Subscription upgrade                   | `POST /api/v1/subscription/upgrade`                       | If schema aligned, updates Stripe + updates `subscriptions.plan_id`; otherwise fails per Known Gaps.                                      |
|   6 | Subscription cancel at period end      | `POST /api/v1/subscription/cancel` with `immediate=false` | Stripe cancellation scheduled; local DB updates via webhooks later.                                                                       |
|   7 | Subscription cancel immediate          | `POST /api/v1/subscription/cancel` with `immediate=true`  | Stripe subscription cancelled immediately; entitlement revocation depends on webhook updates.                                             |
|   8 | Story pack list                        | `GET /api/v1/users/me/story-packs`                        | Returns list of packs and `totalAvailable` derived from RPC.                                                                              |
|   9 | Story pack consumption path            | (outside this doc’s canonical endpoints)                  | Consumption uses `deduct_story_pack_credit` (PRESENT). Consumption must never drive remaining below 0.                                    |
|  10 | Unauthorized access attempt            | any canonical endpoint                                    | Missing/invalid JWT returns 401 (middleware).                                                                                             |
|  11 | Rate limit case (429)                  | (system-wide)                                             | 429 exists in codebase (password reset), but not explicitly enforced on commerce endpoints today. Clients should still handle 429.        |
|  12 | Schema-mismatch endpoint behavior      | NON-CANONICAL endpoints                                   | Should return 501 structured error until schema+handler aligned.                                                                          |
