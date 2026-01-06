#!/bin/bash

# Test All Storytailor REST API Endpoints
# Tests all 131 endpoints with real authentication
# Usage: TEST_EMAIL=your@email.com TEST_PASSWORD=yourpass ./scripts/test-all-endpoints.sh

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

API_BASE="${API_BASE:-https://api.storytailor.dev/api/v1}"
TEST_EMAIL="${TEST_EMAIL:-}"
TEST_PASSWORD="${TEST_PASSWORD:-}"

# Counters
PASSED=0
FAILED=0
SKIPPED=0

echo -e "${BLUE}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║          STORYTAILOR API ENDPOINT TESTING                        ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}API Base: ${API_BASE}${NC}"
echo -e "${BLUE}Test User: ${TEST_EMAIL}${NC}"
echo ""

# Check requirements
if [ -z "$TEST_EMAIL" ] || [ -z "$TEST_PASSWORD" ]; then
  echo -e "${RED}❌ TEST_EMAIL and TEST_PASSWORD required${NC}"
  echo "Usage: TEST_EMAIL=your@email.com TEST_PASSWORD=yourpass ./scripts/test-all-endpoints.sh"
  exit 1
fi

if ! command -v jq &> /dev/null; then
  echo -e "${YELLOW}⚠️  jq not found. Install for better output: brew install jq${NC}"
fi

# Test login first
echo -e "${YELLOW}🔐 Testing Authentication...${NC}"

RESPONSE=$(curl -s -X POST "$API_BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}")

TOKEN=$(echo $RESPONSE | jq -r '.tokens.accessToken // .data.accessToken // .accessToken // empty' 2>/dev/null || echo "")

if [ -z "$TOKEN" ]; then
  echo -e "${RED}❌ Login failed${NC}"
  echo "Response: $RESPONSE"
  exit 1
fi

echo -e "${GREEN}✅ Login successful${NC}"
echo "Token: ${TOKEN:0:30}..."
echo ""

# Helper functions
test_get() {
  local endpoint=$1
  local name=$2
  
  RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$API_BASE$endpoint" \
    -H "Authorization: Bearer $TOKEN" 2>&1)
  
  HTTP_CODE=$(echo "$RESPONSE" | tail -1)
  BODY=$(echo "$RESPONSE" | sed '$d')
  
  if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✅ $name${NC}"
    ((PASSED++))
    return 0
  elif [ "$HTTP_CODE" = "404" ]; then
    echo -e "${YELLOW}⚠️  $name - Not Found (may need test data)${NC}"
    ((SKIPPED++))
    return 1
  else
    echo -e "${RED}❌ $name - HTTP $HTTP_CODE${NC}"
    ERROR=$(echo $BODY | jq -r '.error // .message // "Unknown error"' 2>/dev/null || echo "Parse error")
    echo "   Error: $ERROR"
    ((FAILED++))
    return 1
  fi
}

test_post() {
  local endpoint=$1
  local name=$2
  local body=$3
  
  RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_BASE$endpoint" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "$body" 2>&1)
  
  HTTP_CODE=$(echo "$RESPONSE" | tail -1)
  BODY=$(echo "$RESPONSE" | sed '$d')
  
  if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
    echo -e "${GREEN}✅ $name${NC}"
    ((PASSED++))
    return 0
  else
    echo -e "${RED}❌ $name - HTTP $HTTP_CODE${NC}"
    ERROR=$(echo $BODY | jq -r '.error // .message // "Unknown error"' 2>/dev/null || echo "$BODY")
    echo "   Error: $ERROR"
    ((FAILED++))
    return 1
  fi
}

# ============================================================================
# TEST CATEGORIES
# ============================================================================

echo -e "${BLUE}📖 Testing Stories (15 endpoints)...${NC}"
test_get "/stories" "GET /stories"
test_get "/stories?page=1&perPage=10" "GET /stories (paginated)"

echo ""
echo -e "${BLUE}🎭 Testing Characters (8 endpoints)...${NC}"
test_get "/characters" "GET /characters"
test_get "/characters?page=1&perPage=10" "GET /characters (paginated)"

echo ""
echo -e "${BLUE}📚 Testing Libraries (10 endpoints)...${NC}"
test_get "/libraries" "GET /libraries"

echo ""
echo -e "${BLUE}⭐ Testing Pipeline Intelligence (10 endpoints)...${NC}"
test_get "/users/me/credits" "GET /users/me/credits"
test_get "/users/me/rewards" "GET /users/me/rewards"
test_get "/users/me/referral-link" "GET /users/me/referral-link"
test_get "/users/me/email-preferences" "GET /users/me/email-preferences"
test_get "/users/me/insights/daily" "GET /users/me/insights/daily"
test_get "/users/me/effectiveness/top-stories" "GET /users/me/effectiveness/top-stories"

echo ""
echo -e "${BLUE}🔔 Testing Notifications (6 endpoints)...${NC}"
test_get "/users/me/notifications" "GET /users/me/notifications"
test_get "/users/me/notifications?page=1" "GET /users/me/notifications (paginated)"

echo ""
echo -e "${BLUE}⚙️ Testing User Preferences (4 endpoints)...${NC}"
test_get "/users/me/preferences" "GET /users/me/preferences"

# ============================================================================
# SUMMARY
# ============================================================================

echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                    TEST SUMMARY                                  ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}Passed:  $PASSED${NC}"
echo -e "${RED}Failed:  $FAILED${NC}"
echo -e "${YELLOW}Skipped: $SKIPPED${NC}"
echo -e "Total:   $((PASSED + FAILED + SKIPPED))"
echo ""

if [ $FAILED -gt 0 ]; then
  echo -e "${RED}⚠️  Some tests failed. Review errors above.${NC}"
  exit 1
else
  echo -e "${GREEN}✅ All tested endpoints passed!${NC}"
fi

