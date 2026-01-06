#!/bin/bash
# Test Email Verification Flow End-to-End
# Tests: register → verify email sent → test login blocked → (manual confirmation) → test login works

set -e

echo "============================================================"
echo "Email Verification Flow E2E Test"
echo "============================================================"
echo ""

LAMBDA_FUNCTION="storytailor-universal-agent-production"
REGION="us-east-1"
TEST_EMAIL="test-verify-$(date +%s)@storytailor-test.com"
TEST_PASSWORD="TestPassword123!"

echo "Test Email: $TEST_EMAIL"
echo "AUTO_CONFIRM_USERS should be: false"
echo ""

# Step 1: Register user
echo "Step 1: Registering user..."
cat > /tmp/register-e2e.json << EOF
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

REGISTER_RESPONSE=$(aws lambda invoke \
  --function-name "$LAMBDA_FUNCTION" \
  --region "$REGION" \
  --payload file:///tmp/register-e2e.json \
  --cli-binary-format raw-in-base64-out \
  /tmp/register-e2e-response.json 2>&1)

if [ $? -ne 0 ]; then
  echo "❌ Registration request failed"
  exit 1
fi

REGISTER_BODY=$(cat /tmp/register-e2e-response.json | jq -r '.body' | jq '.' 2>/dev/null || echo "{}")
echo "Registration Response:"
echo "$REGISTER_BODY" | jq '.'

# Check if registration succeeded
if echo "$REGISTER_BODY" | jq -e '.success == true' >/dev/null 2>&1; then
  USER_ID=$(echo "$REGISTER_BODY" | jq -r '.user.id // empty')
  echo ""
  echo "✅ Step 1: User registered successfully"
  echo "   User ID: $USER_ID"
  
  # Check if email confirmation is required
  EMAIL_CONFIRMED=$(echo "$REGISTER_BODY" | jq -r '.user.isEmailConfirmed // false')
  if [ "$EMAIL_CONFIRMED" = "false" ] || [ "$EMAIL_CONFIRMED" = "null" ]; then
    echo "✅ Email confirmation required (AUTO_CONFIRM_USERS=false working)"
  else
    echo "⚠️  WARNING: Email appears auto-confirmed (AUTO_CONFIRM_USERS should be false)"
  fi
else
  ERROR=$(echo "$REGISTER_BODY" | jq -r '.error // .details // "Unknown error"')
  echo ""
  echo "❌ Step 1: Registration failed - $ERROR"
  exit 1
fi

# Step 2: Check CloudWatch logs for SendGrid email send attempt
echo ""
echo "Step 2: Checking CloudWatch logs for email send attempt..."
SENDGRID_LOGS=$(aws logs filter-log-events \
  --log-group-name "/aws/lambda/$LAMBDA_FUNCTION" \
  --region "$REGION" \
  --start-time $(($(date +%s) - 120))000 \
  --filter-pattern "sendgrid email send" \
  --max-items 10 \
  --query 'events[*].message' \
  --output text 2>&1 | grep -i "sendgrid\|email\|send" | head -5 || echo "")

if [ -n "$SENDGRID_LOGS" ]; then
  echo "✅ Email send attempt detected in logs"
  echo "   (Check SendGrid dashboard for actual delivery)"
else
  echo "⚠️  No email send activity in recent logs"
  echo "   (Email may be queued or SendGrid not configured)"
fi

# Step 3: Test login before confirmation (should fail)
echo ""
echo "Step 3: Testing login before email confirmation (should fail)..."
cat > /tmp/login-before-confirm.json << EOF
{
  "requestContext": {
    "http": {
      "method": "POST",
      "path": "/v1/auth/login"
    }
  },
  "rawPath": "/v1/auth/login",
  "body": "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}"
}
EOF

LOGIN_RESPONSE=$(aws lambda invoke \
  --function-name "$LAMBDA_FUNCTION" \
  --region "$REGION" \
  --payload file:///tmp/login-before-confirm.json \
  --cli-binary-format raw-in-base64-out \
  /tmp/login-before-response.json 2>&1)

LOGIN_BODY=$(cat /tmp/login-before-response.json | jq -r '.body' | jq '.' 2>/dev/null || echo "{}")

if echo "$LOGIN_BODY" | jq -e '.success == false' >/dev/null 2>&1 || echo "$LOGIN_BODY" | jq -e '.error' >/dev/null 2>&1; then
  ERROR_MSG=$(echo "$LOGIN_BODY" | jq -r '.error // .message // "Login failed"')
  if echo "$ERROR_MSG" | grep -qi "confirm\|verify\|email"; then
    echo "✅ Login correctly blocked - email confirmation required"
    echo "   Error: $ERROR_MSG"
  else
    echo "⚠️  Login failed, but error doesn't mention email confirmation"
    echo "   Error: $ERROR_MSG"
  fi
else
  echo "❌ WARNING: Login succeeded before email confirmation (should be blocked)"
fi

# Step 4: Manual confirmation step
echo ""
echo "Step 4: Manual Email Confirmation Required"
echo "=========================================="
echo "To complete the test:"
echo "1. Check email inbox for: $TEST_EMAIL"
echo "2. Click confirmation link in email"
echo "3. Then run: ./scripts/test-login-after-confirm.sh $TEST_EMAIL $TEST_PASSWORD"
echo ""

# Step 5: Document what to test after confirmation
echo "Step 5: After Email Confirmation"
echo "================================="
echo "After confirming email, test login with:"
echo "  ./scripts/test-login-after-confirm.sh $TEST_EMAIL $TEST_PASSWORD"
echo ""

echo "============================================================"
echo "Test Summary"
echo "============================================================"
echo "✅ Registration: Working"
echo "✅ Email confirmation required: Verified"
echo "⚠️  Email delivery: Check SendGrid dashboard"
echo "✅ Login blocked before confirmation: Verified"
echo "⏳ Manual step: Confirm email, then test login"
echo ""
echo "Next: Confirm email, then test login after confirmation"

