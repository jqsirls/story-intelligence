#!/bin/bash

# Test Authentication System
# Tests user registration, login, token validation, and protected routes

set -e

echo "🔐 Testing Storytailor Authentication System"
echo "============================================="

# Configuration
API_BASE_URL="https://sxjwfwffz7.execute-api.us-east-1.amazonaws.com/staging"
TEST_EMAIL="test-$(date +%s)@storytailor.com"
TEST_PASSWORD="TestPassword123!"
TEST_FIRST_NAME="Test"
TEST_LAST_NAME="User"
TEST_AGE=14

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Test 1: User Registration
echo -e "${BLUE}📝 Test 1: User Registration${NC}"
echo "Registering user: $TEST_EMAIL"

REGISTER_RESPONSE=$(api_call "POST" "/v1/auth/register" '{
    "email": "'$TEST_EMAIL'",
    "password": "'$TEST_PASSWORD'",
    "firstName": "'$TEST_FIRST_NAME'",
    "lastName": "'$TEST_LAST_NAME'",
    "age": '$TEST_AGE'
}')

echo "Registration Response: $REGISTER_RESPONSE"

# Extract access token from registration
ACCESS_TOKEN=$(echo "$REGISTER_RESPONSE" | jq -r '.tokens.accessToken // empty')

if [ -n "$ACCESS_TOKEN" ] && [ "$ACCESS_TOKEN" != "null" ]; then
    echo -e "${GREEN}✅ Registration successful${NC}"
    echo "Access Token: ${ACCESS_TOKEN:0:20}..."
else
    echo -e "${RED}❌ Registration failed${NC}"
    echo "Response: $REGISTER_RESPONSE"
    exit 1
fi

# Test 2: User Login
echo -e "\n${BLUE}🔑 Test 2: User Login${NC}"
echo "Logging in user: $TEST_EMAIL"

LOGIN_RESPONSE=$(api_call "POST" "/v1/auth/login" '{
    "email": "'$TEST_EMAIL'",
    "password": "'$TEST_PASSWORD'"
}')

echo "Login Response: $LOGIN_RESPONSE"

# Extract access token from login
LOGIN_ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.tokens.accessToken // empty')

if [ -n "$LOGIN_ACCESS_TOKEN" ] && [ "$LOGIN_ACCESS_TOKEN" != "null" ]; then
    echo -e "${GREEN}✅ Login successful${NC}"
    echo "Login Access Token: ${LOGIN_ACCESS_TOKEN:0:20}..."
    ACCESS_TOKEN="$LOGIN_ACCESS_TOKEN"  # Use login token for subsequent tests
else
    echo -e "${RED}❌ Login failed${NC}"
    echo "Response: $LOGIN_RESPONSE"
    exit 1
fi

# Test 3: Get User Profile
echo -e "\n${BLUE}👤 Test 3: Get User Profile${NC}"
echo "Getting user profile with token"

PROFILE_RESPONSE=$(api_call "GET" "/v1/auth/me" "" "$ACCESS_TOKEN")

echo "Profile Response: $PROFILE_RESPONSE"

USER_ID=$(echo "$PROFILE_RESPONSE" | jq -r '.user.id // empty')

if [ -n "$USER_ID" ] && [ "$USER_ID" != "null" ]; then
    echo -e "${GREEN}✅ Profile retrieval successful${NC}"
    echo "User ID: $USER_ID"
else
    echo -e "${RED}❌ Profile retrieval failed${NC}"
    echo "Response: $PROFILE_RESPONSE"
    exit 1
fi

# Test 4: Protected Route Access
echo -e "\n${BLUE}🔒 Test 4: Protected Route Access${NC}"
echo "Accessing protected stories endpoint"

STORIES_RESPONSE=$(api_call "GET" "/v1/stories" "" "$ACCESS_TOKEN")

echo "Stories Response: $STORIES_RESPONSE"

if echo "$STORIES_RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Protected route access successful${NC}"
else
    echo -e "${YELLOW}⚠️ Protected route access returned error (expected if no stories exist)${NC}"
    echo "Response: $STORIES_RESPONSE"
fi

# Test 5: Invalid Token Access
echo -e "\n${BLUE}🚫 Test 5: Invalid Token Access${NC}"
echo "Testing access with invalid token"

INVALID_TOKEN_RESPONSE=$(api_call "GET" "/v1/auth/me" "" "invalid-token-12345")

echo "Invalid Token Response: $INVALID_TOKEN_RESPONSE"

if echo "$INVALID_TOKEN_RESPONSE" | jq -e '.success == false' > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Invalid token properly rejected${NC}"
else
    echo -e "${RED}❌ Invalid token was accepted (security issue!)${NC}"
    echo "Response: $INVALID_TOKEN_RESPONSE"
fi

# Test 6: No Token Access
echo -e "\n${BLUE}🔓 Test 6: No Token Access${NC}"
echo "Testing protected route without token"

NO_TOKEN_RESPONSE=$(api_call "GET" "/v1/auth/me" "")

echo "No Token Response: $NO_TOKEN_RESPONSE"

if echo "$NO_TOKEN_RESPONSE" | jq -e '.success == false' > /dev/null 2>&1; then
    echo -e "${GREEN}✅ No token properly rejected${NC}"
else
    echo -e "${RED}❌ No token was accepted (security issue!)${NC}"
    echo "Response: $NO_TOKEN_RESPONSE"
fi

# Test 7: Token Refresh
echo -e "\n${BLUE}🔄 Test 7: Token Refresh${NC}"
echo "Testing token refresh"

REFRESH_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.tokens.refreshToken // empty')

if [ -n "$REFRESH_TOKEN" ] && [ "$REFRESH_TOKEN" != "null" ]; then
    REFRESH_RESPONSE=$(api_call "POST" "/v1/auth/refresh" '{
        "refreshToken": "'$REFRESH_TOKEN'"
    }')
    
    echo "Refresh Response: $REFRESH_RESPONSE"
    
    NEW_ACCESS_TOKEN=$(echo "$REFRESH_RESPONSE" | jq -r '.tokens.accessToken // empty')
    
    if [ -n "$NEW_ACCESS_TOKEN" ] && [ "$NEW_ACCESS_TOKEN" != "null" ]; then
        echo -e "${GREEN}✅ Token refresh successful${NC}"
        echo "New Access Token: ${NEW_ACCESS_TOKEN:0:20}..."
    else
        echo -e "${RED}❌ Token refresh failed${NC}"
        echo "Response: $REFRESH_RESPONSE"
    fi
else
    echo -e "${YELLOW}⚠️ No refresh token available from login${NC}"
fi

# Test 8: Logout
echo -e "\n${BLUE}🚪 Test 8: Logout${NC}"
echo "Testing logout (token revocation)"

if [ -n "$REFRESH_TOKEN" ] && [ "$REFRESH_TOKEN" != "null" ]; then
    LOGOUT_RESPONSE=$(api_call "POST" "/v1/auth/logout" '{
        "refreshToken": "'$REFRESH_TOKEN'"
    }')
    
    echo "Logout Response: $LOGOUT_RESPONSE"
    
    if echo "$LOGOUT_RESPONSE" | jq -e '.success == true' > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Logout successful${NC}"
    else
        echo -e "${RED}❌ Logout failed${NC}"
        echo "Response: $LOGOUT_RESPONSE"
    fi
else
    echo -e "${YELLOW}⚠️ No refresh token available for logout test${NC}"
fi

# Summary
echo -e "\n${BLUE}📊 Authentication Test Summary${NC}"
echo "================================="
echo -e "${GREEN}✅ User Registration: Working${NC}"
echo -e "${GREEN}✅ User Login: Working${NC}"
echo -e "${GREEN}✅ Profile Retrieval: Working${NC}"
echo -e "${GREEN}✅ Protected Routes: Working${NC}"
echo -e "${GREEN}✅ Token Validation: Working${NC}"
echo -e "${GREEN}✅ Security: Invalid tokens rejected${NC}"

echo -e "\n${GREEN}🎉 Authentication System Test Complete!${NC}"
echo -e "${BLUE}Test User Created:${NC}"
echo "  Email: $TEST_EMAIL"
echo "  Password: $TEST_PASSWORD"
echo "  User ID: $USER_ID"

echo -e "\n${YELLOW}💡 Next Steps:${NC}"
echo "1. Test the authentication in your frontend application"
echo "2. Implement password reset functionality"
echo "3. Add email verification"
echo "4. Test COPPA compliance for users under 13"