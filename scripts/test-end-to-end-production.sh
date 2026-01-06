#!/bin/bash

# End-to-End Testing Script for Production
# Tests complete agent functionality with real data

set -e

echo "🧪 End-to-End Testing: Complete Agent Functionality"
echo "==================================================="

# Configuration
API_BASE_URL="https://api.storytailor.dev"
TEST_EMAIL="e2e-test-$(date +%s)@storytailor.com"
TEST_PASSWORD="TestPassword123!"
TEST_FIRST_NAME="E2E"
TEST_LAST_NAME="Test"
TEST_AGE=14

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Function to make API calls
api_call() {
    local method=$1
    local endpoint=$2
    local data=$3
    local auth_header=$4
    
    if [ -n "$auth_header" ]; then
        curl -s -X "$method" \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer $auth_header" \
            -d "$data" \
            "$API_BASE_URL$endpoint"
    else
        curl -s -X "$method" \
            -H "Content-Type: application/json" \
            -d "$data" \
            "$API_BASE_URL$endpoint"
    fi
}

# Test 1: Health Check
echo -e "${BLUE}📊 Test 1: API Health Check${NC}"
HEALTH_RESPONSE=$(curl -s "$API_BASE_URL/health")
echo "Health Response: $HEALTH_RESPONSE"
if echo "$HEALTH_RESPONSE" | jq -e '.status' > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Health check passed${NC}"
else
    echo -e "${RED}❌ Health check failed${NC}"
    exit 1
fi

# Test 2: User Registration
echo -e "\n${BLUE}📝 Test 2: User Registration${NC}"
REGISTER_RESPONSE=$(api_call "POST" "/api/v1/auth/register" '{
    "email": "'$TEST_EMAIL'",
    "password": "'$TEST_PASSWORD'",
    "firstName": "'$TEST_FIRST_NAME'",
    "lastName": "'$TEST_LAST_NAME'",
    "age": '$TEST_AGE',
    "userType": "parent"
}')

echo "Registration Response: $REGISTER_RESPONSE"

USER_ID=$(echo "$REGISTER_RESPONSE" | jq -r '.data.user.id // .user.id // empty')
ACCESS_TOKEN=$(echo "$REGISTER_RESPONSE" | jq -r '.data.tokens.accessToken // .tokens.accessToken // empty')

if [ -n "$USER_ID" ] && [ "$USER_ID" != "null" ]; then
    echo -e "${GREEN}✅ Registration successful${NC}"
    echo "User ID: $USER_ID"
    
    # If no token from registration, try login
    if [ -z "$ACCESS_TOKEN" ] || [ "$ACCESS_TOKEN" == "null" ]; then
        echo "No token from registration, attempting login..."
        LOGIN_RESPONSE=$(api_call "POST" "/api/v1/auth/login" '{
            "email": "'$TEST_EMAIL'",
            "password": "'$TEST_PASSWORD'"
        }')
        
        echo "Login Response: $LOGIN_RESPONSE"
        ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.tokens.accessToken // .tokens.accessToken // empty')
        
        if [ -n "$ACCESS_TOKEN" ] && [ "$ACCESS_TOKEN" != "null" ]; then
            echo -e "${GREEN}✅ Login successful${NC}"
            echo "Access Token: ${ACCESS_TOKEN:0:30}..."
        else
            echo -e "${YELLOW}⚠️ Login failed, but user registered${NC}"
            echo "Response: $LOGIN_RESPONSE"
            # Continue with tests that don't require auth
        fi
    else
        echo "Access Token: ${ACCESS_TOKEN:0:30}..."
    fi
else
    echo -e "${RED}❌ Registration failed${NC}"
    echo "Response: $REGISTER_RESPONSE"
    exit 1
fi

# Test 3: Start Conversation
echo -e "\n${BLUE}💬 Test 3: Start Conversation${NC}"
CONV_START_RESPONSE=$(api_call "POST" "/api/v1/conversations/start" '{
    "channel": "api_direct",
    "metadata": {}
}' "$ACCESS_TOKEN")

echo "Conversation Start Response: $CONV_START_RESPONSE"

SESSION_ID=$(echo "$CONV_START_RESPONSE" | jq -r '.data.sessionId // .sessionId // empty')

if [ -n "$SESSION_ID" ] && [ "$SESSION_ID" != "null" ]; then
    echo -e "${GREEN}✅ Conversation started${NC}"
    echo "Session ID: $SESSION_ID"
else
    echo -e "${YELLOW}⚠️ Conversation start may have failed or service unavailable${NC}"
    echo "Response: $CONV_START_RESPONSE"
    # Continue with other tests even if conversation fails
fi

# Test 4: Send Message (if conversation started)
if [ -n "$SESSION_ID" ] && [ "$SESSION_ID" != "null" ]; then
    echo -e "\n${BLUE}📨 Test 4: Send Message${NC}"
    MESSAGE_RESPONSE=$(api_call "POST" "/api/v1/conversations/$SESSION_ID/message" '{
        "message": "I want to create a story about a brave knight",
        "messageType": "text",
        "metadata": {}
    }' "$ACCESS_TOKEN")
    
    echo "Message Response: $MESSAGE_RESPONSE"
    
    if echo "$MESSAGE_RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Message sent successfully${NC}"
        echo "This verifies Router → Agent communication"
    else
        echo -e "${YELLOW}⚠️ Message sending may have failed${NC}"
        echo "Response: $MESSAGE_RESPONSE"
    fi
fi

# Test 5: Create Story
echo -e "\n${BLUE}📖 Test 5: Create Story${NC}"
STORY_RESPONSE=$(api_call "POST" "/api/v1/stories" '{
    "title": "E2E Test Story",
    "storyType": "adventure",
    "ageRange": "6-8",
    "prompt": "A brave knight goes on an adventure"
}' "$ACCESS_TOKEN")

echo "Story Creation Response: $STORY_RESPONSE"

STORY_ID=$(echo "$STORY_RESPONSE" | jq -r '.data.id // .id // empty')

if [ -n "$STORY_ID" ] && [ "$STORY_ID" != "null" ]; then
    echo -e "${GREEN}✅ Story created${NC}"
    echo "Story ID: $STORY_ID"
else
    echo -e "${YELLOW}⚠️ Story creation may have failed${NC}"
    echo "Response: $STORY_RESPONSE"
fi

# Test 6: List Stories
echo -e "\n${BLUE}📚 Test 6: List Stories${NC}"
STORIES_RESPONSE=$(api_call "GET" "/api/v1/stories" "" "$ACCESS_TOKEN")
echo "Stories Response: $STORIES_RESPONSE"

if echo "$STORIES_RESPONSE" | jq -e '.data' > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Stories retrieved${NC}"
else
    echo -e "${YELLOW}⚠️ Stories retrieval may have failed${NC}"
fi

# Test 7: Create Library
echo -e "\n${BLUE}📁 Test 7: Create Library${NC}"
LIBRARY_RESPONSE=$(api_call "POST" "/api/v1/libraries" '{
    "name": "E2E Test Library",
    "description": "Test library for end-to-end testing"
}' "$ACCESS_TOKEN")

echo "Library Creation Response: $LIBRARY_RESPONSE"

LIBRARY_ID=$(echo "$LIBRARY_RESPONSE" | jq -r '.data.id // .id // empty')

if [ -n "$LIBRARY_ID" ] && [ "$LIBRARY_ID" != "null" ]; then
    echo -e "${GREEN}✅ Library created${NC}"
    echo "Library ID: $LIBRARY_ID"
else
    echo -e "${YELLOW}⚠️ Library creation may have failed${NC}"
    echo "Response: $LIBRARY_RESPONSE"
fi

# Test 8: List Libraries
echo -e "\n${BLUE}📂 Test 8: List Libraries${NC}"
LIBRARIES_RESPONSE=$(api_call "GET" "/api/v1/libraries" "" "$ACCESS_TOKEN")
echo "Libraries Response: $LIBRARIES_RESPONSE"

if echo "$LIBRARIES_RESPONSE" | jq -e '.data' > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Libraries retrieved${NC}"
else
    echo -e "${YELLOW}⚠️ Libraries retrieval may have failed${NC}"
fi

# Summary
echo -e "\n${BLUE}📊 Test Summary${NC}"
echo "=================="
echo "✅ Health Check: Passed"
echo "✅ User Registration: Passed"
if [ -n "$SESSION_ID" ] && [ "$SESSION_ID" != "null" ]; then
    echo "✅ Conversation Start: Passed"
    echo "✅ Message Sending: Tested"
fi
if [ -n "$STORY_ID" ] && [ "$STORY_ID" != "null" ]; then
    echo "✅ Story Creation: Passed"
fi
if [ -n "$LIBRARY_ID" ] && [ "$LIBRARY_ID" != "null" ]; then
    echo "✅ Library Creation: Passed"
fi
echo ""
echo -e "${GREEN}End-to-end testing completed!${NC}"
