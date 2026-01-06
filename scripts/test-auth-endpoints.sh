#!/bin/bash

# Test Sign Up and Sign In API Endpoints
# Usage: ./scripts/test-auth-endpoints.sh

set -e

API_BASE="https://api.storytailor.dev/api/v1"
TEST_EMAIL="test-$(date +%s)@example.com"
TEST_PASSWORD="TestPassword123!"

echo "🧪 Testing Authentication Endpoints"
echo "===================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Sign Up
echo "1️⃣  Testing Sign Up..."
echo "   Email: $TEST_EMAIL"
echo "   User Type: parent"
echo ""

SIGNUP_RESPONSE=$(curl -s -X POST "${API_BASE}/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"${TEST_EMAIL}\",
    \"password\": \"${TEST_PASSWORD}\",
    \"age\": 35,
    \"userType\": \"parent\",
    \"firstName\": \"Test\",
    \"lastName\": \"User\"
  }")

echo "Response:"
echo "$SIGNUP_RESPONSE" | jq '.' 2>/dev/null || echo "$SIGNUP_RESPONSE"
echo ""

# Extract tokens if successful
if echo "$SIGNUP_RESPONSE" | jq -e '.success == true' > /dev/null 2>&1; then
  ACCESS_TOKEN=$(echo "$SIGNUP_RESPONSE" | jq -r '.tokens.accessToken // empty')
  REFRESH_TOKEN=$(echo "$SIGNUP_RESPONSE" | jq -r '.tokens.refreshToken // empty')
  USER_ID=$(echo "$SIGNUP_RESPONSE" | jq -r '.user.id // empty')
  
  if [ -n "$ACCESS_TOKEN" ] && [ "$ACCESS_TOKEN" != "null" ]; then
    echo -e "${GREEN}✅ Sign Up Successful!${NC}"
    echo "   User ID: $USER_ID"
    echo "   Access Token: ${ACCESS_TOKEN:0:20}..."
    echo ""
    
    # Test 2: Get Current User (using access token)
    echo "2️⃣  Testing Get Current User (/auth/me)..."
    ME_RESPONSE=$(curl -s -X GET "${API_BASE}/auth/me" \
      -H "Authorization: Bearer ${ACCESS_TOKEN}" \
      -H "Content-Type: application/json")
    
    echo "Response:"
    echo "$ME_RESPONSE" | jq '.' 2>/dev/null || echo "$ME_RESPONSE"
    echo ""
    
    if echo "$ME_RESPONSE" | jq -e '.success == true' > /dev/null 2>&1; then
      echo -e "${GREEN}✅ Get Current User Successful!${NC}"
    else
      echo -e "${RED}❌ Get Current User Failed${NC}"
    fi
    echo ""
    
    # Test 3: Sign In (with same credentials)
    echo "3️⃣  Testing Sign In..."
    LOGIN_RESPONSE=$(curl -s -X POST "${API_BASE}/auth/login" \
      -H "Content-Type: application/json" \
      -d "{
        \"email\": \"${TEST_EMAIL}\",
        \"password\": \"${TEST_PASSWORD}\"
      }")
    
    echo "Response:"
    echo "$LOGIN_RESPONSE" | jq '.' 2>/dev/null || echo "$LOGIN_RESPONSE"
    echo ""
    
    if echo "$LOGIN_RESPONSE" | jq -e '.success == true' > /dev/null 2>&1; then
      echo -e "${GREEN}✅ Sign In Successful!${NC}"
      NEW_ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.tokens.accessToken // empty')
      echo "   New Access Token: ${NEW_ACCESS_TOKEN:0:20}..."
      echo ""
      
      # Test 4: Refresh Token
      if [ -n "$REFRESH_TOKEN" ] && [ "$REFRESH_TOKEN" != "null" ]; then
        echo "4️⃣  Testing Refresh Token..."
        REFRESH_RESPONSE=$(curl -s -X POST "${API_BASE}/auth/refresh" \
          -H "Content-Type: application/json" \
          -d "{
            \"refreshToken\": \"${REFRESH_TOKEN}\"
          }")
        
        echo "Response:"
        echo "$REFRESH_RESPONSE" | jq '.' 2>/dev/null || echo "$REFRESH_RESPONSE"
        echo ""
        
        if echo "$REFRESH_RESPONSE" | jq -e '.success == true' > /dev/null 2>&1; then
          echo -e "${GREEN}✅ Refresh Token Successful!${NC}"
        else
          echo -e "${RED}❌ Refresh Token Failed${NC}"
        fi
      fi
    else
      echo -e "${RED}❌ Sign In Failed${NC}"
    fi
    
  else
    echo -e "${RED}❌ Sign Up Failed - No tokens returned${NC}"
  fi
else
  echo -e "${RED}❌ Sign Up Failed${NC}"
  ERROR_MSG=$(echo "$SIGNUP_RESPONSE" | jq -r '.error // "Unknown error"' 2>/dev/null || echo "Unknown error")
  echo "   Error: $ERROR_MSG"
fi

echo ""
echo "===================================="
echo "✅ Auth Endpoint Testing Complete"
echo ""
echo "Test Credentials:"
echo "  Email: $TEST_EMAIL"
echo "  Password: $TEST_PASSWORD"
echo ""

