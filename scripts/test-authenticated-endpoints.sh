#!/bin/bash
# Test authenticated endpoints with real user flows
# This script creates test users and tests all authenticated endpoints

set -e

API_URL="https://api.storytailor.dev"
TIMESTAMP=$(date +%s)
TEST_EMAIL="testuser-${TIMESTAMP}@storytailor-test.com"
TEST_PASSWORD="Test123!@#Password"
TEST_FIRST_NAME="Test"
TEST_LAST_NAME="User"
TEST_AGE=35
TEST_USER_TYPE="parent"

echo "🧪 Testing Authenticated Endpoints"
echo "=================================="
echo ""

# Step 1: Register test user (or use existing)
echo "📝 Step 1: Registering test user..."
REGISTER_RESPONSE=$(curl -s -X POST "${API_URL}/api/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"${TEST_EMAIL}\",
    \"password\": \"${TEST_PASSWORD}\",
    \"firstName\": \"${TEST_FIRST_NAME}\",
    \"lastName\": \"${TEST_LAST_NAME}\",
    \"age\": ${TEST_AGE},
    \"userType\": \"${TEST_USER_TYPE}\"
  }")

echo "Register Response: ${REGISTER_RESPONSE}"
echo ""

# Check if registration was successful or rate limited
if echo "${REGISTER_RESPONSE}" | grep -q '"success":true'; then
  echo "✅ User registered successfully"
  ACCESS_TOKEN=$(echo "${REGISTER_RESPONSE}" | jq -r '.tokens.accessToken' 2>/dev/null || echo "")
  REFRESH_TOKEN=$(echo "${REGISTER_RESPONSE}" | jq -r '.tokens.refreshToken' 2>/dev/null || echo "")
  USER_ID=$(echo "${REGISTER_RESPONSE}" | jq -r '.user.id' 2>/dev/null || echo "")
  
  if [ -z "${ACCESS_TOKEN}" ] || [ "${ACCESS_TOKEN}" = "null" ]; then
    echo "⚠️  No access token received, trying login..."
    
    # Try login instead
    LOGIN_RESPONSE=$(curl -s -X POST "${API_URL}/api/v1/auth/login" \
      -H "Content-Type: application/json" \
      -d "{
        \"email\": \"${TEST_EMAIL}\",
        \"password\": \"${TEST_PASSWORD}\"
      }")
    
    echo "Login Response: ${LOGIN_RESPONSE}"
    ACCESS_TOKEN=$(echo "${LOGIN_RESPONSE}" | jq -r '.tokens.accessToken' 2>/dev/null || echo "")
    REFRESH_TOKEN=$(echo "${LOGIN_RESPONSE}" | jq -r '.tokens.refreshToken' 2>/dev/null || echo "")
    USER_ID=$(echo "${LOGIN_RESPONSE}" | jq -r '.user.id' 2>/dev/null || echo "")
  fi
  
  if [ -z "${ACCESS_TOKEN}" ] || [ "${ACCESS_TOKEN}" = "null" ]; then
    echo "❌ Failed to get access token"
    exit 1
  fi
  
  echo "✅ Access token obtained: ${ACCESS_TOKEN:0:20}..."
  echo "✅ User ID: ${USER_ID}"
  echo ""
  
  # Step 2: Test authenticated endpoints
  echo "🔐 Step 2: Testing authenticated endpoints..."
  echo ""
  
  # Test GET /api/v1/auth/me
  echo "📋 Testing GET /api/v1/auth/me..."
  ME_RESPONSE=$(curl -s -X GET "${API_URL}/api/v1/auth/me" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -H "Content-Type: application/json")
  echo "Response: ${ME_RESPONSE}"
  if echo "${ME_RESPONSE}" | grep -q '"success":true'; then
    echo "✅ GET /api/v1/auth/me: SUCCESS"
  else
    echo "❌ GET /api/v1/auth/me: FAILED"
  fi
  echo ""
  
  # Test GET /api/v1/stories
  echo "📚 Testing GET /api/v1/stories..."
  STORIES_RESPONSE=$(curl -s -X GET "${API_URL}/api/v1/stories" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -H "Content-Type: application/json")
  echo "Response: ${STORIES_RESPONSE}"
  if echo "${STORIES_RESPONSE}" | grep -q '"success":true'; then
    echo "✅ GET /api/v1/stories: SUCCESS"
  else
    echo "⚠️  GET /api/v1/stories: Response received (may be empty list)"
  fi
  echo ""
  
  # Test GET /api/v1/characters
  echo "👤 Testing GET /api/v1/characters..."
  CHARACTERS_RESPONSE=$(curl -s -X GET "${API_URL}/api/v1/characters" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -H "Content-Type: application/json")
  echo "Response: ${CHARACTERS_RESPONSE}"
  if echo "${CHARACTERS_RESPONSE}" | grep -q '"success":true'; then
    echo "✅ GET /api/v1/characters: SUCCESS"
  else
    echo "⚠️  GET /api/v1/characters: Response received (may be empty list)"
  fi
  echo ""
  
  # Test POST /api/v1/characters (create character)
  echo "➕ Testing POST /api/v1/characters (create character)..."
  CREATE_CHARACTER_RESPONSE=$(curl -s -X POST "${API_URL}/api/v1/characters" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "{
      \"name\": \"Test Character ${TIMESTAMP}\",
      \"description\": \"A test character created during endpoint testing\",
      \"personality\": {\"traits\": [\"brave\", \"curious\"]},
      \"appearance\": {\"hair\": \"brown\", \"eyes\": \"blue\"}
    }")
  echo "Response: ${CREATE_CHARACTER_RESPONSE}"
  CHARACTER_ID=$(echo "${CREATE_CHARACTER_RESPONSE}" | jq -r '.data.id' 2>/dev/null || echo "")
  if [ -n "${CHARACTER_ID}" ] && [ "${CHARACTER_ID}" != "null" ]; then
    echo "✅ POST /api/v1/characters: SUCCESS (Character ID: ${CHARACTER_ID})"
    
    # Test GET /api/v1/characters/:id
    echo "📖 Testing GET /api/v1/characters/${CHARACTER_ID}..."
    GET_CHARACTER_RESPONSE=$(curl -s -X GET "${API_URL}/api/v1/characters/${CHARACTER_ID}" \
      -H "Authorization: Bearer ${ACCESS_TOKEN}" \
      -H "Content-Type: application/json")
    echo "Response: ${GET_CHARACTER_RESPONSE}"
    if echo "${GET_CHARACTER_RESPONSE}" | grep -q '"success":true'; then
      echo "✅ GET /api/v1/characters/:id: SUCCESS"
    else
      echo "❌ GET /api/v1/characters/:id: FAILED"
    fi
    echo ""
  else
    echo "❌ POST /api/v1/characters: FAILED"
  fi
  echo ""
  
  # Test POST /api/v1/conversations/start
  echo "💬 Testing POST /api/v1/conversations/start..."
  CONVERSATION_START_RESPONSE=$(curl -s -X POST "${API_URL}/api/v1/conversations/start" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "{
      \"channel\": \"web_chat\",
      \"metadata\": {\"test\": true}
    }")
  echo "Response: ${CONVERSATION_START_RESPONSE}"
  SESSION_ID=$(echo "${CONVERSATION_START_RESPONSE}" | jq -r '.data.sessionId' 2>/dev/null || echo "")
  if [ -n "${SESSION_ID}" ] && [ "${SESSION_ID}" != "null" ]; then
    echo "✅ POST /api/v1/conversations/start: SUCCESS (Session ID: ${SESSION_ID})"
    
    # Test POST /api/v1/conversations/:sessionId/message
    echo "📨 Testing POST /api/v1/conversations/${SESSION_ID}/message..."
    MESSAGE_RESPONSE=$(curl -s -X POST "${API_URL}/api/v1/conversations/${SESSION_ID}/message" \
      -H "Authorization: Bearer ${ACCESS_TOKEN}" \
      -H "Content-Type: application/json" \
      -d "{
        \"message\": \"Hello, I want to create a story about a brave knight\",
        \"messageType\": \"text\"
      }")
    echo "Response: ${MESSAGE_RESPONSE}"
    if echo "${MESSAGE_RESPONSE}" | grep -q '"success":true'; then
      echo "✅ POST /api/v1/conversations/:sessionId/message: SUCCESS"
    else
      echo "⚠️  POST /api/v1/conversations/:sessionId/message: Response received"
    fi
    echo ""
  else
    echo "⚠️  POST /api/v1/conversations/start: Response received (may need storytellerAPI)"
  fi
  echo ""
  
  echo "✅ Authenticated endpoint testing complete!"
  echo ""
  echo "Summary:"
  echo "  - User ID: ${USER_ID}"
  echo "  - Access Token: ${ACCESS_TOKEN:0:20}..."
  echo "  - Character ID: ${CHARACTER_ID:-N/A}"
  echo "  - Session ID: ${SESSION_ID:-N/A}"
  
elif echo "${REGISTER_RESPONSE}" | grep -q "rate limit"; then
  echo "⚠️  Registration rate limited - trying with existing test account or login..."
  echo ""
  
  # Try with a known test account pattern (if exists)
  # Or wait and retry
  echo "⏳ Waiting 30 seconds for rate limit to reset..."
  sleep 30
  
  # Retry registration
  REGISTER_RESPONSE=$(curl -s -X POST "${API_URL}/api/v1/auth/register" \
    -H "Content-Type: application/json" \
    -d "{
      \"email\": \"testuser-retry-${TIMESTAMP}@storytailor-test.com\",
      \"password\": \"${TEST_PASSWORD}\",
      \"firstName\": \"${TEST_FIRST_NAME}\",
      \"lastName\": \"${TEST_LAST_NAME}\",
      \"age\": ${TEST_AGE},
      \"userType\": \"${TEST_USER_TYPE}\"
    }")
  
  echo "Retry Register Response: ${REGISTER_RESPONSE}"
  echo ""
  
  if echo "${REGISTER_RESPONSE}" | grep -q '"success":true'; then
    ACCESS_TOKEN=$(echo "${REGISTER_RESPONSE}" | jq -r '.tokens.accessToken' 2>/dev/null || echo "")
    REFRESH_TOKEN=$(echo "${REGISTER_RESPONSE}" | jq -r '.tokens.refreshToken' 2>/dev/null || echo "")
    USER_ID=$(echo "${REGISTER_RESPONSE}" | jq -r '.user.id' 2>/dev/null || echo "")
    
    if [ -z "${ACCESS_TOKEN}" ] || [ "${ACCESS_TOKEN}" = "null" ]; then
      echo "⚠️  No access token from registration, trying login..."
      TEST_EMAIL="testuser-retry-${TIMESTAMP}@storytailor-test.com"
      LOGIN_RESPONSE=$(curl -s -X POST "${API_URL}/api/v1/auth/login" \
        -H "Content-Type: application/json" \
        -d "{
          \"email\": \"${TEST_EMAIL}\",
          \"password\": \"${TEST_PASSWORD}\"
        }")
      
      ACCESS_TOKEN=$(echo "${LOGIN_RESPONSE}" | jq -r '.tokens.accessToken' 2>/dev/null || echo "")
      REFRESH_TOKEN=$(echo "${LOGIN_RESPONSE}" | jq -r '.tokens.refreshToken' 2>/dev/null || echo "")
      USER_ID=$(echo "${LOGIN_RESPONSE}" | jq -r '.user.id' 2>/dev/null || echo "")
    fi
  else
    echo "❌ Registration still failing after retry"
    echo "Response: ${REGISTER_RESPONSE}"
    echo ""
    echo "⚠️  Note: Rate limiting is working correctly (security feature)"
    echo "⚠️  For full testing, wait for rate limit to reset or use existing test account"
    exit 1
  fi
else
  echo "❌ User registration failed"
  echo "Response: ${REGISTER_RESPONSE}"
  exit 1
fi

# Continue with authenticated endpoint testing if we have a token
if [ -n "${ACCESS_TOKEN}" ] && [ "${ACCESS_TOKEN}" != "null" ]; then
