#!/bin/bash
# Comprehensive API Key Verification for ALL Agents
# Verifies keys for Universal Agent AND all other agents

set +e

PREFIX="/storytailor-production"
FAILED=0
PASSED=0

echo "=== Comprehensive API Key Verification (All Agents) ==="
echo ""

# Universal Agent Keys (must be in Lambda env vars)
echo "=== Universal Agent API Keys ==="
LAMBDA_NAME="storytailor-universal-agent-production"
for key in "SUPABASE_URL" "SUPABASE_SERVICE_ROLE_KEY" "SUPABASE_ANON_KEY" "REDIS_URL" "OPENAI_API_KEY" "ELEVENLABS_API_KEY" "SENDGRID_API_KEY" "EMAIL_FROM"; do
    value=$(aws lambda get-function-configuration --function-name "$LAMBDA_NAME" --query "Environment.Variables.$key" --output text 2>/dev/null)
    if [ -n "$value" ] && [ "$value" != "None" ] && [ ${#value} -gt 5 ]; then
        echo "   ✅ $key: Configured (${#value} chars)"
        ((PASSED++))
    else
        echo "   ❌ $key: NOT CONFIGURED"
        ((FAILED++))
    fi
done
echo ""

# Other Agent Keys (must exist in SSM)
echo "=== Other Agents API Keys (SSM Only) ==="

# Content Agent
echo "Content Agent:"
STABILITY_KEY=$(aws ssm get-parameter --name "${PREFIX}/stability/api-key" --with-decryption --query 'Parameter.Value' --output text 2>/dev/null)
if [ -n "$STABILITY_KEY" ] && [ "$STABILITY_KEY" != "None" ]; then
    echo "   ✅ Stability AI: Found (${#STABILITY_KEY} chars)"
    ((PASSED++))
else
    echo "   ❌ Stability AI: NOT FOUND"
    ((FAILED++))
fi

# Avatar Agent
echo "Avatar Agent:"
HEDRA_KEY=$(aws ssm get-parameter --name "${PREFIX}/hedra/api-key" --with-decryption --query 'Parameter.Value' --output text 2>/dev/null)
LIVEKIT_KEY=$(aws ssm get-parameter --name "${PREFIX}/livekit/api-key" --with-decryption --query 'Parameter.Value' --output text 2>/dev/null)
LIVEKIT_SECRET=$(aws ssm get-parameter --name "${PREFIX}/livekit/api-secret" --with-decryption --query 'Parameter.Value' --output text 2>/dev/null)
LIVEKIT_URL=$(aws ssm get-parameter --name "${PREFIX}/livekit/url" --query 'Parameter.Value' --output text 2>/dev/null)
if [ -n "$HEDRA_KEY" ] && [ "$HEDRA_KEY" != "None" ]; then
    echo "   ✅ Hedra: Found (${#HEDRA_KEY} chars)"
    ((PASSED++))
else
    echo "   ❌ Hedra: NOT FOUND"
    ((FAILED++))
fi
if [ -n "$LIVEKIT_KEY" ] && [ "$LIVEKIT_KEY" != "None" ]; then
    echo "   ✅ LiveKit API Key: Found (${#LIVEKIT_KEY} chars)"
    ((PASSED++))
else
    echo "   ❌ LiveKit API Key: NOT FOUND"
    ((FAILED++))
fi
if [ -n "$LIVEKIT_SECRET" ] && [ "$LIVEKIT_SECRET" != "None" ]; then
    echo "   ✅ LiveKit API Secret: Found (${#LIVEKIT_SECRET} chars)"
    ((PASSED++))
else
    echo "   ❌ LiveKit API Secret: NOT FOUND"
    ((FAILED++))
fi
if [ -n "$LIVEKIT_URL" ] && [ "$LIVEKIT_URL" != "None" ]; then
    echo "   ✅ LiveKit URL: Found"
    ((PASSED++))
else
    echo "   ❌ LiveKit URL: NOT FOUND"
    ((FAILED++))
fi

# Smart Home Agent
echo "Smart Home Agent:"
HUE_CLIENT_ID=$(aws ssm get-parameter --name "${PREFIX}/hue/client-id" --with-decryption --query 'Parameter.Value' --output text 2>/dev/null)
HUE_CLIENT_SECRET=$(aws ssm get-parameter --name "${PREFIX}/hue/client-secret" --with-decryption --query 'Parameter.Value' --output text 2>/dev/null)
HUE_OAUTH_CLIENT_ID=$(aws ssm get-parameter --name "${PREFIX}/hue/oauth/client-id" --query 'Parameter.Value' --output text 2>/dev/null)
HUE_OAUTH_CLIENT_SECRET=$(aws ssm get-parameter --name "${PREFIX}/hue/oauth/client-secret" --with-decryption --query 'Parameter.Value' --output text 2>/dev/null)
if [ -n "$HUE_CLIENT_ID" ] && [ "$HUE_CLIENT_ID" != "None" ]; then
    echo "   ✅ Hue Client ID: Found"
    ((PASSED++))
else
    echo "   ⚠️  Hue Client ID: Not found (may use OAuth)"
fi
if [ -n "$HUE_CLIENT_SECRET" ] && [ "$HUE_CLIENT_SECRET" != "None" ]; then
    echo "   ✅ Hue Client Secret: Found"
    ((PASSED++))
else
    echo "   ⚠️  Hue Client Secret: Not found (may use OAuth)"
fi
if [ -n "$HUE_OAUTH_CLIENT_ID" ] && [ "$HUE_OAUTH_CLIENT_ID" != "None" ]; then
    echo "   ✅ Hue OAuth Client ID: Found"
    ((PASSED++))
else
    echo "   ⚠️  Hue OAuth Client ID: Not found"
fi
if [ -n "$HUE_OAUTH_CLIENT_SECRET" ] && [ "$HUE_OAUTH_CLIENT_SECRET" != "None" ]; then
    echo "   ✅ Hue OAuth Client Secret: Found"
    ((PASSED++))
else
    echo "   ⚠️  Hue OAuth Client Secret: Not found"
fi

# Commerce Agent
echo "Commerce Agent:"
STRIPE_KEY=$(aws ssm get-parameter --name "${PREFIX}/stripe-secret-key" --with-decryption --query 'Parameter.Value' --output text 2>/dev/null || \
             aws ssm get-parameter --name "${PREFIX}/stripe/secret-key" --with-decryption --query 'Parameter.Value' --output text 2>/dev/null || echo "")
if [ -n "$STRIPE_KEY" ] && [ "$STRIPE_KEY" != "None" ]; then
    echo "   ✅ Stripe Secret Key: Found (${#STRIPE_KEY} chars)"
    ((PASSED++))
else
    echo "   ⚠️  Stripe Secret Key: Not found (may be optional)"
fi

# Unknown/Other
echo "Other Services:"
FIELDNOTES_KEY=$(aws ssm get-parameter --name "${PREFIX}/fieldnotes/api-key" --with-decryption --query 'Parameter.Value' --output text 2>/dev/null)
if [ -n "$FIELDNOTES_KEY" ] && [ "$FIELDNOTES_KEY" != "None" ]; then
    echo "   ✅ Fieldnotes API Key: Found (${#FIELDNOTES_KEY} chars)"
    ((PASSED++))
else
    echo "   ⚠️  Fieldnotes API Key: Not found (unknown service)"
fi

echo ""
echo "=== Summary ==="
echo "✅ PASSED: $PASSED"
echo "❌ FAILED: $FAILED"
echo ""

if [ $FAILED -eq 0 ]; then
    echo "🎉 ALL API KEYS VERIFIED"
    exit 0
else
    echo "⚠️  SOME API KEYS MISSING (check warnings above)"
    exit 1
fi
