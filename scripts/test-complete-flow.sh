#!/bin/bash
# Test Complete Storytailor Flow
set -e

echo "🧪 Testing Complete Storytailor Flow"
echo "===================================="

API_URL="https://sxjwfwffz7.execute-api.us-east-1.amazonaws.com/staging"
TEST_EMAIL="complete-test-$(date +%s)@storytailor.com"
TEST_PASSWORD="TestPassword123!"

echo "🔐 Step 1: User Registration"
REGISTER_RESPONSE=$(curl -s -X POST "$API_URL/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "'$TEST_EMAIL'",
    "password": "'$TEST_PASSWORD'",
    "firstName": "Story",
    "lastName": "Teller",
    "age": 8
  }')

echo "Registration Response: $REGISTER_RESPONSE"

ACCESS_TOKEN=$(echo "$REGISTER_RESPONSE" | jq -r '.tokens.accessToken // empty')

if [ -n "$ACCESS_TOKEN" ] && [ "$ACCESS_TOKEN" != "null" ]; then
    echo "✅ Registration successful"
    echo "Access Token: ${ACCESS_TOKEN:0:20}..."
else
    echo "❌ Registration failed"
    exit 1
fi

echo -e "\n🤖 Step 2: AI Story Generation"
STORY_RESPONSE=$(curl -s -X POST "$API_URL/v1/stories/generate" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{
    "prompt": "Create a story about a brave little mouse who goes on an adventure to find cheese",
    "ageRange": "6-8",
    "mood": "adventurous",
    "length": "short",
    "characters": ["mouse", "cat", "owl"],
    "theme": "friendship"
  }')

echo "Story Generation Response:"
echo "$STORY_RESPONSE" | jq '.'

STORY_ID=$(echo "$STORY_RESPONSE" | jq -r '.story.id // empty')

if [ -n "$STORY_ID" ] && [ "$STORY_ID" != "null" ]; then
    echo "✅ AI Story Generation successful"
    echo "Story ID: $STORY_ID"
else
    echo "❌ AI Story Generation failed"
    exit 1
fi

echo -e "\n📚 Step 3: Retrieve User Stories"
USER_STORIES_RESPONSE=$(curl -s -X GET "$API_URL/v1/stories" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

echo "User Stories Response:"
echo "$USER_STORIES_RESPONSE" | jq '.'

STORY_COUNT=$(echo "$USER_STORIES_RESPONSE" | jq -r '.count // 0')

if [ "$STORY_COUNT" -gt 0 ]; then
    echo "✅ User stories retrieval successful"
    echo "Story count: $STORY_COUNT"
else
    echo "❌ User stories retrieval failed"
    exit 1
fi

echo -e "\n🎉 Complete Flow Test Results:"
echo "================================"
echo "✅ User Registration: Working"
echo "✅ JWT Authentication: Working"
echo "✅ AI Story Generation: Working"
echo "✅ Database Storage: Working"
echo "✅ User Story Retrieval: Working"
echo ""
echo "🌟 STORYTAILOR SYSTEM IS FULLY OPERATIONAL!"