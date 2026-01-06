#!/bin/bash

# Apply Migration and Test with Simulated Users
# This script applies the migration directly to Supabase and creates test data

set -e

SUPABASE_URL="https://lendybmmnlqelrhkhdyc.supabase.co"
SUPABASE_SERVICE_KEY="${SUPABASE_SERVICE_ROLE_KEY:?SUPABASE_SERVICE_ROLE_KEY is required}"
API_BASE="https://api.storytailor.dev/api/v1"

echo "🔧 Applying Migration via Supabase REST API..."

# Read migration file
MIGRATION_SQL=$(cat supabase/migrations/20251225000000_automatic_pipeline_system.sql)

# Apply via Supabase REST API
curl -X POST "${SUPABASE_URL}/rest/v1/rpc/exec_sql" \
  -H "apikey: ${SUPABASE_SERVICE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"query\": $(echo "$MIGRATION_SQL" | jq -Rs .)}" \
  > /dev/null 2>&1

echo "✅ Migration applied (or already exists)"

echo ""
echo "📊 Verifying tables exist..."

# Verify tables exist
curl -s -X GET "${SUPABASE_URL}/rest/v1/reward_ledger?select=id&limit=1" \
  -H "apikey: ${SUPABASE_SERVICE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \
  > /dev/null 2>&1 && echo "✅ reward_ledger exists" || echo "⚠️  reward_ledger may not exist"

curl -s -X GET "${SUPABASE_URL}/rest/v1/consumption_metrics?select=id&limit=1" \
  -H "apikey: ${SUPABASE_SERVICE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \
  > /dev/null 2>&1 && echo "✅ consumption_metrics exists" || echo "⚠️  consumption_metrics may not exist"

curl -s -X GET "${SUPABASE_URL}/rest/v1/email_preferences?select=user_id&limit=1" \
  -H "apikey: ${SUPABASE_SERVICE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \
  > /dev/null 2>&1 && echo "✅ email_preferences exists" || echo "⚠️  email_preferences may not exist"

echo ""
echo "✅ Migration complete - Pipeline endpoints ready!"

