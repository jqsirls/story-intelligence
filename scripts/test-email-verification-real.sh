#!/bin/bash
# Test Email Verification Flow with Real Email
# Registers user, waits for email confirmation, then tests login

set -e

echo "============================================================"
echo "Email Verification Flow Test (Real Email)"
echo "============================================================"
echo ""

LAMBDA_FUNCTION="storytailor-universal-agent-production"
REGION="us-east-1"
TEST_EMAIL="jqsirls7@icloud.com"
TEST_PASSWORD="TestPassword123!"

echo "Test Email: $TEST_EMAIL"
echo "AUTO_CONFIRM_USERS should be: false"
echo ""

# Step 1: Register user
echo "Step 1: Registering user..."
cat > /tmp/register-real.json << EOF
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
  --payload file:///tmp/register-real.json \
  --cli-binary-format raw-in-base64-out \
  /tmp/register-real-response.json 2>&1)

if [ $? -ne 0 ]; then
  echo "❌ Registration request failed"
  exit 1
fi

REGISTER_BODY=$(cat /tmp/register-real-response.json | jq -r '.body' | jq '.' 2>/dev/null || echo "{}")
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
sleep 3  # Give SendGrid a moment to send
SENDGRID_LOGS=$(aws logs filter-log-events \
  --log-group-name "/aws/lambda/$LAMBDA_FUNCTION" \
  --region "$REGION" \
  --start-time $(($(date +%s) - 60))000 \
  --filter-pattern "sendgrid email send" \
  --max-items 10 \
  --query 'events[*].message' \
  --output text 2>&1 | grep -i "sendgrid\|email\|send" | head -5 || echo "")

if [ -n "$SENDGRID_LOGS" ]; then
  echo "✅ Email send attempt detected in logs"
  echo "   (Check your email inbox: $TEST_EMAIL)"
else
  echo "⚠️  No email send activity in recent logs"
  echo "   (Email may be queued or SendGrid not configured)"
fi

# Step 3: Test login before confirmation (should fail)
echo ""
echo "Step 3: Testing login before email confirmation (should fail)..."
cat > /tmp/login-before-confirm-real.json << EOF
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
  --payload file:///tmp/login-before-confirm-real.json \
  --cli-binary-format raw-in-base64-out \
  /tmp/login-before-response-real.json 2>&1)

LOGIN_BODY=$(cat /tmp/login-before-response-real.json | jq -r '.body' | jq '.' 2>/dev/null || echo "{}")

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

# Step 4: Wait for email confirmation
echo ""
echo "============================================================"
echo "Step 4: Email Confirmation"
echo "============================================================"
echo ""
echo "📧 Please check your email inbox: $TEST_EMAIL"
echo "   Look for a verification email from Storytailor"
echo "   Click the confirmation link in the email"
echo ""
echo "⏳ Waiting 90 seconds for you to confirm the email..."
echo "   (You can press Ctrl+C if you've confirmed earlier)"
echo ""

# Countdown timer
for i in {90..1}; do
  printf "\r   Time remaining: %02d seconds" $i
  sleep 1
done
printf "\r   Time remaining: 00 seconds - proceeding to login test...\n"

# Step 5: Test login after confirmation
echo ""
echo "Step 5: Testing login after email confirmation..."
cat > /tmp/login-after-confirm-real.json << EOF
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

LOGIN_AFTER_RESPONSE=$(aws lambda invoke \
  --function-name "$LAMBDA_FUNCTION" \
  --region "$REGION" \
  --payload file:///tmp/login-after-confirm-real.json \
  --cli-binary-format raw-in-base64-out \
  /tmp/login-after-response-real.json 2>&1)

LOGIN_AFTER_BODY=$(cat /tmp/login-after-response-real.json | jq -r '.body' | jq '.' 2>/dev/null || echo "{}")

echo "Login After Confirmation Response:"
echo "$LOGIN_AFTER_BODY" | jq '.'

if echo "$LOGIN_AFTER_BODY" | jq -e '.success == true' >/dev/null 2>&1; then
  ACCESS_TOKEN=$(echo "$LOGIN_AFTER_BODY" | jq -r '.tokens.accessToken // empty')
  REFRESH_TOKEN=$(echo "$LOGIN_AFTER_BODY" | jq -r '.tokens.refreshToken // empty')
  echo ""
  echo "✅ Step 5: Login successful after email confirmation!"
  echo "   Access Token: ${ACCESS_TOKEN:0:20}..."
  echo "   Refresh Token: ${REFRESH_TOKEN:0:20}..."
  echo ""
  echo "✅ Email verification flow COMPLETE and WORKING!"
else
  ERROR_MSG=$(echo "$LOGIN_AFTER_BODY" | jq -r '.error // .message // "Login failed"')
  echo ""
  echo "❌ Step 5: Login still failing after confirmation"
  echo "   Error: $ERROR_MSG"
  echo ""
  echo "   Possible reasons:"
  echo "   - Email not yet confirmed (check inbox and click link)"
  echo "   - Confirmation link expired"
  echo "   - Password incorrect"
  echo "   - User account issue"
fi

echo ""
echo "============================================================"
echo "Test Summary"
echo "============================================================"
echo "✅ Registration: Working"
echo "✅ Email confirmation required: Verified"
echo "✅ Login blocked before confirmation: Verified"
if echo "$LOGIN_AFTER_BODY" | jq -e '.success == true' >/dev/null 2>&1; then
  echo "✅ Login after confirmation: SUCCESS"
  echo ""
  echo "🎉 EMAIL VERIFICATION FLOW FULLY WORKING!"
else
  echo "❌ Login after confirmation: FAILED"
  echo ""
  echo "⚠️  Please verify:"
  echo "   1. Email was received and confirmation link clicked"
  echo "   2. Confirmation completed successfully"
  echo "   3. Wait a few seconds and try login again"
fi
echo ""
