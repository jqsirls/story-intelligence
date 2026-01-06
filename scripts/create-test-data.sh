#!/bin/bash

# Create Test Data for Storytailor API Testing
# Creates test user, character, story for comprehensive testing
# Usage: TEST_EMAIL=test@example.com TEST_PASSWORD=testpass ./scripts/create-test-data.sh

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

API_BASE="${API_BASE:-https://api.storytailor.dev/api/v1}"
TEST_EMAIL="${TEST_EMAIL:-test-$(date +%s)@storytailor.test}"
TEST_PASSWORD="${TEST_PASSWORD:-TestPass123!}"

echo -e "${BLUE}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║          CREATE TEST DATA                                        ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}API: ${API_BASE}${NC}"
echo -e "${BLUE}Email: ${TEST_EMAIL}${NC}"
echo ""

# Step 1: Create test user (or login if exists)
echo -e "${YELLOW}👤 Creating test user...${NC}"

SIGNUP_RESPONSE=$(curl -s -X POST "$API_BASE/auth/signup" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\":\"$TEST_EMAIL\",
    \"password\":\"$TEST_PASSWORD\",
    \"firstName\":\"Test\",
    \"lastName\":\"User\",
    \"userType\":\"parent\",
    \"age\":30
  }")

TOKEN=$(echo $SIGNUP_RESPONSE | jq -r '.data.accessToken // empty' 2>/dev/null)

if [ -z "$TOKEN" ]; then
  echo -e "${YELLOW}User may exist, trying login...${NC}"
  
  LOGIN_RESPONSE=$(curl -s -X POST "$API_BASE/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}")
  
  TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.data.accessToken // empty' 2>/dev/null)
  
  if [ -z "$TOKEN" ]; then
    echo -e "${RED}❌ Failed to create/login test user${NC}"
    exit 1
  fi
fi

USER_ID=$(echo $SIGNUP_RESPONSE | jq -r '.data.user.id // empty' 2>/dev/null)
if [ -z "$USER_ID" ]; then
  USER_ID=$(echo $LOGIN_RESPONSE | jq -r '.data.user.id // empty' 2>/dev/null)
fi

echo -e "${GREEN}✅ Test user authenticated${NC}"
echo "User ID: $USER_ID"
echo "Token: ${TOKEN:0:30}..."
echo ""

# Step 2: Get libraries
echo -e "${YELLOW}📚 Getting user libraries...${NC}"

LIBRARIES_RESPONSE=$(curl -s -X GET "$API_BASE/libraries" \
  -H "Authorization: Bearer $TOKEN")

LIBRARY_ID=$(echo $LIBRARIES_RESPONSE | jq -r '.data.libraries[0].id // empty' 2>/dev/null)

if [ -z "$LIBRARY_ID" ]; then
  echo -e "${YELLOW}No library found, this is unexpected (should auto-create)${NC}"
  LIBRARY_ID="default"
fi

echo -e "${GREEN}✅ Library ID: $LIBRARY_ID${NC}"
echo ""

# Step 3: Create test character
echo -e "${YELLOW}🎭 Creating test character...${NC}"

CHARACTER_RESPONSE=$(curl -s -X POST "$API_BASE/characters" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\":\"Test Fox\",
    \"species\":\"fox\",
    \"age\":\"5\",
    \"personality_traits\":[\"brave\",\"curious\",\"kind\"],
    \"special_abilities\":[\"Can talk to animals\"],
    \"backstory\":\"A brave fox from the enchanted forest.\",
    \"library_id\":\"$LIBRARY_ID\"
  }")

CHARACTER_ID=$(echo $CHARACTER_RESPONSE | jq -r '.data.character.id // empty' 2>/dev/null)

if [ -z "$CHARACTER_ID" ]; then
  echo -e "${RED}❌ Failed to create character${NC}"
  echo "Response: $CHARACTER_RESPONSE"
  exit 1
fi

echo -e "${GREEN}✅ Character created: $CHARACTER_ID${NC}"
echo ""

# Step 4: Create test story
echo -e "${YELLOW}📖 Creating test story...${NC}"

STORY_RESPONSE=$(curl -s -X POST "$API_BASE/stories" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"title\":\"Test Story $(date +%H%M%S)\",
    \"character_id\":\"$CHARACTER_ID\",
    \"library_id\":\"$LIBRARY_ID\",
    \"age_range\":\"7-9\",
    \"story_length\":\"short\",
    \"themes\":[\"adventure\",\"test\"],
    \"generate_assets\":{
      \"audio\":false,
      \"art\":false,
      \"pdf\":false,
      \"activities\":false
    }
  }")

STORY_ID=$(echo $STORY_RESPONSE | jq -r '.data.story.id // empty' 2>/dev/null)

if [ -z "$STORY_ID" ]; then
  echo -e "${RED}❌ Failed to create story${NC}"
  echo "Response: $STORY_RESPONSE"
  exit 1
fi

echo -e "${GREEN}✅ Story created: $STORY_ID${NC}"
echo ""

# Step 5: Test consumption tracking
echo -e "${YELLOW}📊 Testing consumption tracking...${NC}"

TRACK_RESPONSE=$(curl -s -X POST "$API_BASE/stories/$STORY_ID/consumption" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"eventType\":\"play_complete\",
    \"position\":0,
    \"duration\":300,
    \"metadata\":{\"device\":\"test\"}
  }")

if echo $TRACK_RESPONSE | jq -e '.success' > /dev/null 2>&1; then
  echo -e "${GREEN}✅ Consumption tracking works${NC}"
else
  echo -e "${YELLOW}⚠️  Consumption tracking may need migration${NC}"
  echo "Response: $TRACK_RESPONSE"
fi

echo ""

# ============================================================================
# OUTPUT TEST CREDENTIALS
# ============================================================================

echo -e "${BLUE}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║          TEST DATA CREATED                                       ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "Use these for further testing:"
echo ""
echo "TEST_EMAIL=$TEST_EMAIL"
echo "TEST_PASSWORD=$TEST_PASSWORD"
echo "USER_ID=$USER_ID"
echo "CHARACTER_ID=$CHARACTER_ID"
echo "STORY_ID=$STORY_ID"
echo "LIBRARY_ID=$LIBRARY_ID"
echo "TOKEN=${TOKEN:0:50}..."
echo ""
echo "Save to .env.test:"
echo "cat > .env.test << EOF"
echo "TEST_EMAIL=$TEST_EMAIL"
echo "TEST_PASSWORD=$TEST_PASSWORD"
echo "TEST_USER_ID=$USER_ID"
echo "TEST_CHARACTER_ID=$CHARACTER_ID"
echo "TEST_STORY_ID=$STORY_ID"
echo "TEST_LIBRARY_ID=$LIBRARY_ID"
echo "EOF"
echo ""
echo -e "${GREEN}✅ Test data ready for endpoint testing${NC}"

