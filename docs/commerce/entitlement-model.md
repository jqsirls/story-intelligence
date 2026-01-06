### Entitlement Model (canonical)

This is the single canonical definition of **entitlements** in Storytailor: what they are, where they come from, and how the system resolves conflicts.

**Important context**: today, commerce is exercised in **Stripe test mode** against a **shared Supabase database** (there is **no isolated “test DB”**). Safety relies on non-real users, test Stripe keys, and strict redaction in artifacts.

---

### Preflight (required inventory)

This section is deliberately “mechanical”: it lists the exact endpoints and the exact database objects the model depends on. Anything referenced but missing is marked **NOT PRESENT**.

#### 1) REST endpoints involved (current code) + handler locations

All endpoints below are implemented in `packages/universal-agent/src/api/RESTAPIGateway.ts`.

| Endpoint | Method | Handler location | Notes |
|---|---:|---|---|
| `/api/v1/stripe/webhook` | POST | `RESTAPIGateway.ts` L148-L317 | Raw-body Stripe webhook receiver. Writes `stripe_webhook_events` + calls CommerceAgent handlers per event type. |
| `/api/v1/checkout` | POST | `RESTAPIGateway.ts` L12342-L12389 | Individual checkout (calls `commerceAgent.createIndividualCheckout`). |
| `/api/v1/checkout/individual` | POST | `RESTAPIGateway.ts` L12391-L12439 | Alias of individual checkout. |
| `/api/v1/checkout/organization` | POST | `RESTAPIGateway.ts` L12441-L12496 | Org checkout (calls `commerceAgent.createOrganizationCheckout`). Seats are requested as `seatCount`. |
| `/api/v1/subscription` | GET | `RESTAPIGateway.ts` L12498-L12549 | Read model: current subscription (calls `commerceAgent.getSubscriptionStatus`). |
| `/api/v1/subscriptions/me` | GET | `RESTAPIGateway.ts` L12551-L12603 | Alias of `/api/v1/subscription`. |
| `/api/v1/subscription/cancel` | POST | `RESTAPIGateway.ts` L12605-L12649 | Cancel subscription (calls `commerceAgent.cancelSubscription`). |
| `/api/v1/subscription/upgrade` | POST | `RESTAPIGateway.ts` L12651-L12703 | Upgrade/change plan (calls `commerceAgent.changePlan`). |
| `/api/v1/subscription/usage` | GET | `RESTAPIGateway.ts` L12705-L12765 | Read model: subscription usage (counts stories/characters; uses `subscriptions`). |
| `/api/v1/users/me/credits` | GET | `RESTAPIGateway.ts` L11702-L11730 | Read model: billing credits via `rpc('calculate_user_credits')`. **DB function is NOT PRESENT** (see below), so this endpoint is currently expected to 500 until fixed. |
| `/api/v1/story-packs/buy` | POST | `RESTAPIGateway.ts` L12771-L12813 | **Returns 501 NOT_IMPLEMENTED** in current build. |
| `/api/v1/users/me/story-packs` | GET | `RESTAPIGateway.ts` L12815-L12857 | Read model: list story packs + total pack credits via `get_total_pack_credits`. |
| `/api/v1/organizations/:orgId/seats` | POST | `RESTAPIGateway.ts` L7988-L8067 | Seat-management endpoint exists, but its write-shape references columns/tables that are **NOT PRESENT** (see “Schema mismatches”). Not currently safe/canonical. |
| `/api/v1/organizations/:orgId/members` | GET | `RESTAPIGateway.ts` L8069-L8101 | Read model: org members (selects from `organization_members`). |

#### 2) Supabase objects currently present (tables/columns/constraints/RLS)

Below is the current schema inventory for entitlement-critical tables in the wired Supabase database.

##### Tables + columns

| Table | Present | Columns (name: type) |
|---|---:|---|
| `subscriptions` | PRESENT | `id: uuid`, `user_id: uuid`, `stripe_subscription_id: text`, `plan_id: text`, `status: text`, `current_period_start: timestamptz`, `current_period_end: timestamptz`, `created_at: timestamptz`, `tier: text`, `story_limit: integer`, `interval: text` |
| `stripe_webhook_events` | PRESENT | `event_id: text`, `type: text`, `livemode: boolean`, `event_created: timestamptz`, `received_at: timestamptz`, `processed_at: timestamptz`, `status: text`, `error_message: text`, `payload_hash: text` |
| `organizations` | PRESENT | `id: uuid`, `name: text`, `owner_user_id: uuid`, `stripe_customer_id: text`, `created_at: timestamptz`, `updated_at: timestamptz`, `max_seats: integer`, `used_seats: integer` |
| `organization_members` | PRESENT | `organization_id: uuid`, `user_id: uuid`, `role: text`, `created_at: timestamptz`, `updated_at: timestamptz` |
| `story_packs` | PRESENT | `id: uuid`, `user_id: uuid`, `pack_type: text`, `stories_remaining: integer`, `stripe_payment_intent_id: text`, `stripe_checkout_session_id: text`, `purchased_at: timestamptz`, `expires_at: timestamptz`, `created_at: timestamptz`, `updated_at: timestamptz` |
| `reward_ledger` | PRESENT | `id: uuid`, `user_id: uuid`, `source: text`, `amount: integer`, `currency: text`, `stripe_balance_txn_id: text`, `stripe_customer_id: text`, `status: text`, `applied_to_invoice: text`, `applied_at: timestamptz`, `expires_at: timestamptz`, `description: text`, `metadata: jsonb`, `created_at: timestamptz`, `updated_at: timestamptz` |
| `credits` | NOT PRESENT | — |

##### Constraints (selected)

| Table | Constraint | Definition |
|---|---|---|
| `subscriptions` | `subscriptions_status_check` | CHECK status ∈ {`trialing`,`active`,`past_due`,`paused`,`canceled`,`unpaid`,`incomplete`,`incomplete_expired`} |
| `subscriptions` | `subscriptions_stripe_subscription_id_key` | UNIQUE(`stripe_subscription_id`) |
| `stripe_webhook_events` | `stripe_webhook_events_pkey` | PRIMARY KEY(`event_id`) |
| `organizations` | `valid_seat_usage` | CHECK(`used_seats` ≤ `max_seats`) |
| `organizations` | `organizations_stripe_customer_id_key` | UNIQUE(`stripe_customer_id`) |
| `organization_members` | `organization_members_pkey` | PRIMARY KEY(`organization_id`,`user_id`) |
| `organization_members` | `organization_members_role_check` | CHECK role ∈ {`owner`,`admin`,`teacher`,`viewer`} (**NOTE**: `member` is NOT PRESENT as an allowed value) |
| `story_packs` | `story_packs_stories_remaining_check` | CHECK(`stories_remaining` ≥ 0) |
| `reward_ledger` | `reward_ledger_status_check` | CHECK status ∈ {`pending`,`applied`,`expired`,`refunded`} |

##### RLS policies (relevant)

| Table | RLS enabled | Policies present |
|---|---:|---|
| `subscriptions` | true | `subscription_access` (ALL; `user_id = auth.uid()`) |
| `stripe_webhook_events` | false | **None** |
| `organizations` | true | `org_owner_full` (ALL; owner-only), `organizations_policy` (SELECT; owner or `is_org_member(id)`) |
| `organization_members` | true | `org_members_read` (SELECT; `is_org_member(organization_id)`), `org_admin_write` (ALL; `is_org_admin(organization_id)`) |
| `story_packs` | true | `story_packs_own_records` (SELECT own), `story_packs_system_modify` (ALL true) |
| `reward_ledger` | true | “Users can view their own reward ledger” (SELECT own), “System can insert reward ledger” (INSERT true) |

##### RLS policy definitions (verbatim qualifiers)

| Table | Policy | Command | Using (qual) | With check |
|---|---|---|---|---|
| `subscriptions` | `subscription_access` | ALL | `(user_id = auth.uid())` | — |
| `organizations` | `org_owner_full` | ALL | `(owner_user_id = auth.uid())` | `(owner_user_id = auth.uid())` |
| `organizations` | `organizations_policy` | SELECT | `((owner_user_id = auth.uid()) OR is_org_member(id))` | — |
| `organization_members` | `org_members_read` | SELECT | `is_org_member(organization_id)` | — |
| `organization_members` | `org_admin_write` | ALL | `is_org_admin(organization_id)` | `is_org_admin(organization_id)` |
| `story_packs` | `story_packs_own_records` | SELECT | `(auth.uid() = user_id)` | — |
| `story_packs` | `story_packs_system_modify` | ALL | `true` | `true` |
| `reward_ledger` | Users can view their own reward ledger | SELECT | `(auth.uid() = user_id)` | — |
| `reward_ledger` | System can insert reward ledger | INSERT | — | `true` |

##### Required/expected database functions

| Function | Present | Notes |
|---|---:|---|
| `public.is_org_member(uuid)` | PRESENT | SECURITY DEFINER (used by org RLS) |
| `public.is_org_admin(uuid)` | PRESENT | SECURITY DEFINER (used by org RLS) |
| `public.set_updated_at_org_members()` | PRESENT | INVOKER; used by `organization_members_set_updated_at` trigger |
| `public.get_total_pack_credits(uuid)` | PRESENT | SECURITY DEFINER |
| `public.deduct_story_pack_credit(uuid)` | PRESENT | SECURITY DEFINER |
| `public.calculate_user_credits(uuid)` | **NOT PRESENT** | `/api/v1/users/me/credits` calls this today; endpoint is currently not reliable until function exists. |

##### Schema mismatches impacting entitlement endpoints

These are factual mismatches between **current API handlers** and **current DB schema**:

- **Org seat write endpoint mismatch**:
  - `POST /api/v1/organizations/:orgId/seats` writes `organization_members.id` + `organization_members.status`.
  - DB table `organization_members` has **no `id` column** and **no `status` column** (composite primary key is `(organization_id, user_id)`).
  - The endpoint’s “invite” path writes to `organization_invites` which is **NOT PRESENT**.
- **Org create endpoint mismatch**:
  - `POST /api/v1/organizations` writes `organizations.type`, `organizations.owner_id`, `organizations.billing_email`, `organizations.status`, `organizations.metadata`.
  - DB table `organizations` has **none of those columns**; it uses `owner_user_id`, `stripe_customer_id`, `max_seats`, `used_seats`.
  - Therefore this endpoint is **not part of the canonical entitlement model** until it is reconciled with the canonical schema.

---

### Terms and entities

| Entity | What it represents | Source of truth | Key fields |
|---|---|---|---|
| **User** | A Storytailor account holder | `public.users` + `auth.users` | `id`; relevant fields include `available_story_credits` and `test_mode_authorized` (used by quota enforcement) |
| **Plan/Tier** | Entitlement “package” | App config + Stripe + DB `subscriptions.plan_id` | `plan_id` (e.g. `pro_individual`, `pro_organization`, `free`) |
| **Subscription** | Recurring entitlement | `public.subscriptions` (written by webhooks) | `stripe_subscription_id`, `plan_id`, `status`, period start/end |
| **Organization** | Seat-based account container | `public.organizations` | `owner_user_id`, `max_seats`, `used_seats`, `stripe_customer_id` |
| **Membership** | A user’s membership in an org | `public.organization_members` | (`organization_id`,`user_id`) + `role` |
| **Seat** | A conceptual seat allocation | Derived | Seat count = `organizations.max_seats`; seat usage = `organizations.used_seats` |
| **Story Pack** | One-time consumable story credits | `public.story_packs` | `stories_remaining`, `expires_at`, Stripe ids |
| **Credits/Balance** | Monetary credits (billing) or story credits | `public.reward_ledger` (money); `users.available_story_credits` + `story_packs` (story) | Money credits are **cents**; story credits are **counts** |
| **Webhook Event** | Durable idempotency record | `public.stripe_webhook_events` | `event_id`, `type`, `status`, timestamps, `payload_hash` |
| **Entitlement Snapshot** | The client-facing computed view | Derived from the above | See JSON schema below |

---

### Entitlement domains (do not conflate)

| Domain | Question answered | Domain units | Primary sources |
|---|---|---:|---|
| **Story creation quota** | “Can I create a story now?” | story-count credits or unlimited | `subscriptions`, `story_packs`, `users.available_story_credits` |
| **Feature access** | “What features are unlocked?” | plan flags | `subscriptions.plan_id`, org membership (future wiring) |
| **Seat access** | “Am I in the org and what can I do?” | membership + role | `organizations`, `organization_members` |
| **Billing credits** | “What monetary credit do I have?” | **cents** | `reward_ledger` (function to sum is NOT PRESENT today) |

---

### Canonical rules

#### Rule set: story creation quota (current enforcement order)

This rule set matches the story-create handler’s logic in `RESTAPIGateway.ts` around the quota enforcement block (see L1459-L1614).

| Priority | Condition | Decision | Consumption side-effects |
|---:|---|---|---|
| 1 | User is “test-mode authorized” | Allow (unlimited) | None |
| 2 | Active subscription exists with `plan_id != 'free'` | Allow (unlimited) | None |
| 3 | `get_total_pack_credits(userId) > 0` (or equivalent pack remaining sum) | Allow | Deduct 1 story from packs (FIFO) |
| 4 | `users.available_story_credits >= 1` | Allow | Decrement by 1 |
| 5 | Otherwise | Deny with HTTP `402` | None |

**Invariant**: story packs and free story credits must never go negative.

**Note**: org membership-based quota is not yet wired into story-create gating; it becomes active once the org-member entitlement read model is formalized and enforced.

#### Precedence rules: org vs individual vs “family”

| Category | Present today | Canonical precedence / conflict resolution |
|---|---:|---|
| Individual subscription (`subscriptions`) | PRESENT | Grants unlimited story creation for the user when `status='active'` and `plan_id!='free'`, regardless of other credit sources. |
| Org membership (`organization_members`) | PRESENT | Grants org-scoped feature access while membership is present. **Story-creation quota via org membership is not wired into the story-create gate yet**, so it must not be assumed by clients until implemented. |
| “Family plan” entitlements | NOT PRESENT | No schema or endpoints define a family plan today; do not assume family precedence semantics. |

**Conflict resolution principle (canonical)**: entitlements are the **union** of applicable grants, with **conservative enforcement** until explicitly implemented. When a feature is available from either individual subscription or org membership, it is treated as available; if billing attribution differs, the request context must select the payer (out of scope for this doc).

#### Rule set: organization seats

| Rule | Invariant / requirement |
|---|---|
| Seat capacity | `organizations.used_seats <= organizations.max_seats` (enforced by DB check constraint). |
| Membership uniqueness | One membership per (org,user) (enforced by composite primary key). |
| Role validity | DB currently allows roles: `owner`, `admin`, `teacher`, `viewer`. Any other role value is rejected. |
| Bootstrap | Webhook path must create org + owner membership (`role='owner'`) using service-role Supabase client. |
| Reconciliation | `used_seats` must reflect membership count under the chosen reconciliation policy (see state machine below). |

#### Rule set: packs vs subscription (coexistence + consumption priority)

| Situation | Expected behavior |
|---|---|
| User has active subscription and also owns packs | Subscription grants unlimited story creation; packs are **not consumed** while subscription is active. |
| User cancels subscription (period-end) | During paid-through period, still unlimited; after entitlement ends, packs become eligible for consumption. |
| Pack expires | Expired packs do not contribute to available credits and are not eligible for consumption. |
| Multiple packs | Consume FIFO by `purchased_at` (via `deduct_story_pack_credit`). |

#### Rule set: billing credits (money)

| Rule | Current status |
|---|---|
| Credits are monetary (cents) | Implemented: `reward_ledger.amount` is integer cents. |
| Credits available = sum of `reward_ledger.amount` where `status='pending'` and not expired | **NOT PRESENT in DB**: `public.calculate_user_credits(p_user_id)` is missing. |
| Client read model | `/api/v1/users/me/credits` calls the missing RPC today → client cannot rely on it until fixed. |

---

### State machines

#### A) Stripe webhook processing (idempotency) state machine

**Entity**: `stripe_webhook_events` row keyed by `event_id`.

| State | Entry condition | Exit condition | Next state | Fail-closed behavior |
|---|---|---|---|---|
| `received` | First time seeing event_id (upsert created row) | Handler succeeds | `processed` | If handler throws, update `failed` and return `{status:'failed'}` with HTTP 200 (idempotency). |
| `processed` | Handler completed | Any replay of same event_id | `processed` (no-op) | Replays return `{status:'skipped_duplicate', duplicate:true}`. |
| `failed` | Handler threw | Operator action or future remediation | (no automatic retry path defined) | Replays are treated as duplicates (row exists) → skipped. |

**Idempotency invariant**: exactly one row per `event_id` (PK enforces uniqueness).

**Handled Stripe event types (current code)**:
- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

**NOT IMPLEMENTED** (must not be assumed): refunds, disputes, chargebacks, invoice voids.

#### B) Subscription state machine (derived from `subscriptions.status`)

| State | Meaning | How it is entered | How it exits |
|---|---|---|---|
| `trialing` | Subscription trial period | Stripe subscription created/updated webhook | Becomes `active` or `canceled` |
| `active` | Paid and current | `invoice.payment_succeeded` or subscription created/updated to active | Becomes `past_due` / `paused` / `canceled` |
| `past_due` | Payment failed, awaiting recovery | `invoice.payment_failed` / Stripe updated | Becomes `active` after payment recovery; or `canceled` |
| `paused` | Temporarily paused (if Stripe sends) | Stripe updated | Becomes `active` or `canceled` |
| `canceled` | No longer active | `customer.subscription.deleted` or cancellation | Terminal (unless new subscription created) |
| `unpaid` / `incomplete` / `incomplete_expired` | Stripe payment lifecycle states | Stripe updated | Becomes `active` or `canceled` |

**Client invariant**: subscription read models must treat only `status='active'` as unlimited entitlement unless explicitly specified otherwise.

#### C) Organization seat membership state machine (canonical intent)

**Entity**: membership row `organization_members(organization_id,user_id)`.

| State | Representation | Entry | Exit |
|---|---|---|---|
| `present` | row exists | Add seat / bootstrap owner | Seat removal / revoke |
| `absent` | row missing | — | Seat add |

**Overage behavior** (policy choice; must be consistent):
- Hard-stop writes when `used_seats == max_seats`, unless it’s reconciling an already-existing member set.

**Reconciliation invariant**: define one of:
- `used_seats == count(memberships)` (strict), or
- `used_seats` is monotonic with explicit seat-add/remove operations (operational).

Current schema supports both, but **gates must pick one** and enforce it.

#### D) Story pack state machine

**Entity**: story pack row `story_packs.id`.

| State | Condition | Eligible for consumption |
|---|---|---:|
| `active` | `stories_remaining > 0` AND (`expires_at` is null OR `expires_at > now()`) | yes |
| `depleted` | `stories_remaining = 0` | no |
| `expired` | `expires_at <= now()` | no |

Consumption invariant: `stories_remaining` must never drop below 0 (DB check enforces).

---

### Upgrade / downgrade / cancellation semantics (current vs intended)

| Topic | Canonical expectation | Current implementation status |
|---|---|---|
| Upgrade | reflected in `subscriptions.plan_id` after webhook processing | Implemented via webhook handlers + `changePlan` endpoint (calls CommerceAgent) |
| Downgrade | same as upgrade but to lower plan | Partially covered by `changePlan`; explicit semantics not documented in code |
| Proration | Stripe may prorate; entitlement should reflect Stripe’s authoritative period/state | Not enforced by gates yet |
| Cancel at period end | Access remains until period end | `subscription/cancel` endpoint supports `immediate` flag; effective semantics depend on CommerceAgent |
| Immediate cancel | Access revoked immediately | Implemented only if CommerceAgent supports it; must be gated |
| Grace windows | Optional “soft grace” after payment failure | Not defined as a first-class model today |

---

### Refunds / chargebacks / disputes (current behavior)

| Event type | Expected entitlement effect | Status |
|---|---|---|
| Refund (`charge.refunded`) | revoke / adjust entitlements if refund invalidates entitlement | **NOT IMPLEMENTED** |
| Dispute / chargeback | revoke / lock | **NOT IMPLEMENTED** |

**Fail-closed rule**: if these are not implemented, clients must not assume automatic revocation; operators must handle manually until built.

---

### Client contract (what the client can assume)

| Endpoint | Client can assume | Client must NOT assume |
|---|---|---|
| `GET /api/v1/subscription` | Returns current active subscription (if any) | That org membership is reflected here |
| `GET /api/v1/subscription/usage` | Returns usage counters and plan id | That it includes story pack balances |
| `GET /api/v1/users/me/story-packs` | Returns list + totalAvailable from DB function | That buying packs works via API (`buy` is 501) |
| `GET /api/v1/users/me/credits` | **Not reliable today** (depends on missing function) | Any billing credit value |
| `POST /api/v1/stripe/webhook` | Idempotent: duplicate events are skipped | That all Stripe event types are handled |
| `POST /api/v1/organizations/:orgId/seats` | **Not canonical today** (schema mismatch) | Seat add/remove is safe/working |
| `GET /api/v1/organizations/:orgId/members` | Reads `organization_members` rows if RLS allows | That member role set includes `member` (not allowed by DB constraint) |

---

### Concrete scenarios (expected outcomes)

| # | Scenario | Inputs | Expected outcome |
|---:|---|---|---|
| 1 | Free user, no credits | no active subscription; packs=0; `available_story_credits=0` | Story create returns **402** (quota exceeded). |
| 2 | Free user with 1 free story credit | `available_story_credits=1` | Story create allowed; decrements to 0. |
| 3 | User with active individual subscription | `subscriptions.status='active'`, `plan_id='pro_individual'` | Story create allowed, unlimited; no pack/free credit consumed. |
| 4 | User with packs only | `get_total_pack_credits(userId)=5` | Story create allowed; consumes 1 pack credit FIFO. |
| 5 | User with active subscription AND packs | both present | Story create allowed; **packs not consumed** while sub active. |
| 6 | Org checkout webhook succeeds | `invoice.payment_succeeded` with metadata `{accountType:'organization', seatCount, userId}` | Webhook creates `organizations` + `organization_members(owner)` + `subscriptions` row. |
| 7 | Duplicate webhook replay | same `event_id` posted again | Webhook returns `skipped_duplicate`, no additional DB writes. |
| 8 | Org seat endpoint called with role='member' | POST `/organizations/:orgId/seats` default role | **Should fail** (DB role constraint does not allow `member`) → requires code/schema reconciliation. |
| 9 | Story pack expires | `expires_at <= now()` | Pack not counted in totals; not consumable. |
| 10 | Credits endpoint called | GET `/users/me/credits` | Expected **500** until `calculate_user_credits` exists (NOT PRESENT). |
| 11 | Subscription upgrade | POST `/subscription/upgrade` with valid `planId` | Stripe updates subscription; webhook updates `subscriptions.plan_id`; user remains unlimited if `status='active'`. |
| 12 | Payment failure | Stripe sends `invoice.payment_failed` | Webhook handler runs; subscription may move to `past_due`; story-create gate treats non-`active` subs as not unlimited (falls back to packs/free). |
| 13 | Seat capacity reached | `used_seats == max_seats` then attempt to add a new member | Canonical behavior is hard-stop (deny) unless reconciliation strategy explicitly allows; must be enforced by seat add/remove gates. |
| 14 | Role value rejected | Attempt to insert membership with role not in {owner,admin,teacher,viewer} | DB rejects due to `organization_members_role_check`; handler must return 4xx (not 500) once seat endpoints are reconciled. |

---

### Entitlement Snapshot (canonical JSON schema)

This is the canonical read model that future “commerce APIs” should converge on. It intentionally separates *story credits* from *billing credits*.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "EntitlementSnapshot",
  "type": "object",
  "required": ["userId", "computedAt", "storyAccess", "billingCredits", "organizations"],
  "properties": {
    "userId": { "type": "string", "format": "uuid" },
    "computedAt": { "type": "string", "format": "date-time" },
    "storyAccess": {
      "type": "object",
      "required": ["canCreate", "mode"],
      "properties": {
        "canCreate": { "type": "boolean" },
        "mode": {
          "type": "string",
          "enum": ["test_mode", "subscription", "story_pack", "free_credit", "denied"]
        },
        "subscription": {
          "type": ["object", "null"],
          "properties": {
            "planId": { "type": "string" },
            "status": { "type": "string" },
            "stripeSubscriptionId": { "type": ["string", "null"] }
          }
        },
        "packs": {
          "type": "object",
          "required": ["totalAvailable"],
          "properties": {
            "totalAvailable": { "type": "integer", "minimum": 0 }
          }
        },
        "freeCredits": {
          "type": "object",
          "required": ["available"],
          "properties": {
            "available": { "type": "integer", "minimum": 0 }
          }
        }
      }
    },
    "billingCredits": {
      "type": "object",
      "required": ["availableCents", "isSupported"],
      "properties": {
        "isSupported": { "type": "boolean" },
        "availableCents": { "type": "integer", "minimum": 0 }
      }
    },
    "organizations": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["organizationId", "role", "seats"],
        "properties": {
          "organizationId": { "type": "string", "format": "uuid" },
          "role": { "type": "string" },
          "seats": {
            "type": "object",
            "required": ["maxSeats", "usedSeats"],
            "properties": {
              "maxSeats": { "type": "integer", "minimum": 0 },
              "usedSeats": { "type": "integer", "minimum": 0 }
            }
          }
        }
      }
    }
  }
}
```

---

### Non-goals / out of scope (for this doc)

- Defining the full OpenAPI contract for every commerce endpoint (that’s the next deliverable).
- Implementing story pack purchase checkout (`/api/v1/story-packs/buy` currently returns 501).
- Implementing refunds/chargebacks/disputes handling.
- Reconciling the non-canonical org seat endpoints (`/api/v1/organizations/*`) to the canonical org-seat schema (required work, but not done in this doc).

