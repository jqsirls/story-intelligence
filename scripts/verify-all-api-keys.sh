#!/bin/bash
# Comprehensive API Key Verification Script
# Ensures ALL API keys are present, valid, and configured correctly

set +e

PREFIX="/storytailor-production"
LAMBDA_NAME="storytailor-universal-agent-production"
FAILED=0
PASSED=0

echo "=== Comprehensive API Key Verification ==="
echo ""

# Function to check SSM parameter
check_ssm_key() {
    local name=$1
    local description=$2
    local value=$(aws ssm get-parameter --name "$name" --with-decryption --query 'Parameter.Value' --output text 2>/dev/null)
    if [ -n "$value" ] && [ "$value" != "None" ] && [ ${#value} -gt 5 ]; then
        echo "   ✅ SSM: $description found (${#value} chars)"
        echo "$value"
        return 0
    else
        echo "   ❌ SSM: $description NOT FOUND at $name"
        return 1
    fi
}

# Function to check Lambda env var
check_lambda_key() {
    local env_var=$1
    local description=$2
    local value=$(aws lambda get-function-configuration --function-name "$LAMBDA_NAME" --query "Environment.Variables.$env_var" --output text 2>/dev/null)
    if [ -n "$value" ] && [ "$value" != "None" ] && [ ${#value} -gt 5 ]; then
        echo "   ✅ Lambda: $description configured (${#value} chars)"
        return 0
    else
        echo "   ❌ Lambda: $description NOT CONFIGURED"
        return 1
    fi
}

# Function to test API key
test_api_key() {
    local name=$1
    local test_cmd=$2
    if eval "$test_cmd" > /dev/null 2>&1; then
        echo "   ✅ Test: $name API key is valid and working"
        return 0
    else
        echo "   ⚠️  Test: $name API key test failed (may still work)"
        return 1
    fi
}

echo "1. Checking Supabase Configuration..."
SUPABASE_URL=$(check_ssm_key "${PREFIX}/supabase/url" "Supabase URL" || check_ssm_key "${PREFIX}/supabase-url" "Supabase URL")
SUPABASE_SERVICE_KEY=$(check_ssm_key "${PREFIX}/supabase/service-key" "Supabase Service Key" || check_ssm_key "${PREFIX}/supabase-service-key" "Supabase Service Key")
SUPABASE_ANON_KEY=$(check_ssm_key "${PREFIX}/supabase/anon-key" "Supabase Anon Key" || check_ssm_key "${PREFIX}/supabase-anon-key" "Supabase Anon Key")
if [ -n "$SUPABASE_URL" ] && [ -n "$SUPABASE_SERVICE_KEY" ] && [ -n "$SUPABASE_ANON_KEY" ]; then
    check_lambda_key "SUPABASE_URL" "Supabase URL" && ((PASSED++)) || ((FAILED++))
    check_lambda_key "SUPABASE_SERVICE_ROLE_KEY" "Supabase Service Key" && ((PASSED++)) || ((FAILED++))
    check_lambda_key "SUPABASE_ANON_KEY" "Supabase Anon Key" && ((PASSED++)) || ((FAILED++))
else
    ((FAILED+=3))
fi
echo ""

echo "2. Checking Redis Configuration..."
REDIS_URL=$(check_ssm_key "${PREFIX}/redis-url" "Redis URL" || check_ssm_key "${PREFIX}/redis/url" "Redis URL")
if [ -n "$REDIS_URL" ]; then
    check_lambda_key "REDIS_URL" "Redis URL" && ((PASSED++)) || ((FAILED++))
else
    ((FAILED++))
fi
echo ""

echo "3. Checking OpenAI Configuration..."
OPENAI_KEY=$(check_ssm_key "${PREFIX}/openai/api-key" "OpenAI API Key" || check_ssm_key "${PREFIX}/openai-api-key" "OpenAI API Key")
if [ -n "$OPENAI_KEY" ]; then
    check_lambda_key "OPENAI_API_KEY" "OpenAI API Key" && ((PASSED++)) || ((FAILED++))
    test_api_key "OpenAI" "curl -s -H \"Authorization: Bearer $OPENAI_KEY\" https://api.openai.com/v1/models | grep -q 'data'" && ((PASSED++)) || ((FAILED++))
else
    ((FAILED+=2))
fi
echo ""

echo "4. Checking ElevenLabs Configuration..."
ELEVENLABS_KEY=$(check_ssm_key "${PREFIX}/tts/elevenlabs/api-key" "ElevenLabs API Key" || check_ssm_key "${PREFIX}/elevenlabs/api-key" "ElevenLabs API Key" || check_ssm_key "${PREFIX}/elevenlabs-api-key" "ElevenLabs API Key")
if [ -n "$ELEVENLABS_KEY" ]; then
    check_lambda_key "ELEVENLABS_API_KEY" "ElevenLabs API Key" && ((PASSED++)) || ((FAILED++))
    test_api_key "ElevenLabs" "curl -s -H \"xi-api-key: $ELEVENLABS_KEY\" https://api.elevenlabs.io/v1/user | grep -q 'subscription'" && ((PASSED++)) || ((FAILED++))
else
    ((FAILED+=2))
fi
echo ""

echo "5. Checking SendGrid Configuration..."
SENDGRID_KEY=$(check_ssm_key "${PREFIX}/sendgrid-api-key" "SendGrid API Key" || check_ssm_key "${PREFIX}/sendgrid/api-key" "SendGrid API Key" || check_ssm_key "${PREFIX}/email/sendgrid_api_key" "SendGrid API Key")
if [ -n "$SENDGRID_KEY" ]; then
    check_lambda_key "SENDGRID_API_KEY" "SendGrid API Key" && ((PASSED++)) || ((FAILED++))
    test_api_key "SendGrid" "curl -s -H \"Authorization: Bearer $SENDGRID_KEY\" https://api.sendgrid.com/v3/user/profile | grep -q 'username\|email'" && ((PASSED++)) || ((FAILED++))
else
    ((FAILED+=2))
fi
echo ""

echo "6. Checking Email Configuration..."
EMAIL_FROM=$(check_ssm_key "${PREFIX}/email-from" "Email From" || check_ssm_key "${PREFIX}/email/sender" "Email From")
if [ -n "$EMAIL_FROM" ]; then
    check_lambda_key "EMAIL_FROM" "Email From" && ((PASSED++)) || ((FAILED++))
else
    ((FAILED++))
fi
echo ""

echo "7. Checking Stripe Configuration..."
STRIPE_KEY=$(check_ssm_key "${PREFIX}/stripe-secret-key" "Stripe Secret Key" || check_ssm_key "${PREFIX}/stripe/secret-key" "Stripe Secret Key")
if [ -n "$STRIPE_KEY" ]; then
    echo "   ✅ SSM: Stripe Secret Key found"
    # Stripe key format validation
    if [[ "$STRIPE_KEY" =~ ^sk_(live|test)_ ]]; then
        echo "   ✅ Format: Stripe key format valid"
        ((PASSED++))
    else
        echo "   ⚠️  Format: Stripe key format may be invalid"
    fi
else
    echo "   ⚠️  SSM: Stripe Secret Key not found (may be optional)"
fi
echo ""

echo "8. Checking EventBridge Configuration..."
EVENT_BUS=$(aws events describe-event-bus --name "default" --region us-east-1 --query 'Name' --output text 2>/dev/null || echo "")
if [ -n "$EVENT_BUS" ]; then
    echo "   ✅ EventBridge: Default event bus exists"
    ((PASSED++))
else
    echo "   ⚠️  EventBridge: Default event bus not found"
    ((FAILED++))
fi
echo ""

echo "=== Summary ==="
echo "✅ PASSED: $PASSED"
echo "❌ FAILED: $FAILED"
echo ""

if [ $FAILED -eq 0 ]; then
    echo "🎉 ALL API KEYS VERIFIED AND CONFIGURED"
    exit 0
else
    echo "❌ SOME API KEYS MISSING OR MISCONFIGURED"
    exit 1
fi
