#!/bin/bash

# Full test suite runner
# Runs all tests and verifies everything is working

set -e

echo "🧪 Running Full Test Suite"
echo "=========================="
echo ""

# Check if migration was applied
echo "1️⃣  Verifying organization_id migration..."
node scripts/verify-organization-id-migration.js
if [ $? -ne 0 ]; then
  echo ""
  echo "❌ Migration not applied. Please apply it first:"
  echo "   See: APPLY_MIGRATION_MANUAL.md"
  exit 1
fi

echo ""
echo "✅ Migration verified"
echo ""

# Run pipeline integration tests
echo "2️⃣  Running pipeline integration tests..."
API_BASE_URL=${API_BASE_URL:-https://api.storytailor.dev} \
TEST_EMAIL=${TEST_EMAIL:-j+1226@jqsirls.com} \
TEST_PASSWORD=${TEST_PASSWORD:-Fntra2015!} \
TEST_PHONE=${TEST_PHONE:-18189662227} \
SUPABASE_URL=${SUPABASE_URL:-https://lendybmmnlqelrhkhdyc.supabase.co} \
SUPABASE_SERVICE_KEY=${SUPABASE_SERVICE_KEY:-$(aws ssm get-parameter --name "/storytailor-production/supabase/service-key" --with-decryption --query 'Parameter.Value' --output text 2>/dev/null || echo "")} \
node scripts/test-pipeline-integration.js

TEST_EXIT_CODE=$?

echo ""
echo "=========================="
if [ $TEST_EXIT_CODE -eq 0 ]; then
  echo "✅ All tests passed!"
else
  echo "❌ Some tests failed (exit code: $TEST_EXIT_CODE)"
fi
echo "=========================="

exit $TEST_EXIT_CODE

