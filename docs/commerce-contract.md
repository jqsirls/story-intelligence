# Commerce Contract

## Non-negotiables
- Webhook handler is the source of truth for entitlements.
- Idempotency is enforced by durable storage (`stripe_webhook_events`) plus deterministic response signaling.
- Any secret leakage in artifacts is an automatic FAIL.

## Scope
- Commerce gates and their PASS criteria.
- A PASS means the scripted gate ran end-to-end with required artifacts and invariants satisfied. Any deviation is FAIL.

## Operational requirements
- Must be runnable against prod with prod keys when we cut over.
- Must support test and prod via env only (no code edits to switch).

## Stripe TEST lane
Stripe TEST lane is configured via SSM under `/storytailor-production/stripe/test/*` and is activated by `STRIPE_MODE=test` in Universal Agent.

**Environment note (important)**: there is currently **no isolated “test DB”**. Stripe TEST mode runs against a **shared Supabase project** (the same project the Universal Agent is wired to). Safety relies on test Stripe keys and non-real users.

## Entitlements
- Canonical entitlement definitions and resolution rules live in: `docs/commerce/entitlement-model.md`
- Canonical commerce REST API contracts live in: `docs/commerce/api-contracts.md`

To populate the TEST lane params **without ever pasting secrets into chat**, run the local setter script. It validates prefixes and never echoes secret values:

```bash
AWS_REGION=us-east-1 SSM_PREFIX=/storytailor-production \
STRIPE_TEST_SECRET_KEY='sk_test_...' \
STRIPE_TEST_WEBHOOK_SECRET='whsec_...' \
STRIPE_TEST_PRICE_ID_INDIVIDUAL_MONTHLY='price_...' \
STRIPE_TEST_PRICE_ID_INDIVIDUAL_YEARLY='price_...' \
STRIPE_TEST_PRICE_ID_ORG='price_...' \
bash scripts/set-stripe-test-lane-ssm.sh
```

**Redaction rule (non-negotiable)**: artifacts must contain **no** `sk_test_`, `whsec_`, or `client_secret` anywhere. Any secret leakage is an automatic FAIL.

If Stripe TEST mode is missing the LIVE plans/prices, sync them from LIVE into TEST (no secrets printed; keys are read from SSM):

```bash
AWS_REGION=us-east-1 SSM_PREFIX=/storytailor-production \
node scripts/sync-stripe-test-plans.js --live-product prod_TE3k9XzvFALmMl --write-ssm-price-ids
```

## Dependency gates
- **AUTH must be green before Flow 3 can run**:
  - Gate: `COMMERCE_FLOW=auth_gate`
  - PASS line required: `AUTH_GATE PASS token_acquired=true artifacts=...`
  - If this gate fails, do not proceed to Flow 3. Fix `POST /api/v1/auth/register` + `POST /api/v1/auth/login` first.

## Flow 5: Webhook Idempotency Contract
- Endpoint: `POST /api/v1/stripe/webhook`
- Inputs: real Stripe event payload + `Stripe-Signature`
- Response contract:
  - First receipt: `{ received: true, status: "processed", duplicate: false, eventId }`
  - Replays: `{ received: true, status: "skipped_duplicate", duplicate: true, eventId }`
- DB invariant:
  - Table: `stripe_webhook_events`
  - UNIQUE(event_id); exactly one row per event_id
  - status must be `processed` after successful handling
- Failure modes that must FAIL the gate:
  - Missing or invalid signature
  - Missing env required by webhook path
  - Supabase insert/update errors
  - Event rows >1 or status not `processed`
  - Response not matching the processed/skipped_duplicate contract

## Proof
- Event: `evt_1SlDfTBfddQoErBP6b1FiBbs`
- PASS lines (consecutive):
  1) `COMMERCE_IDEMPOTENCY PASS runId=882d274e-f73b-40f5-8d84-279a39ddd123 eventId=evt_1SlDfTBfddQoErBP6b1FiBbs artifacts=/tmp/commerce-gate-webhook_replay-882d274e-f73b-40f5-8d84-279a39ddd123`
  2) `COMMERCE_IDEMPOTENCY PASS runId=a962f6da-3327-4680-bdcd-127a0a846739 eventId=evt_1SlDfTBfddQoErBP6b1FiBbs artifacts=/tmp/commerce-gate-webhook_replay-a962f6da-3327-4680-bdcd-127a0a846739`
  3) `COMMERCE_IDEMPOTENCY PASS runId=50035d29-2e47-4354-b839-fd6198cc1cf0 eventId=evt_1SlDfTBfddQoErBP6b1FiBbs artifacts=/tmp/commerce-gate-webhook_replay-50035d29-2e47-4354-b839-fd6198cc1cf0`
- Redaction check: artifacts must contain no `sk_test_`, `whsec_`, or `client_secret`.

## Evidence checklist
- 2x webhook responses (processed then skipped_duplicate)
- db-after.json shows exactly one row for event_id
- grep proves no `sk_test_`, `whsec_`, `client_secret`
- PASS line emitted

## Prod cutover definition
- Same flows, same scripts, same gates; only env vars change (prod Stripe secrets + prod webhook secret).
- Launch bar: 3× PASS for Flow 1 + 3× PASS for Flow 5 in prod mode, with artifacts archived.

## Artifact durability
- Current artifact location: `artifacts/commerce-flow5/...` in repo (copied from /tmp after runs). Keep committed until replaced by a durable store.
- If artifacts are moved out of git later, preferred destination: S3 or Dropbox with immutable paths. Store SHA256 and final URLs/paths in repo (a small manifest) to preserve auditability.

## Flow 5 Runbook
- Prereqs: 3 fresh Stripe eventIds (never seen by `stripe_webhook_events`); no FORCE_REPLAY; no deletes.
- Env required: API_BASE_URL, STRIPE_SECRET_KEY_TEST, STRIPE_WEBHOOK_SECRET_TEST, STRIPE_REPLAY_EVENT_ID, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
- Command (per event): `COMMERCE_FLOW=webhook_replay STRIPE_REPLAY_EVENT_ID=<evt> bash scripts/commerce-gate.sh`
- Expected responses:
  - First POST: `{ received:true, status:"processed", duplicate:false, eventId:<evt> }`
  - Second POST: `{ received:true, status:"skipped_duplicate", duplicate:true, eventId:<evt> }`
- Required artifacts per run: `stripe-event.json`, `webhook-replay-request.json`, `webhook-replay-response-1.json`, `webhook-replay-response-2.json`, `db-after.json`, `steps.jsonl`, `sanitized-http.log`.
- Redaction check must pass (no `sk_test_`, `whsec_`, `client_secret` in artifacts).

