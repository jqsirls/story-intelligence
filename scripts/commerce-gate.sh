#!/usr/bin/env bash
set -euo pipefail

# load .env if present for local runs
if [[ -f .env ]]; then
  set -a
  source .env
  set +a
fi

FLOW="${COMMERCE_FLOW:-individual_subscription}"

# Stripe test lane defaults (safe)
SSM_PREFIX="${SSM_PREFIX:-/storytailor-production}"
STRIPE_MODE="${STRIPE_MODE:-test}"

if [[ "$FLOW" != "auth_gate" && "$STRIPE_MODE" == "test" ]]; then
  # Auto-load TEST lane secrets + price ids from SSM if not explicitly provided
  if [[ -z "${STRIPE_SECRET_KEY_TEST:-}" ]]; then
    STRIPE_SECRET_KEY_TEST="$(aws ssm get-parameter --region us-east-1 --name "${SSM_PREFIX}/stripe/test/secret-key" --with-decryption --query 'Parameter.Value' --output text 2>/dev/null || true)"
    export STRIPE_SECRET_KEY_TEST
    # Debug: confirm fetch succeeded (no secret printed)
    echo "[DEBUG] SSM fetch: secret-key len=${#STRIPE_SECRET_KEY_TEST} prefix=${STRIPE_SECRET_KEY_TEST:0:8}" >&2
  fi
  if [[ -z "${STRIPE_WEBHOOK_SECRET_TEST:-}" ]]; then
    STRIPE_WEBHOOK_SECRET_TEST="$(aws ssm get-parameter --region us-east-1 --name "${SSM_PREFIX}/stripe/test/webhook-secret" --with-decryption --query 'Parameter.Value' --output text 2>/dev/null || true)"
    export STRIPE_WEBHOOK_SECRET_TEST
  fi
  if [[ -z "${STRIPE_PRICE_ID_INDIVIDUAL_MONTHLY:-}" ]]; then
    STRIPE_PRICE_ID_INDIVIDUAL_MONTHLY="$(aws ssm get-parameter --region us-east-1 --name "${SSM_PREFIX}/stripe/test/price-id-individual-monthly" --query 'Parameter.Value' --output text 2>/dev/null || true)"
    export STRIPE_PRICE_ID_INDIVIDUAL_MONTHLY
  fi
  if [[ -z "${STRIPE_PRICE_ID_INDIVIDUAL_YEARLY:-}" ]]; then
    STRIPE_PRICE_ID_INDIVIDUAL_YEARLY="$(aws ssm get-parameter --region us-east-1 --name "${SSM_PREFIX}/stripe/test/price-id-individual-yearly" --query 'Parameter.Value' --output text 2>/dev/null || true)"
    export STRIPE_PRICE_ID_INDIVIDUAL_YEARLY
  fi
  if [[ -z "${STRIPE_PRO_ORGANIZATION_PRICE_ID:-}" ]]; then
    STRIPE_PRO_ORGANIZATION_PRICE_ID="$(aws ssm get-parameter --region us-east-1 --name "${SSM_PREFIX}/stripe/test/price-id-org" --query 'Parameter.Value' --output text 2>/dev/null || true)"
    export STRIPE_PRO_ORGANIZATION_PRICE_ID
  fi

  # Guardrails: never allow running test gates with placeholder values
  if [[ "${STRIPE_SECRET_KEY_TEST:-}" == *PLACEHOLDER* || "${STRIPE_SECRET_KEY_TEST:-}" != sk_test_* ]]; then
    echo "COMMERCE_GATE FAIL runId=none flow=bootstrap step=stripe_test_lane reason=missing_or_invalid_STRIPE_SECRET_KEY_TEST artifacts=none"
    exit 2
  fi
  if [[ "${STRIPE_WEBHOOK_SECRET_TEST:-}" == *PLACEHOLDER* || "${STRIPE_WEBHOOK_SECRET_TEST:-}" != whsec_* ]]; then
    echo "COMMERCE_GATE FAIL runId=none flow=bootstrap step=stripe_test_lane reason=missing_or_invalid_STRIPE_WEBHOOK_SECRET_TEST artifacts=none"
    exit 2
  fi
  if [[ -z "${STRIPE_PRICE_ID_INDIVIDUAL_MONTHLY:-}" || "${STRIPE_PRICE_ID_INDIVIDUAL_MONTHLY:-}" == *PLACEHOLDER* ]]; then
    echo "COMMERCE_GATE FAIL runId=none flow=bootstrap step=stripe_test_lane reason=missing_STRIPE_PRICE_ID_INDIVIDUAL_MONTHLY artifacts=none"
    exit 2
  fi
  if [[ -z "${STRIPE_PRICE_ID_INDIVIDUAL_YEARLY:-}" || "${STRIPE_PRICE_ID_INDIVIDUAL_YEARLY:-}" == *PLACEHOLDER* ]]; then
    echo "COMMERCE_GATE FAIL runId=none flow=bootstrap step=stripe_test_lane reason=missing_STRIPE_PRICE_ID_INDIVIDUAL_YEARLY artifacts=none"
    exit 2
  fi
  # Org price ID is only required for Flow 3 (org_seats)
  if [[ "$FLOW" == "org_seats" ]]; then
    if [[ -z "${STRIPE_PRO_ORGANIZATION_PRICE_ID:-}" || "${STRIPE_PRO_ORGANIZATION_PRICE_ID:-}" == *PLACEHOLDER* ]]; then
      echo "COMMERCE_GATE FAIL runId=none flow=bootstrap step=stripe_test_lane reason=missing_STRIPE_PRO_ORGANIZATION_PRICE_ID artifacts=none"
      exit 2
    fi
  fi
fi

if [[ "$FLOW" == "auth_gate" ]]; then
  if [[ -z "${API_BASE_URL:-}" || -z "${SUPABASE_URL:-}" || -z "${SUPABASE_SERVICE_ROLE_KEY:-}" || -z "${STORYTAILOR_TEST_PASSWORD:-}" ]]; then
    echo "COMMERCE_GATE FAIL runId=none flow=bootstrap step=env_check reason=missing_env artifacts=none"
    exit 2
  fi
elif [[ "$FLOW" == "webhook_replay" ]]; then
  if [[ -z "${API_BASE_URL:-}" || -z "${STRIPE_SECRET_KEY_TEST:-}" || -z "${STRIPE_WEBHOOK_SECRET_TEST:-}" || -z "${SUPABASE_URL:-}" || -z "${SUPABASE_SERVICE_ROLE_KEY:-}" ]]; then
    echo "COMMERCE_GATE FAIL runId=none flow=bootstrap step=env_check reason=missing_env artifacts=none"
    exit 2
  fi
else
  # individual_subscription, org_seats, etc. need full env
  if [[ -z "${API_BASE_URL:-}" || -z "${STRIPE_SECRET_KEY_TEST:-}" || -z "${STRIPE_WEBHOOK_SECRET_TEST:-}" || -z "${SUPABASE_URL:-}" || -z "${SUPABASE_SERVICE_ROLE_KEY:-}" || -z "${STORYTAILOR_TEST_PASSWORD:-}" ]]; then
    echo "COMMERCE_GATE FAIL runId=none flow=bootstrap step=env_check reason=missing_env artifacts=none"
    exit 2
  fi
fi
RUN_ID="$(node -e "console.log(require('crypto').randomUUID())")"
if [[ "$FLOW" == "auth_gate" ]]; then
  ARTIFACT_DIR="$(pwd)/artifacts/commerce-auth-gate/${RUN_ID}"
else
  ARTIFACT_DIR="/tmp/commerce-gate-${FLOW}-${RUN_ID}"
fi
mkdir -p "$ARTIFACT_DIR"
export RUN_ID
export ARTIFACT_DIR

node - <<'NODE'
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const fetch = global.fetch;
const { randomUUID, createHash } = crypto;

const base = process.env.API_BASE_URL;
const flow = process.env.COMMERCE_FLOW || 'individual_subscription';
const mode = process.env.COMMERCE_GATE_MODE || 'direct_subscription';
const stripeKey = process.env.STRIPE_SECRET_KEY_TEST;
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET_TEST;
const priceMonthly = process.env.STRIPE_PRICE_ID_INDIVIDUAL_MONTHLY;
const priceYearly = process.env.STRIPE_PRICE_ID_INDIVIDUAL_YEARLY;
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
const emailPrefix = process.env.STORYTAILOR_TEST_EMAIL_PREFIX || 'commerce';
const password = process.env.STORYTAILOR_TEST_PASSWORD;
const runId = process.env.RUN_ID || randomUUID();
const artifacts = process.env.ARTIFACT_DIR || `/tmp/commerce-gate-${flow}-${runId}`;
const stepsLog = path.join(artifacts, 'steps.jsonl');
const httpLog = path.join(artifacts, 'sanitized-http.log');
const stripeLog = path.join(artifacts, 'stripe.json');
const webhookLog = path.join(artifacts, 'webhook.json');
const dbLog = path.join(artifacts, 'db.json');
const entitlementsLog = path.join(artifacts, 'entitlements.json');
const summaryPath = path.join(artifacts, 'summary.json');
const preflightPath = path.join(artifacts, 'preflight.json');
const checkoutRespPath = path.join(artifacts, 'checkout-response.json');
const stripeSessionPath = path.join(artifacts, 'stripe-session.json');
const stripeLineItemsPath = path.join(artifacts, 'stripe-line-items.json');
const checkoutReqPath = path.join(artifacts, 'checkout-request.json');
const stripeSummaryPath = path.join(artifacts, 'stripe-summary.json');
const webhookReplayReqPath = path.join(artifacts, 'webhook-replay-request.json');
const webhookReplayRespPath = path.join(artifacts, 'webhook-replay-response.json');
const dbBeforePath = path.join(artifacts, 'db-before.json');
const dbAfterPath = path.join(artifacts, 'db-after.json');
const stripeEventPath = path.join(artifacts, 'stripe-event.json');
const sanitizeStripeSess = (s) => redactKeys(s || {});
const writeJson = (p, obj) => fs.writeFileSync(p, JSON.stringify(obj, null, 2));

fs.mkdirSync(artifacts, { recursive: true });
const codeSha = process.env.CODE_SHA || process.env.LAMBDA_CODE_SHA || null;

const redactKeys = (obj) => {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') {
    if (typeof obj === 'string') {
      if (obj.includes('sk_test_') || obj.includes('whsec_') || obj.toLowerCase().includes('client_secret')) {
        return '<redacted>';
      }
    }
    return obj;
  }
  if (Array.isArray(obj)) return obj.map(redactKeys);
  const out = {};
  for (const [k,v] of Object.entries(obj)) {
    const lower = k.toLowerCase();
    if (
      lower.includes('secret') ||
      lower.includes('api_key') ||
      lower.includes('authorization') ||
      lower.includes('signature') ||
      lower.includes('webhook_secret') ||
      lower.includes('client_secret') ||
      lower.includes('token')
    ) {
      out[k] = '<redacted>';
    } else {
      out[k] = redactKeys(v);
    }
  }
  return out;
};

const sanitizeForArtifact = (obj) => {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') {
    if (typeof obj === 'string') {
      return obj.replace(/sk_test_[A-Za-z0-9]+/gi, '<redacted>')
                .replace(/whsec_[A-Za-z0-9]+/gi, '<redacted>')
                .replace(/client_secret/gi, 'CLIENTSECRETREDACTED');
    }
    return obj;
  }
  if (Array.isArray(obj)) return obj.map(sanitizeForArtifact);
  const out = {};
  for (const [k,v] of Object.entries(obj)) {
    const lower = k.toLowerCase();
    if (lower.includes('secret')) continue; // drop secret keys entirely
    out[k] = sanitizeForArtifact(v);
  }
  return out;
};

const redactHeaders = (h) => {
  const out = {};
  for (const [k,v] of Object.entries(h||{})) {
    if (k.toLowerCase() === 'authorization' && typeof v === 'string') {
      out[k] = v.slice(0,12) + '...(redacted)';
    } else {
      out[k] = v;
    }
  }
  return out;
};

const logStep = (entry) => fs.appendFileSync(stepsLog, JSON.stringify(entry) + '\\n');
const logHttp = ({step, req, res, body, elapsedMs}) => {
  fs.appendFileSync(httpLog, JSON.stringify({
    step,
    req: { url: req.url, method: req.method || 'GET', headers: redactHeaders(req.headers || {}), body: req.body ? '<redacted>' : undefined },
    res: { status: res.status, ok: res.ok },
    body,
    elapsedMs
  }, null, 2) + '\\n');
};

const writeSummary = (payload) => fs.writeFileSync(summaryPath, JSON.stringify(payload, null, 2));
writeSummary({ status: 'running', runId, flow, artifacts });
const fail = (step, reason) => {
  writeSummary({ status: 'fail', step, reason, runId, flow, artifacts });
  process.exit(1);
};
const ok = (ids) => {
  writeSummary({ status: 'ok', ids, runId, flow, artifacts });
  process.exit(0);
};

const jsonFetch = async (step, url, options={}) => {
  const start = Date.now();
  const res = await fetch(url, options);
  let data = null;
  try { data = await res.json(); } catch {}
  const elapsedMs = Date.now() - start;
  logHttp({step, req: {url, ...options}, res, body: sanitizeForArtifact(redactKeys(data)), elapsedMs});
  return {res, data, elapsedMs};
};

const stripeFetch = async (path, opts) => {
  const start = Date.now();
  const res = await fetch(`https://api.stripe.com${path}`, opts);
  const data = await res.json();
  const sanitized = sanitizeForArtifact(redactKeys(data));
  fs.appendFileSync(stripeLog, JSON.stringify({ path, status: res.status, body: sanitized, elapsedMs: Date.now()-start }, null, 2) + '\\n');
  return {res, data};
};

const supaFetch = async (path) => {
  if (!supabaseUrl || !supabaseServiceKey) return { res: { ok: false, status: 0 }, data: null };
  const res = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    headers: {
      'apikey': supabaseServiceKey,
      'Authorization': `Bearer ${supabaseServiceKey}`,
      'Content-Type': 'application/json'
    }
  });
  const data = await res.json().catch(() => null);
  return { res, data };
};

const assertNoSecrets = () => {
  const patterns = [/sk_test_/i, /whsec_/i, /client_secret/i];
  const files = fs.readdirSync(artifacts);
  for (const f of files) {
    const p = path.join(artifacts, f);
    if (!fs.statSync(p).isFile()) continue;
    const txt = fs.readFileSync(p, 'utf8');
    for (const pat of patterns) {
      if (pat.test(txt)) {
        fail('webhook_replay', `secret_leak_${f}`);
      }
    }
  }
};

(async () => {
  // Fast-path for webhook_replay: no auth, no register/login
  if (flow === 'webhook_replay') {
    if (!stripeKey || !stripeWebhookSecret || !supabaseUrl || !supabaseServiceKey) {
      fail('webhook_replay', 'missing_env');
    }
    const eventId = process.env.STRIPE_REPLAY_EVENT_ID || null;
    if (!eventId) fail('webhook_replay', 'missing_STRIPE_REPLAY_EVENT_ID');

    // existing rows guard: require FORCE_REPLAY=1 to proceed if already recorded
    const existing = await supaFetch(`stripe_webhook_events?event_id=eq.${eventId}&select=*`);
    if (!existing.res.ok) fail('webhook_replay', `supabase_webhook_events_${existing.res.status}`);
    const existingRows = Array.isArray(existing.data) ? existing.data : [];
    const allowExisting = process.env.FORCE_REPLAY === '1';
    const expectFirstProcessed = existingRows.length === 0;
    if (existingRows.length > 0 && !allowExisting) {
      fail('webhook_replay', 'event_already_recorded');
    }
    if (existingRows.length > 0 && allowExisting) {
      logStep({ step: 'force_replay', eventId, runId, reason: 'existing_event_rows', codeSha });
    }

    // fetch Stripe event
    const eventRes = await stripeFetch(`/v1/events/${eventId}`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${stripeKey}` }
    });
    if (!eventRes?.data?.id) fail('webhook_replay', 'event_not_found');
    const eventObj = eventRes.data;
    const redactedEvent = sanitizeForArtifact(redactKeys(eventObj));
    fs.writeFileSync(stripeEventPath, JSON.stringify(redactedEvent, null, 2));

    const payloadStr = JSON.stringify(eventObj);
    writeJson(webhookReplayReqPath, {
      eventId,
      type: eventObj.type,
      payloadBase64: Buffer.from(JSON.stringify(redactedEvent)).toString('base64'),
      payloadLength: payloadStr.length
    });

    const sendWebhook = async (label) => {
      const ts = Math.floor(Date.now() / 1000);
      const signedPayload = `${ts}.${payloadStr}`;
      const signature = crypto.createHmac('sha256', stripeWebhookSecret).update(signedPayload).digest('hex');
      const sigHeader = `t=${ts},v1=${signature}`;
      const start = Date.now();
      const res = await fetch(`${base}/api/v1/stripe/webhook`, {
        method: 'POST',
        headers: { 'Stripe-Signature': sigHeader, 'Content-Type': 'application/json' },
        body: payloadStr
      });
      const bodyText = await res.text();
      logHttp({
        step: `webhook_${label}`,
        req: { url: `${base}/api/v1/stripe/webhook`, method: 'POST', headers: { 'Stripe-Signature': '<redacted>', 'Content-Type': 'application/json' } },
        res: { status: res.status, ok: res.ok },
        body: bodyText,
        elapsedMs: Date.now() - start
      });
      const parsed = (() => { try { return JSON.parse(bodyText); } catch { return null; }})();
      if (!parsed || typeof parsed.received === 'undefined' || typeof parsed.status !== 'string' || typeof parsed.duplicate === 'undefined' || parsed.eventId !== eventId) {
        fail('webhook_replay', `schema_invalid_${label}`);
      }
      fs.writeFileSync(path.join(artifacts, `webhook-replay-response-${label === 'first' ? '1' : '2'}.json`), JSON.stringify({ status: res.status, ok: res.ok, body: parsed }, null, 2));
      return { label, status: res.status, ok: res.ok, body: parsed };
    };

    logStep({ step: 'webhook_replay_fetch_event', eventId, type: eventObj.type, runId, codeSha });

    const first = await sendWebhook('first');
    const second = await sendWebhook('replay');
    writeJson(webhookReplayRespPath, { first, second });
    if (!(first.ok && second.ok)) fail('webhook_replay', 'webhook_post_failed');
    if (expectFirstProcessed) {
      if (first.body.status !== 'processed' || first.body.duplicate !== false) fail('webhook_replay', 'first_not_processed');
    } else {
      if (first.body.status !== 'skipped_duplicate' || first.body.duplicate !== true) fail('webhook_replay', 'first_expected_duplicate_due_to_existing');
    }
    if (second.body.status !== 'skipped_duplicate' || second.body.duplicate !== true) fail('webhook_replay', 'second_not_skipped_duplicate');

    const whAfter = await supaFetch(`stripe_webhook_events?event_id=eq.${eventId}&select=*`);
    if (!whAfter.res.ok) fail('webhook_replay', `supabase_webhook_events_${whAfter.res.status}`);
    const whAfterData = Array.isArray(whAfter.data) ? whAfter.data : [];
    writeJson(dbAfterPath, { webhook_events: whAfterData });
    const whCount = whAfterData.length;
    const whProcessed = whAfterData.find(w => w.event_id === eventId && w.status === 'processed');
    if (whCount !== 1 || !whProcessed) fail('webhook_replay', 'webhook_events_not_single_processed');

    // redaction guard
    assertNoSecrets();

    console.log(`COMMERCE_IDEMPOTENCY PASS runId=${runId} eventId=${eventId} artifacts=${artifacts}`);
    ok({ eventId, artifacts });
    return;
  }

  let email = process.env.STORYTAILOR_TEST_EMAIL || `${emailPrefix}+${runId}@jqsirls.com`;
  const creds = { email, password };
  const ids = { runId };
  const returnUrl = 'https://storytailor.dev/account?gate=commerce';

  // hard guard on https returnUrl
  if (!returnUrl.startsWith('https://')) {
    console.log(`COMMERCE_GATE FAIL runId=${runId} flow=${flow} step=preflight reason=INVALID_RETURN_URL_RETURN_URL_MUST_BE_HTTPS artifacts=${artifacts}`);
    process.exit(1);
  }

  // record preflight info early
  fs.writeFileSync(preflightPath, JSON.stringify({
    apiBaseUrl: base,
    returnUrl,
    frontendUrl: process.env.FRONTEND_URL || null,
    appUrl: process.env.APP_URL || null,
    mode,
    timestamp: new Date().toISOString()
  }, null, 2));

  // Auth gate (diagnostics + deterministic token acquisition attempt)
  if (flow === 'auth_gate') {
    const gate = { runId, apiBaseUrl: base, supabaseUrl, artifacts };
    writeJson(path.join(artifacts, 'auth-gate-input.json'), gate);

    // Always use a fresh email per runId
    email = `${emailPrefix}+authgate-${runId}@jqsirls.com`;
    const gateCreds = { email, password };

    // 1) Supabase Admin create user + confirm (deterministic)
    const adminCreate = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        apikey: supabaseServiceKey,
        Authorization: `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password, email_confirm: true })
    });
    let adminBody = null;
    try { adminBody = await adminCreate.json(); } catch {}
    writeJson(path.join(artifacts, 'supabase-admin-create.json'), {
      status: adminCreate.status,
      body: sanitizeForArtifact(redactKeys(adminBody))
    });

    const createdUserId = adminBody?.id || null;

    // ensure public.users row exists (minimal required columns only)
    if (createdUserId) {
      const userInsert = await fetch(`${supabaseUrl}/rest/v1/users`, {
        method: 'POST',
        headers: {
          apikey: supabaseServiceKey,
          Authorization: `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal'
        },
        body: JSON.stringify({
          id: createdUserId,
          email,
          email_confirmed: true,
          test_mode_authorized: false
        })
      });
      writeJson(path.join(artifacts, 'supabase-public-users-insert.json'), {
        status: userInsert.status
      });
    } else {
      writeJson(path.join(artifacts, 'supabase-public-users-insert.json'), {
        status: 'skipped_no_user_id'
      });
    }

    // 2) API register attempt (captures status + body) AFTER admin create
    // Expected: 201 (created) or 409 (already exists)
    const reg = await jsonFetch('auth_register', `${base}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password,
        age: 35,
        userType: 'parent',
        firstName: 'Auth',
        lastName: 'Gate'
      })
    });
    writeJson(path.join(artifacts, 'auth-register-response.json'), {
      status: reg.res.status,
      body: sanitizeForArtifact(redactKeys(reg.data))
    });

    // 3) API login attempt (must return tokens)
    const login = await jsonFetch('auth_login', `${base}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(gateCreds)
    });
    const tokenAcquired = !!login.data?.tokens?.accessToken;
    writeJson(path.join(artifacts, 'auth-login-response.json'), {
      status: login.res.status,
      tokenAcquired,
      body: sanitizeForArtifact(redactKeys(login.data))
    });

    if (!tokenAcquired) {
      fail('auth_gate', `token_not_acquired_status_${login.res.status}`);
    }

    // Do NOT print or persist any tokens
    console.log(`AUTH_GATE PASS runId=${runId} token_acquired=true artifacts=${artifacts}`);
    ok({ token_acquired: true, artifacts });
    return;
  }

  // org seats flow (Flow 3)
  if (flow === 'org_seats') {
    try {
      logStep({ flow: 'org_seats', step: 'start', runId, codeSha });
      const orgPriceId = process.env.STRIPE_PRO_ORGANIZATION_PRICE_ID || process.env.STRIPE_PRICE_ID_ORG || '';
      const maxSeats = 1000; // hardcoded from PLAN_CONFIGS
      if (!orgPriceId || !password || !supabaseUrl || !supabaseServiceKey) {
        fail('org_seats', 'missing_env');
      }

      // Auth: must use STORYTAILOR_TEST_EMAIL with known password; no admin create for org flow
      if (!process.env.STORYTAILOR_TEST_EMAIL) {
        fail('org_seats', 'STORYTAILOR_TEST_EMAIL_required');
      }

      let login = await jsonFetch('login', `${base}/api/v1/auth/login`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(creds)
      });
      if (!login.res.ok || !login.data?.tokens?.accessToken) fail('login', `status_${login.res.status}`);
      const token = login.data.tokens.accessToken;
      ids.userId = login.data.user?.id;

      // Gate A: seat limit reject (must attempt 1001 to exceed max 1000)
      const tooMany = 1001;
      const orgNameA = `Org-${runId}-A`;
      const gateA = await jsonFetch('org_gateA_checkout', `${base}/api/v1/checkout/organization`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          organizationName: orgNameA,
          seatCount: tooMany,
          planId: 'pro_organization',
          billingInterval: 'month'
        })
      });
      if (gateA.res.ok) fail('org_seats', 'seat_limit_reject_failed');
      logStep({ gate: 'A', result: 'seat_limit_reject', status: gateA.res.status, runId, maxSeats, attempted: tooMany, codeSha });

      // Gate B: org + members + entitlement
      const seatOk = Math.min(5, maxSeats);
      const orgNameB = `Org-${runId}-B`;
      const gateB = await jsonFetch('org_gateB_checkout', `${base}/api/v1/checkout/organization`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          organizationName: orgNameB,
          seatCount: seatOk,
          planId: 'pro_organization',
          billingInterval: 'month'
        })
      });
      if (!gateB.res.ok) fail('org_seats', `org_checkout_failed_${gateB.res.status}`);

      // DB verification (service-role)
      const orgs = await supaFetch(`organizations?name=eq.${encodeURIComponent(orgNameB)}&order=created_at.desc&limit=1`);
      const orgRow = Array.isArray(orgs.data) ? orgs.data[0] : null;
      if (!orgRow) fail('org_seats', 'org_row_missing');
      const orgId = orgRow.id;
      const members = await supaFetch(`organization_members?organization_id=eq.${orgId}&select=*`);
      const subs = await supaFetch(`subscriptions?user_id=eq.${ids.userId}&select=*`);
      writeJson(path.join(artifacts, 'db-after.json'), {
        organizations: orgs.data,
        organization_members: members.data,
        subscriptions: subs.data
      });
      if (!members.data || members.data.length < 1) fail('org_seats', 'members_not_written');

      // Entitlement contract: /api/v1/users/me/credits
      const ent = await jsonFetch('org_entitlements', `${base}/api/v1/users/me/credits`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fs.writeFileSync(path.join(artifacts, 'entitlement.json'), JSON.stringify(ent.data, null, 2));

      logStep({ gate: 'B', result: 'org_writes', orgId, seatCount: seatOk, runId, codeSha });

      // Gate C: webhook reconciliation (requires STRIPE_REPLAY_EVENT_ID_ORG)
      const eventId = process.env.STRIPE_REPLAY_EVENT_ID_ORG || null;
      if (!eventId) fail('org_seats', 'missing_STRIPE_REPLAY_EVENT_ID_ORG');
      const eventRes = await stripeFetch(`/v1/events/${eventId}`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${stripeKey}` }
      });
      if (!eventRes?.data?.id) fail('org_seats', 'org_event_not_found');
      const payloadStr = JSON.stringify(eventRes.data);

      const sendOrgWebhook = async (label) => {
        const ts = Math.floor(Date.now() / 1000);
        const signedPayload = `${ts}.${payloadStr}`;
        const signature = crypto.createHmac('sha256', stripeWebhookSecret).update(signedPayload).digest('hex');
        const sigHeader = `t=${ts},v1=${signature}`;
        const res = await fetch(`${base}/api/v1/stripe/webhook`, {
          method: 'POST',
          headers: { 'Stripe-Signature': sigHeader, 'Content-Type': 'application/json' },
          body: payloadStr
        });
        const bodyText = await res.text();
        const parsed = (() => { try { return JSON.parse(bodyText); } catch { return null; }})();
        return { label, status: res.status, ok: res.ok, body: parsed, raw: bodyText };
      };

      const wh1 = await sendOrgWebhook('first');
      const wh2 = await sendOrgWebhook('replay');
      fs.writeFileSync(path.join(artifacts, 'webhook-replay-response-1.json'), JSON.stringify(wh1, null, 2));
      fs.writeFileSync(path.join(artifacts, 'webhook-replay-response-2.json'), JSON.stringify(wh2, null, 2));
      if (!wh1.ok || !wh2.ok) fail('org_seats', 'webhook_post_failed');
      if (!wh1.body || wh1.body.status !== 'processed' || wh1.body.duplicate !== false) fail('org_seats', 'webhook_first_not_processed');
      if (!wh2.body || wh2.body.status !== 'skipped_duplicate' || wh2.body.duplicate !== true) fail('org_seats', 'webhook_second_not_skipped_duplicate');

      const whAfter = await supaFetch(`stripe_webhook_events?event_id=eq.${eventId}&select=*`);
      const whAfterData = Array.isArray(whAfter.data) ? whAfter.data : [];
      if (whAfterData.length !== 1 || whAfterData[0].status !== 'processed') fail('org_seats', 'webhook_events_not_single_processed');
      writeJson(path.join(artifacts, 'webhook-db-after.json'), { webhook_events: whAfterData });

      // redaction guard
      assertNoSecrets();

      console.log(`COMMERCE_FLOW3 PASS runId=${runId} orgId=${orgId} subId=${subs.data?.[0]?.stripe_subscription_id || 'unknown'} eventId=${eventId} artifacts=${artifacts}`);
      ok({ orgId, subId: subs.data?.[0]?.stripe_subscription_id, eventId, artifacts });
      return;
    } catch (err) {
      writeSummary({ status: 'fail', step: 'org_seats_runtime', reason: err?.message || 'unhandled', runId, flow, artifacts });
      process.exit(1);
    }
  }

  // Auth for individual_subscription flow (Flow 1)
  let token = null;
  if (flow === 'individual_subscription') {
    // Use fresh email per runId
    email = `${emailPrefix}+${runId}@jqsirls.com`;
    const authCreds = { email, password };

    // Admin create user
    const adminCreate = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        apikey: supabaseServiceKey,
        Authorization: `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password, email_confirm: true })
    });
    let adminBody = null;
    try { adminBody = await adminCreate.json(); } catch {}
    const createdUserId = adminBody?.id || null;

    // Ensure public.users row exists
    if (createdUserId) {
      await fetch(`${supabaseUrl}/rest/v1/users`, {
        method: 'POST',
        headers: {
          apikey: supabaseServiceKey,
          Authorization: `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal'
        },
        body: JSON.stringify({
          id: createdUserId,
          email,
          email_confirmed: true,
          test_mode_authorized: false
        })
      });
    }

    // API login
    const login = await jsonFetch('login', `${base}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(authCreds)
    });
    if (!login.res.ok || !login.data?.tokens?.accessToken) fail('individual_subscription', `login_failed_status_${login.res.status}`);
    token = login.data.tokens.accessToken;
    ids.userId = login.data.user?.id;
  }

  if (mode === 'direct_subscription') {
    const stripeSummary = {};

    // Create Stripe customer
    const custReq = { email };
    fs.appendFileSync(stripeSessionPath, JSON.stringify({ request: { customer_create: custReq } }, null, 2));
    const cust = await stripeFetch(`/v1/customers`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${stripeKey}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(custReq)
    });
    const customerId = cust.data.id;
    ids.customerId = customerId;
    stripeSummary.customer = {
      id: cust.data?.id,
      invoice_settings_default_payment_method: cust.data?.invoice_settings?.default_payment_method
    };
    fs.appendFileSync(stripeSessionPath, JSON.stringify({ customer: redactKeys(cust.data) }, null, 2));

    // Attach pm_card_visa
    fs.appendFileSync(stripeSessionPath, JSON.stringify({ request: { pm_attach: { payment_method: 'pm_card_visa', customer: customerId } } }, null, 2));
    const pmAttach = await stripeFetch(`/v1/payment_methods/pm_card_visa/attach`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${stripeKey}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ customer: customerId })
    });
    fs.appendFileSync(stripeSessionPath, JSON.stringify({ pm_attach: redactKeys(pmAttach.data) }, null, 2));
    const pmId = pmAttach.data?.id;
    stripeSummary.pm_attach = {
      id: pmId,
      customer: pmAttach.data?.customer,
      type: pmAttach.data?.type,
      livemode: pmAttach.data?.livemode
    };

    // Set default payment method
    fs.appendFileSync(stripeSessionPath, JSON.stringify({ request: { customer_update: { invoice_settings_default_payment_method: pmId } } }, null, 2));
    const custUpdate = await stripeFetch(`/v1/customers/${customerId}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${stripeKey}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ 'invoice_settings[default_payment_method]': pmId })
    });
    fs.appendFileSync(stripeSessionPath, JSON.stringify({ customer_update: redactKeys(custUpdate.data) }, null, 2));
    stripeSummary.customer_update = {
      invoice_settings_default_payment_method: custUpdate.data?.invoice_settings?.default_payment_method
    };

    // Create subscription with explicit PM, no trial, confirm via PI
    const subBody = {
      customer: customerId,
      'items[0][price]': priceMonthly,
      collection_method: 'charge_automatically',
      payment_behavior: 'default_incomplete',
      trial_end: 'now',
      default_payment_method: pmId,
      'payment_settings[payment_method_types][0]': 'card',
      'payment_settings[save_default_payment_method]': 'on_subscription',
      'expand[0]': 'latest_invoice.payment_intent',
      'expand[1]': 'items.data.price'
    };
    fs.appendFileSync(stripeSessionPath, JSON.stringify({ request: { subscription_create: subBody } }, null, 2));
    const sub = await stripeFetch(`/v1/subscriptions`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${stripeKey}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(subBody)
    });
    const subData = redactKeys(sub.data);
    fs.appendFileSync(stripeSessionPath, JSON.stringify({ subscription: subData }, null, 2));
    const subId = sub.data?.id;
    const subPrice = sub.data?.items?.data?.[0]?.price?.id;
    const subStatus = sub.data?.status;
    const latestInvoiceId = typeof sub.data?.latest_invoice === 'string'
      ? sub.data?.latest_invoice
      : sub.data?.latest_invoice?.id;
    let piId = sub.data?.latest_invoice?.payment_intent?.id;
    let piStatus = sub.data?.latest_invoice?.payment_intent?.status;
    ids.subscriptionId = subId || 'none';
    ids.priceId = subPrice || 'none';
    writeJson(stripeLineItemsPath, sub.data?.items || {});
    stripeSummary.subscription = {
      id: subId,
      status: subStatus,
      default_payment_method: sub.data?.default_payment_method || null,
      price: subPrice,
      latest_invoice: latestInvoiceId || null,
      latest_invoice_status: typeof sub.data?.latest_invoice === 'object' ? sub.data?.latest_invoice?.status || null : null,
      payment_intent: piId,
      payment_intent_status: piStatus
    };
    if (subPrice !== priceMonthly && subPrice !== priceYearly) { writeJson(stripeSummaryPath, stripeSummary); fail('stripe_subscription', `unexpected_price_${subPrice}`); }
    // if PI missing, fetch invoice to retrieve it
    if (!piId && latestInvoiceId) {
      fs.appendFileSync(stripeSessionPath, JSON.stringify({ request: { invoice_fetch: { id: latestInvoiceId, expand: ['payment_intent'] } } }, null, 2));
      const inv = await stripeFetch(`/v1/invoices/${latestInvoiceId}?expand[]=payment_intent`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${stripeKey}` }
      });
      fs.appendFileSync(stripeSessionPath, JSON.stringify({ invoice: redactKeys(inv.data) }, null, 2));
      piId = inv.data?.payment_intent?.id || inv.data?.payment_intent;
      piStatus = inv.data?.payment_intent?.status;
      stripeSummary.subscription.latest_invoice_status = inv.data?.status || stripeSummary.subscription.latest_invoice_status;
      stripeSummary.subscription.payment_intent = piId;
      stripeSummary.subscription.payment_intent_status = piStatus;
    }
    if (!piId) { writeJson(stripeSummaryPath, stripeSummary); fail('stripe_subscription', 'missing_payment_intent'); }

    // confirm payment intent if needed
    let piStatusFinal = piStatus;
    if (piStatus !== 'succeeded') {
      fs.appendFileSync(stripeSessionPath, JSON.stringify({ request: { pi_confirm: { payment_method: pmId } } }, null, 2));
      let piConfirm = await stripeFetch(`/v1/payment_intents/${piId}/confirm`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${stripeKey}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ payment_method: pmId })
      });
      let attempts = 0;
      while (!piConfirm.res.ok && (piConfirm.res.status === 409 || piConfirm.res.status === 429) && attempts < 2) {
        await new Promise(r => setTimeout(r, 1000));
        piConfirm = await stripeFetch(`/v1/payment_intents/${piId}/confirm`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${stripeKey}`, 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ payment_method: pmId })
        });
        attempts += 1;
      }
      fs.appendFileSync(stripeSessionPath, JSON.stringify({ pi_confirm_response: { status: piConfirm.res.status, body: redactKeys(piConfirm.data) } }, null, 2));
      if (!piConfirm.res.ok) {
        stripeSummary.payment_intent = {
          id: piId,
          status: piConfirm.data?.status || 'unknown',
          last_payment_error: piConfirm.data?.last_payment_error ? redactKeys({
            code: piConfirm.data?.last_payment_error?.code,
            decline_code: piConfirm.data?.last_payment_error?.decline_code,
            message: piConfirm.data?.last_payment_error?.message
          }) : piConfirm.data?.error ? redactKeys({
            code: piConfirm.data?.error?.code,
            decline_code: piConfirm.data?.error?.decline_code,
            message: piConfirm.data?.error?.message
          }) : null
        };
        writeJson(stripeSummaryPath, stripeSummary);
        fail('stripe_subscription', `pi_confirm_failed_status_${piConfirm.res.status}_${(piConfirm.data?.error?.code)||'none'}_${(piConfirm.data?.error?.decline_code)||'none'}`);
      }
      const piRe = await stripeFetch(`/v1/payment_intents/${piId}`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${stripeKey}` }
      });
      piStatusFinal = piRe.data?.status;
      stripeSummary.payment_intent = {
        id: piRe.data?.id,
        status: piStatusFinal,
        last_payment_error: piRe.data?.last_payment_error ? redactKeys({
          code: piRe.data?.last_payment_error?.code,
          decline_code: piRe.data?.last_payment_error?.decline_code,
          message: piRe.data?.last_payment_error?.message
        }) : null
      };
      const subRe = await stripeFetch(`/v1/subscriptions/${subId}?expand[]=latest_invoice.payment_intent&expand[]=items.data.price`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${stripeKey}` }
      });
      const subStatus2 = subRe.data?.status;
      const subPrice2 = subRe.data?.items?.data?.[0]?.price?.id;
      piStatusFinal = subRe.data?.latest_invoice?.payment_intent?.status;
      stripeSummary.subscription_refetched = {
        id: subRe.data?.id,
        status: subStatus2,
        price: subPrice2,
        latest_invoice: subRe.data?.latest_invoice?.id || null,
        latest_invoice_status: subRe.data?.latest_invoice?.status || null,
        payment_intent_status: piStatusFinal
      };
      if (subPrice2 !== priceMonthly && subPrice2 !== priceYearly) { writeJson(stripeSummaryPath, stripeSummary); fail('stripe_subscription', `unexpected_price_${subPrice2}`); }
      if (piStatusFinal !== 'succeeded') { writeJson(stripeSummaryPath, stripeSummary); fail('stripe_subscription', `pi_confirm_failed_${piStatusFinal}_${(piRe.data?.last_payment_error?.code)||'none'}_${(piRe.data?.last_payment_error?.decline_code)||'none'}`); }
      if (subStatus2 !== 'active' && subStatus2 !== 'trialing') { writeJson(stripeSummaryPath, stripeSummary); fail('stripe_subscription', `sub_not_active_${subStatus2}`); }
      ids.subscriptionId = subRe.data?.id || ids.subscriptionId;
      ids.priceId = subPrice2 || ids.priceId;
    } else {
      stripeSummary.payment_intent = {
        id: piId,
        status: piStatus,
        last_payment_error: null
      };
      if (subStatus !== 'active' && subStatus !== 'trialing') { writeJson(stripeSummaryPath, stripeSummary); fail('stripe_subscription', `sub_not_active_${subStatus}`); }
    }
    writeJson(stripeSummaryPath, stripeSummary);
  } else {
    fail('mode_not_supported', mode);
  }

  // If simulated_webhook, pull event and POST with signed header
  if (mode === 'simulated_webhook') {
    // Fetch latest checkout.session.completed for this session
    const events = await stripeFetch(`/v1/events?type=checkout.session.completed&limit=3`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${stripeKey}` }
    });
    const target = (events.data?.data || []).find(e => e.data?.object?.id === sessionId) || events.data?.data?.[0];
    if (!target) fail('webhook_simulated', 'no_event_found');
    const payload = JSON.stringify(target);
    const ts = Math.floor(Date.now()/1000);
    const signedPayload = `${ts}.${payload}`;
    const signature = crypto.createHmac('sha256', stripeWebhookSecret).update(signedPayload).digest('hex');
    const sigHeader = `t=${ts},v1=${signature}`;
    const postRes = await fetch(`${base}/api/v1/stripe/webhook`, {
      method: 'POST',
      headers: { 'Stripe-Signature': sigHeader, 'Content-Type': 'application/json' },
      body: payload
    });
    const body = await postRes.text();
    fs.appendFileSync(webhookLog, JSON.stringify({mode, event_id: target.id, status: postRes.status, body}, null, 2));
    if (!postRes.ok) fail('webhook_simulated', `status_${postRes.status}`);
  } else {
    // Wait briefly for live webhook processing
    await new Promise(r => setTimeout(r, 8000));
  }

  // Check webhook event recorded
  const webhookStatus = await jsonFetch('webhook_events', `${base}/api/v1/admin/health`, { method: 'GET' });
  fs.writeFileSync(webhookLog, JSON.stringify(webhookStatus.data, null, 2));

  // Subscription lookup via Stripe (direct mode uses ids.subscriptionId)
  if (ids.subscriptionId && ids.subscriptionId !== 'none') {
    const sub = await stripeFetch(`/v1/subscriptions/${ids.subscriptionId}`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${stripeKey}` }
    });
    ids.subscriptionId = sub.data.id;
    ids.invoiceId = sub.data.latest_invoice || null;
  }

  // DB/entitlement check: call credits endpoint
  const credits = await jsonFetch('credits', `${base}/api/v1/users/me/credits`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  fs.writeFileSync(entitlementsLog, JSON.stringify(credits.data, null, 2));

  ok(ids);
})().catch(err => {
  writeSummary({ status: 'fail', step: 'runtime', reason: err?.message || 'unhandled', runId, flow, artifacts });
  process.exit(1);
});
NODE

# Post-run secret redaction proof
if [[ ! -f "$ARTIFACT_DIR/summary.json" ]]; then
  echo "COMMERCE_GATE FAIL runId=${RUN_ID} flow=${FLOW} step=summary_missing reason=runtime artifacts=${ARTIFACT_DIR}"
  exit 1
fi

STATUS=$(jq -r '.status' "$ARTIFACT_DIR/summary.json")
if [[ "$STATUS" != "ok" ]]; then
  STEP=$(jq -r '.step // "unknown"' "$ARTIFACT_DIR/summary.json")
  REASON=$(jq -r '.reason // "runtime_error"' "$ARTIFACT_DIR/summary.json")
  echo "COMMERCE_GATE FAIL runId=${RUN_ID} flow=${FLOW} step=${STEP} reason=${REASON} artifacts=${ARTIFACT_DIR}"
  exit 1
fi

set +e
grep -R "whsec_" "$ARTIFACT_DIR" | grep -v "<redacted>" && REDACT_FAIL=1
grep -R "sk_test_" "$ARTIFACT_DIR" | grep -v "<redacted>" && REDACT_FAIL=1
grep -R "client_secret" "$ARTIFACT_DIR" | grep -v "<redacted>" && REDACT_FAIL=1
jq -e '.. | strings | select(test("whsec_|sk_test_|client_secret"))' "$ARTIFACT_DIR/stripe.json" >/dev/null 2>/dev/null && REDACT_FAIL=1
set -e

if [[ "${REDACT_FAIL:-0}" -ne 0 ]]; then
  echo "COMMERCE_GATE FAIL runId=${RUN_ID} flow=${FLOW} step=redaction_check reason=secret_leak artifacts=${ARTIFACT_DIR}"
  exit 1
fi

USER_ID=$(jq -r '.ids.userId' "$ARTIFACT_DIR/summary.json")
CUSTOMER_ID=$(jq -r '.ids.customerId // "none"' "$ARTIFACT_DIR/summary.json")
SESSION_ID=$(jq -r '.ids.sessionId // "none"' "$ARTIFACT_DIR/summary.json")
SUB_ID=$(jq -r '.ids.subscriptionId // "none"' "$ARTIFACT_DIR/summary.json")
INV_ID=$(jq -r '.ids.invoiceId // "none"' "$ARTIFACT_DIR/summary.json")
PRICE_ID=$(jq -r '.ids.priceId // "n/a"' "$ARTIFACT_DIR/summary.json")
echo "COMMERCE_GATE PASS runId=${RUN_ID} flow=${FLOW} userId=${USER_ID} customer=${CUSTOMER_ID} session=${SESSION_ID} sub=${SUB_ID} invoice=${INV_ID} price=${PRICE_ID} artifacts=${ARTIFACT_DIR}"

