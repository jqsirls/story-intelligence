#!/bin/bash

# Create Test User for Phase 9 Testing
# This script creates a user directly via Supabase Admin API, bypassing email rate limits

set -e

SUPABASE_URL="${SUPABASE_URL:-${NEXT_PUBLIC_SUPABASE_URL}}"
SUPABASE_SERVICE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-${SUPABASE_SERVICE_KEY}}"

if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_KEY" ]; then
  echo "❌ Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set"
  echo ""
  echo "Usage:"
  echo "  SUPABASE_URL=your_url SUPABASE_SERVICE_ROLE_KEY=your_key ./scripts/create-test-user-phase9.sh"
  echo ""
  echo "Or set in .env file"
  exit 1
fi

TEST_EMAIL="phase9-test-$(date +%s)@storytailor.com"
TEST_PASSWORD="TestPass123!"
TEST_FIRST_NAME="Phase9"
TEST_LAST_NAME="Test"
TEST_AGE=14
TEST_USER_TYPE="parent"

echo "=== Creating Test User for Phase 9 ==="
echo ""
echo "Email: $TEST_EMAIL"
echo "Password: $TEST_PASSWORD"
echo ""

# Create user via Supabase Admin API
RESPONSE=$(curl -s -X POST "$SUPABASE_URL/auth/v1/admin/users" \
  -H "apikey: $SUPABASE_SERVICE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$TEST_EMAIL\",
    \"password\": \"$TEST_PASSWORD\",
    \"email_confirm\": true,
    \"user_metadata\": {
      \"first_name\": \"$TEST_FIRST_NAME\",
      \"last_name\": \"$TEST_LAST_NAME\",
      \"age\": $TEST_AGE,
      \"user_type\": \"$TEST_USER_TYPE\"
    }
  }")

USER_ID=$(echo "$RESPONSE" | jq -r '.id // .user.id // empty')

if [ -z "$USER_ID" ] || [ "$USER_ID" = "null" ]; then
  echo "❌ Failed to create auth user"
  echo "Response: $RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
  exit 1
fi

echo "✅ Auth user created: $USER_ID"

# Create user record in users table
UPSERT_RESPONSE=$(curl -s -X POST "$SUPABASE_URL/rest/v1/users" \
  -H "apikey: $SUPABASE_SERVICE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: resolution=merge-duplicates" \
  -d "{
    \"id\": \"$USER_ID\",
    \"email\": \"$TEST_EMAIL\",
    \"first_name\": \"$TEST_FIRST_NAME\",
    \"last_name\": \"$TEST_LAST_NAME\",
    \"age\": $TEST_AGE,
    \"user_type\": \"$TEST_USER_TYPE\",
    \"is_coppa_protected\": false,
    \"email_confirmed\": true,
    \"created_at\": \"$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)\",
    \"updated_at\": \"$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)\"
  }")

if echo "$UPSERT_RESPONSE" | jq -e '.error' > /dev/null 2>&1; then
  echo "⚠️  Warning: Users table upsert had an error (may already exist)"
  echo "$UPSERT_RESPONSE" | jq '.error' 2>/dev/null || echo "$UPSERT_RESPONSE"
else
  echo "✅ User record created in users table"
fi

echo ""
echo "=== Test User Created Successfully ==="
echo ""
echo "Email: $TEST_EMAIL"
echo "Password: $TEST_PASSWORD"
echo "User ID: $USER_ID"
echo ""
echo "You can now login to get an access token:"
echo "  curl -X POST https://api.storytailor.dev/api/v1/auth/login \\"
echo "    -H 'Content-Type: application/json' \\"
echo "    -d '{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}'"
echo ""
