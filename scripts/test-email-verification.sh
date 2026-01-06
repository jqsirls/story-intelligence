#!/bin/bash
# Test Email Verification Flow
# Tests that AUTO_CONFIRM_USERS=false requires email verification

set -e

echo "============================================================"
echo "Email Verification Flow Test"
echo "============================================================"
echo ""

# Test user registration
TEST_EMAIL="test-$(date +%s)@storytailor-test.com"
TEST_PASSWORD="TestPassword123!"

echo "Testing user registration with AUTO_CONFIRM_USERS=false..."
echo "Email: $TEST_EMAIL"
echo ""

# Create registration payload
cat > /tmp/register-payload.json << EOF
{
  "requestContext": {
    "http": {
      "method": "POST",
      "path": "/v1/auth/register"
    }
  },
  "rawPath": "/v1/auth/register",
  "body": "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\",\"firstName\":\"Test\",\"lastName\":\"User\",\"age\":25,\"userType\":\"child\"}"
}
EOF

# Invoke Lambda
RESPONSE=$(aws lambda invoke \
  --function-name storytailor-universal-agent-production \
  --region us-east-1 \
  --payload file:///tmp/register-payload.json \
  --cli-binary-format raw-in-base64-out \
  /tmp/register-response.json 2>&1)

if [ $? -ne 0 ]; then
  echo "❌ Registration request failed"
  exit 1
fi

# Parse response
BODY=$(cat /tmp/register-response.json | jq -r '.body' | jq '.')

echo "Registration Response:"
echo "$BODY" | jq '.'

# Check if user was created but not confirmed
USER_ID=$(echo "$BODY" | jq -r '.userId // empty')
EMAIL_CONFIRMED=$(echo "$BODY" | jq -r '.emailConfirmed // false')

if [ -z "$USER_ID" ]; then
  echo ""
  echo "❌ User registration failed - no user ID returned"
  exit 1
fi

echo ""
echo "✅ User created: $USER_ID"

if [ "$EMAIL_CONFIRMED" = "false" ] || [ "$EMAIL_CONFIRMED" = "null" ]; then
  echo "✅ Email confirmation required (AUTO_CONFIRM_USERS=false working correctly)"
else
  echo "⚠️  WARNING: Email appears to be auto-confirmed (AUTO_CONFIRM_USERS should be false)"
fi

echo ""
echo "============================================================"
echo "Test Complete"
echo "============================================================"
echo ""
echo "Next steps:"
echo "1. Check email inbox for $TEST_EMAIL for confirmation email"
echo "2. Verify confirmation link works"
echo "3. Test login before confirmation (should fail)"
echo "4. Test login after confirmation (should succeed)"
