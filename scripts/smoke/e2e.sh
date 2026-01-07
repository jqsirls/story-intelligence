#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
LOG_ROOT="${LOG_ROOT:-/tmp/api-smoke}"
RUN_ID="$(date +%Y%m%dT%H%M%S)"
RUN_DIR="${LOG_ROOT}/run-${RUN_ID}"
mkdir -p "${RUN_DIR}"

PORT="${PORT:-8787}"
BASE_URL="http://127.0.0.1:${PORT}"
MODE="${MODE:-fresh}" # fresh or existing

redact() {
  sed -e 's/eyJ[A-Za-z0-9_-]\{10,\}/[REDACTED_JWT]/g' \
      -e 's/sb_secret_[A-Za-z0-9_-]\+/[REDACTED_SUPABASE_SERVICE_ROLE_KEY]/g' \
      -e 's/sb_publishable_[A-Za-z0-9_-]\+/[REDACTED_SUPABASE_ANON_KEY]/g' \
      -e 's/sk_live_[A-Za-z0-9_-]\+/[REDACTED_SK]/g' \
      -e 's/github_pat_[A-Za-z0-9_-]\+/[REDACTED_PAT]/g'
}

guard_leaks() {
  local file="$1"
  if grep -E "eyJ[A-Za-z0-9_-]{10,}|sb_secret_|sb_publishable_|sk_live|github_pat_" "${file}" >/dev/null; then
    echo "Leak detected in ${file}" >&2
    exit 1
  fi
}

log() { printf '[%s] %s\n' "$(date -Iseconds)" "$*"; }

req_log_cmd() {
  # Print a redacted version of curl command
  local method="$1"; shift
  local url="$1"; shift
  local redacted_headers=()
  for h in "$@"; do
    case "$h" in
      Authorization:*|authorization:*)
        redacted_headers+=("Authorization: [REDACTED_JWT]")
        ;;
      *)
        redacted_headers+=("$h")
        ;;
    esac
  done
  printf 'curl -X %s %s %s\n' "$method" "$(printf -- " -H '%s'" "${redacted_headers[@]}")" "$url"
}

# --- 1) Reset DB fresh path ---
if [[ "${MODE}" == "fresh" ]]; then
  log "resetting supabase (fresh)"
  scripts/supabase/reset.sh | redact | tee "${RUN_DIR}/reset.log"
  guard_leaks "${RUN_DIR}/reset.log"
else
  log "existing mode: skipping reset"
fi

# Extract Supabase vars
status_json="${RUN_DIR}/status.json"
npx --yes supabase status --output json > "${status_json}.raw"
cat "${status_json}.raw" | redact > "${status_json}"
guard_leaks "${status_json}"

DB_URL="$(jq -r '.DB_URL // .db_url // .services.db.url // .services.db.URI' "${status_json}")"
ANON_KEY="$(jq -r '.ANON_KEY // .anon_key // .services.anon.key // empty' "${status_json}")"
SERVICE_ROLE_KEY="$(jq -r '.SERVICE_ROLE_KEY // .service_role_key // .services.service_role.key // empty' "${status_json}")"
API_URL="$(jq -r '.API_URL // .api_url // .services.api.url // "http://127.0.0.1:54321"' "${status_json}")"

export SUPABASE_URL="${API_URL}"
export SUPABASE_SERVICE_ROLE_KEY="${SERVICE_ROLE_KEY}"

if [[ -z "${STRIPE_SECRET_KEY:-}" || -z "${STRIPE_WEBHOOK_SECRET:-}" ]]; then
  log "Stripe secrets not set; skipping smoke (soft skip)"
  exit 0
fi
log "Stripe secrets present (values not logged)"

# --- 2) Start API server harness ---
SERVER_LOG="${RUN_DIR}/server.log"
log "starting server harness on ${PORT}"
(cd "${ROOT}" && CI_SMOKE_FAKE_COMMERCE="${CI_SMOKE_FAKE_COMMERCE:-true}" npx --yes ts-node --transpile-only scripts/smoke/server.ts) > "${SERVER_LOG}" 2>&1 &
SERVER_PID=$!

tries=0
until curl -s -o /dev/null -w '%{http_code}' "${BASE_URL}/health" | grep -qE '^(200|401)$'; do
  sleep 1
  tries=$((tries+1))
  if [[ ${tries} -ge 30 ]]; then
    log "server health check failed"
    kill "${SERVER_PID}" || true
    exit 1
  fi
done
log "server healthy"

# --- helper for curl with auth ---
call_api() {
  local method="$1"; shift
  local path="$1"; shift
  local data="${1:-}"; shift || true
  local auth_header=()
  if [[ -n "${ACCESS_TOKEN:-}" ]]; then
    auth_header+=("-H" "Authorization: Bearer ${ACCESS_TOKEN}")
  fi
  req_log_cmd "$method" "${BASE_URL}${path}" "${auth_header[@]}" -H "Content-Type: application/json"
  curl -s -w "%{http_code}" -D "${RUN_DIR}/headers.tmp" -o "${RUN_DIR}/resp.tmp" -X "$method" \
    "${auth_header[@]}" \
    -H "Content-Type: application/json" \
    -d "${data:-{}}" \
    "${BASE_URL}${path}" > "${RUN_DIR}/status.tmp"
  local status
  status=$(cat "${RUN_DIR}/status.tmp")
  local out_json="${RUN_DIR}/$(echo "${path}" | tr '/?' '__').json"
  mv "${RUN_DIR}/resp.tmp" "${out_json}"
  echo "status=${status}" > "${out_json}.status"
  guard_leaks "${out_json}"
}

# --- 3) Register + login ---
TEST_EMAIL="smoke+$(date +%s)@example.com"
TEST_PASSWORD="TestPass123!"
REGISTER_BODY=$(jq -n --arg email "$TEST_EMAIL" --arg pass "$TEST_PASSWORD" '{
  email: $email,
  password: $pass,
  age: 30,
  userType: "enthusiast",
  firstName: "Smoke",
  lastName: "Test"
}')

log "register user"
call_api POST "/api/v1/auth/register" "${REGISTER_BODY}"
USER_ID=$(jq -r '.user.id' "${RUN_DIR}/__api_v1_auth_register.json")
ACCESS_TOKEN=$(jq -r '.tokens.accessToken' "${RUN_DIR}/__api_v1_auth_register.json")

log "login user"
LOGIN_BODY=$(jq -n --arg email "$TEST_EMAIL" --arg pass "$TEST_PASSWORD" '{email:$email,password:$pass}')
call_api POST "/api/v1/auth/login" "${LOGIN_BODY}"

# --- 4) Story create + proof ---
STORY_TITLE="Smoke Story ${RUN_ID}"
STORY_BODY=$(jq -n --arg title "$STORY_TITLE" '{title:$title}')
log "create story"
call_api POST "/api/v1/stories" "${STORY_BODY}"

DB_CONTAINER=$(docker ps --format '{{.Names}}' | grep 'supabase_db_' | head -n1)
[[ -n "${DB_CONTAINER}" ]] || { echo "db container not found"; exit 1; }
STORY_Q="SELECT count(*) FROM public.stories WHERE user_id='${USER_ID}' AND title='${STORY_TITLE}';"
docker exec -i "${DB_CONTAINER}" psql -U postgres -d postgres -P pager=off -c "${STORY_Q}" | redact | tee "${RUN_DIR}/proof_story.txt"
guard_leaks "${RUN_DIR}/proof_story.txt"

# --- 5) Webhook idempotency ---
FIX_CREATED="scripts/smoke/fixtures/stripe/subscription_created.json"
FIX_UPDATED="scripts/smoke/fixtures/stripe/subscription_updated.json"

# inject user id into fixtures
tmp_created="${RUN_DIR}/created.json"
tmp_updated="${RUN_DIR}/updated.json"
jq --arg uid "$USER_ID" '.data.object.metadata.userId=$uid' "${FIX_CREATED}" > "${tmp_created}"
jq --arg uid "$USER_ID" '.data.object.metadata.userId=$uid' "${FIX_UPDATED}" > "${tmp_updated}"

SHA_CREATED=$(shasum -a 256 "${tmp_created}" | awk '{print $1}')
SHA_UPDATED=$(shasum -a 256 "${tmp_updated}" | awk '{print $1}')
echo "fixture_created_sha256=${SHA_CREATED}" > "${RUN_DIR}/fixtures.sha"
echo "fixture_updated_sha256=${SHA_UPDATED}" >> "${RUN_DIR}/fixtures.sha"

gen_sig() {
  local payload_file="$1"
  node scripts/smoke/stripe_sign.js "${payload_file}" "${STRIPE_WEBHOOK_SECRET}"
}

post_webhook() {
  local payload_file="$1"
  local hdr
  hdr=$(gen_sig "${payload_file}")
  curl -s -X POST \
    -H "Content-Type: application/json" \
    -H "Stripe-Signature: ${hdr}" \
    --data-binary @"${payload_file}" \
    "${BASE_URL}/api/v1/stripe/webhook" > "${RUN_DIR}/webhook_resp.tmp"
  guard_leaks "${RUN_DIR}/webhook_resp.tmp"
}

log "webhook: subscription.created once"
post_webhook "${tmp_created}"

log "webhook: subscription.updated twice (idempotency)"
post_webhook "${tmp_updated}"
post_webhook "${tmp_updated}"

SUB_Q="SELECT count(*) FROM public.subscriptions WHERE stripe_subscription_id='sub_smoke_fixed';"
docker exec -i "${DB_CONTAINER}" psql -U postgres -d postgres -P pager=off -c "${SUB_Q}" | redact | tee "${RUN_DIR}/proof_subscription.txt"
guard_leaks "${RUN_DIR}/proof_subscription.txt"

# --- 6a) Checkout (deterministic fake commerce) ---
log "checkout (fake commerce mode) via /api/v1/checkout"
CHECKOUT_BODY='{"planId":"pro_individual"}'
call_api POST "/api/v1/checkout" "${CHECKOUT_BODY}"
SUB_FAKE_Q="SELECT count(*) FROM public.subscriptions WHERE stripe_subscription_id='sub_smoke_fake_checkout';"
docker exec -i "${DB_CONTAINER}" psql -U postgres -d postgres -P pager=off -c "${SUB_FAKE_Q}" | redact | tee "${RUN_DIR}/proof_subscription_checkout.txt"
guard_leaks "${RUN_DIR}/proof_subscription_checkout.txt"

# --- 6) Existing DB path (reapply migrations, rerun story+update) ---
if [[ "${MODE}" == "fresh" ]]; then
  log "existing-db path: migration up + rerun smoke"
  npx --yes supabase migration up --local | redact | tee "${RUN_DIR}/migration_up.log"
  guard_leaks "${RUN_DIR}/migration_up.log"

  STORY_TITLE2="Smoke Story Existing ${RUN_ID}"
  STORY_BODY2=$(jq -n --arg title "$STORY_TITLE2" '{title:$title}')
  call_api POST "/api/v1/stories" "${STORY_BODY2}"

  STORY_Q2="SELECT count(*) FROM public.stories WHERE user_id='${USER_ID}' AND title='${STORY_TITLE2}';"
  docker exec -i "${DB_CONTAINER}" psql -U postgres -d postgres -P pager=off -c "${STORY_Q2}" | redact | tee "${RUN_DIR}/proof_story_existing.txt"
  guard_leaks "${RUN_DIR}/proof_story_existing.txt"

  log "webhook updated twice again (should remain 1 row)"
  post_webhook "${tmp_updated}"
  post_webhook "${tmp_updated}"
  docker exec -i "${DB_CONTAINER}" psql -U postgres -d postgres -P pager=off -c "${SUB_Q}" | redact | tee "${RUN_DIR}/proof_subscription_existing.txt"
  guard_leaks "${RUN_DIR}/proof_subscription_existing.txt"

  log "checkout again (existing db)"
  call_api POST "/api/v1/checkout" "${CHECKOUT_BODY}"
  docker exec -i "${DB_CONTAINER}" psql -U postgres -d postgres -P pager=off -c "${SUB_FAKE_Q}" | redact | tee "${RUN_DIR}/proof_subscription_checkout_existing.txt"
  guard_leaks "${RUN_DIR}/proof_subscription_checkout_existing.txt"
fi

# --- Teardown ---
kill "${SERVER_PID}" || true

# Redaction guard receipts
for p in "eyJ" "sb_secret_" "sb_publishable_" "sk_live" "github_pat_"; do
  if grep -R "${p}" "${RUN_DIR}" >/dev/null; then
    echo "pattern ${p} found (fail)"
    exit 1
  else
    echo "pattern ${p}: none" | tee -a "${RUN_DIR}/redaction_checks.txt"
  fi
done

log "smoke completed"

