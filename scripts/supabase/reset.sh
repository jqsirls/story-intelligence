#!/usr/bin/env bash
set -euo pipefail

# Deterministic Supabase reset (two-phase: DB-only reset, then full stack boot).
# Goals:
# - Avoid Kong/storage 502 during reset by excluding them while running db reset.
# - Return exit 0 reliably (0 = success, non-zero = hard fail).
# - Capture sanitized logs under /tmp/story-intelligence-reset/.
# - Redact only sb_publishable_*, sb_secret_*, eyJ… (JWT-like).
# - Health checks must not show 5xx.

if [[ -z "${SUPABASE_BIN:-}" ]]; then
  if command -v supabase >/dev/null 2>&1; then
    SUPABASE_BIN=(supabase)
  else
    SUPABASE_BIN=(npx --yes supabase)
  fi
else
  # shellcheck disable=SC2206
  SUPABASE_BIN=(${SUPABASE_BIN})
fi
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
LOG_ROOT="${LOG_ROOT:-/tmp/story-intelligence-reset}"
mkdir -p "${LOG_ROOT}"

log() {
  printf '[%s] %s\n' "$(date -Iseconds)" "$*"
}

sanitize() {
  sed \
    -e 's/sb_publishable_[A-Za-z0-9_-]\\+/[REDACTED_SUPABASE_ANON_KEY]/g' \
    -e 's/sb_secret_[A-Za-z0-9_-]\\+/[REDACTED_SUPABASE_SERVICE_ROLE_KEY]/g' \
    -e 's/eyJ[A-Za-z0-9_-]\\+[.][A-Za-z0-9_-]\\+[.][A-Za-z0-9_-]\\+/[REDACTED_JWT]/g'
}

log_file_run() {
  local run_dir="$1" name="$2"
  mkdir -p "${run_dir}"
  echo "${run_dir}/${name}.log"
}

storage_health() {
  local attempt code
  for attempt in $(seq 1 30); do
    code=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:54321/storage/v1/health || true)
    # Treat any non-5xx as healthy (403 is expected without JWT; 502/503 are the flaky cases)
    if [[ "$code" =~ ^[234][0-9]{2}$ ]]; then
      log "storage health: ${code} (attempt ${attempt})"
      return 0
    fi
    sleep 1
  done
  log "storage health check failed after 30 attempts"
  return 1
}

restart_kong_and_storage() {
  local names
  names=$(docker ps --format '{{.Names}}' | grep -E 'supabase_(kong|storage)_') || true
  if [[ -z "${names}" ]]; then
    log "no kong/storage containers to restart"
    return
  fi
  log "restarting kong/storage: ${names}"
  # Restart in dependency order: storage first, then kong
  echo "${names}" | grep 'storage' | xargs -r docker restart
  echo "${names}" | grep 'kong' | xargs -r docker restart
}

stop_stack() {
  log "stopping stack"
  "${SUPABASE_BIN[@]}" stop || true
}

start_stack() {
  log "starting stack (ignore health check)"
  "${SUPABASE_BIN[@]}" start --ignore-health-check
}

start_db_only() {
  local excludes="gotrue,realtime,storage-api,imgproxy,kong,mailpit,postgrest,postgres-meta,studio,edge-runtime,logflare,vector,supavisor"
  log "starting db-only stack (exclude: ${excludes})"
  "${SUPABASE_BIN[@]}" start --ignore-health-check --exclude "${excludes}"
}

reset_once() {
  local db_url="${1:-}"
  local log_file
  log_file="$(mktemp)"
  if [[ -n "${db_url}" ]]; then
    log "running db reset (--no-seed) with --db-url"
    if "${SUPABASE_BIN[@]}" db reset --yes --no-seed --db-url "${db_url}" 2>&1 | tee "${log_file}"; then
      rm -f "${log_file}"
      return 0
    fi
  else
    log "running db reset (--no-seed)"
    if "${SUPABASE_BIN[@]}" db reset --yes --no-seed 2>&1 | tee "${log_file}"; then
      rm -f "${log_file}"
      return 0
    fi
  fi

  if grep -q "Error status 502" "${log_file}"; then
    log "reset hit Kong/storage 502 (retryable)"
    rm -f "${log_file}"
    return 2
  fi

  log "reset failed (non-retryable); see log: ${log_file}"
  return 1
}

db_status_url() {
  local status_json tmp
  status_json="$(mktemp)"
  tmp="$(mktemp)"
  if ! "${SUPABASE_BIN[@]}" status --output json > "${tmp}" 2>/dev/null; then
    rm -f "${tmp}" "${status_json}"
    return 1
  fi
  python - <<'PY' < "${tmp}" > "${status_json}"
import sys
last = None
for line in sys.stdin:
    line = line.strip()
    if line.startswith("{") and line.endswith("}"):
        last = line
if last:
    sys.stdout.write(last)
PY
  # Log sanitized status for receipts
  cat "${status_json}" | sanitize > "$(log_file_run "${RUN_DIR}" "status.json")"
  local url
  url=$(jq -r '.DB_URL // .db_url // .services.db.url // .services.db.URI // empty' "${status_json}")
  rm -f "${tmp}" "${status_json}"
  if [[ -z "${url}" ]]; then
    return 1
  fi
  echo "${url}"
}

main() {
  cd "${PROJECT_ROOT}"

  RUN_DIR="${LOG_ROOT}/run-$(date +%Y%m%dT%H%M%S)"
  mkdir -p "${RUN_DIR}"
  log "logs: ${RUN_DIR}"

  # Phase 1: DB-only reset (no Kong/storage to avoid 502)
  stop_stack | sanitize | tee "$(log_file_run "${RUN_DIR}" "01_stop")" >/dev/null
  start_db_only | sanitize | tee "$(log_file_run "${RUN_DIR}" "02_start_db_only")" >/dev/null

  local db_url rc=0
  db_url="$(RUN_DIR=${RUN_DIR} db_status_url || true)"
  echo "${db_url}" | sanitize > "$(log_file_run "${RUN_DIR}" "03_db_url")"

  if reset_once "${db_url}"; then
    log "reset succeeded (db-only phase)"
    rc=0
  else
    rc=$?
  fi

  if [[ "${rc}" -eq 2 ]]; then
    log "reset hit 502 during db-only phase; this should not happen (no Kong/storage)."
  fi

  if [[ "${rc}" -ne 0 ]]; then
    log "reset failed in db-only phase (rc=${rc})"
    exit "${rc}"
  fi

  # Phase 1 verification: basic migration/table sanity
  local db_container
  db_container=$(docker ps --format '{{.Names}}' | grep 'supabase_db_' | head -n1)
  if [[ -z "${db_container}" ]]; then
    log "unable to find db container"
    exit 1
  fi
  docker exec -i "${db_container}" psql -U postgres -d postgres -P pager=off -c "select count(*) as migrations_applied from supabase_migrations.schema_migrations;" | sanitize > "$(log_file_run "${RUN_DIR}" "04_schema_migrations_count")"
  docker exec -i "${db_container}" psql -U postgres -d postgres -P pager=off -c "\\d+ public.subscriptions" | sanitize > "$(log_file_run "${RUN_DIR}" "05_dplus_subscriptions")"

  # Phase 2: full stack start + health checks
  stop_stack | sanitize | tee "$(log_file_run "${RUN_DIR}" "06_stop_before_full")" >/dev/null
  start_stack | sanitize | tee "$(log_file_run "${RUN_DIR}" "07_start_full")" >/dev/null

  # Health checks (fail on 5xx)
  (
    set -e
    rest_code=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:54321/rest/v1/ || true)
    auth_code=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:54321/auth/v1/health || true)
    storage_code=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:54321/storage/v1/bucket || true)
    printf "rest:%s\nauth:%s\nstorage:%s\n" "$rest_code" "$auth_code" "$storage_code"
    if [[ "$rest_code" =~ ^5 || "$auth_code" =~ ^5 || "$storage_code" =~ ^5 ]]; then
      log "health check failed (5xx detected)"
      exit 1
    fi
  ) | tee "$(log_file_run "${RUN_DIR}" "08_health_checks")"

  log "reset + full start succeeded"
  exit 0
}

main "$@"

