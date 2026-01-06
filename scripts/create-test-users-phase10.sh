#!/bin/bash
# Create Test Users for All 18 User Types (Phase 10)
# Uses Supabase Admin API to bypass email rate limits

set -e

SUPABASE_URL="${SUPABASE_URL:-${NEXT_PUBLIC_SUPABASE_URL}}"
SUPABASE_SERVICE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-${SUPABASE_SERVICE_KEY}}"

if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_KEY" ]; then
  echo "❌ Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set"
  exit 1
fi

# All 18 user types
USER_TYPES=(
  "child"
  "parent"
  "guardian"
  "grandparent"
  "aunt_uncle"
  "older_sibling"
  "foster_caregiver"
  "teacher"
  "librarian"
  "afterschool_leader"
  "childcare_provider"
  "nanny"
  "child_life_specialist"
  "therapist"
  "medical_professional"
  "coach_mentor"
  "enthusiast"
  "other"
)

TIMESTAMP=$(date +%s)
PASSWORD="TestPass123!"
CREATED=0
FAILED=0

echo "=== Creating Test Users for All 18 User Types ==="
echo ""

for user_type in "${USER_TYPES[@]}"; do
  EMAIL="phase10-${user_type}-${TIMESTAMP}@storytailor.com"
  AGE=35
  
  # Set age for child user type
  if [ "$user_type" = "child" ]; then
    AGE=8
  fi
  
  echo "Creating: $user_type ($EMAIL)"
  
  # Create user via Supabase Admin API
  RESPONSE=$(curl -s -X POST "$SUPABASE_URL/auth/v1/admin/users" \
    -H "apikey: $SUPABASE_SERVICE_KEY" \
    -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
    -H "Content-Type: application/json" \
    -d "{
      \"email\": \"$EMAIL\",
      \"password\": \"$PASSWORD\",
      \"email_confirm\": true,
      \"user_metadata\": {
        \"first_name\": \"Test\",
        \"last_name\": \"${user_type^}\",
        \"age\": $AGE,
        \"user_type\": \"$user_type\"
      }
    }")
  
  USER_ID=$(echo "$RESPONSE" | jq -r '.id // empty' 2>/dev/null)
  
  if [ -z "$USER_ID" ] || [ "$USER_ID" = "null" ]; then
    echo "  ❌ Failed"
    echo "  Response: $RESPONSE"
    ((FAILED++))
    continue
  fi
  
  # Update users table with user_type and other fields
  UPDATE_RESPONSE=$(curl -s -X PATCH "$SUPABASE_URL/rest/v1/users?id=eq.$USER_ID" \
    -H "apikey: $SUPABASE_SERVICE_KEY" \
    -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
    -H "Content-Type: application/json" \
    -H "Prefer: return=representation" \
    -d "{
      \"user_type\": \"$user_type\",
      \"age\": $AGE,
      \"first_name\": \"Test\",
      \"last_name\": \"${user_type^}\"
    }" 2>/dev/null)
  
  echo "  ✅ Created: $USER_ID"
  echo "  Email: $EMAIL"
  echo "  Password: $PASSWORD"
  echo ""
  
  ((CREATED++))
done

echo "=== Summary ==="
echo "✅ Created: $CREATED users"
echo "❌ Failed: $FAILED users"
echo ""
echo "All test users use password: $PASSWORD"
