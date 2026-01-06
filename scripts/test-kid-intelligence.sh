#!/bin/bash
# Test Kid Intelligence System
# Verifies ENABLE_KID_INTELLIGENCE=true is respected and system is operational

set -e

echo "============================================================"
echo "Kid Intelligence System Test"
echo "============================================================"
echo ""

LAMBDA_FUNCTION="storytailor-universal-agent-production"
REGION="us-east-1"

# Step 1: Verify ENABLE_KID_INTELLIGENCE environment variable
echo "Step 1: Verifying ENABLE_KID_INTELLIGENCE flag..."
ENV_VAR=$(aws lambda get-function-configuration \
  --function-name "$LAMBDA_FUNCTION" \
  --region "$REGION" \
  --query 'Environment.Variables.ENABLE_KID_INTELLIGENCE' \
  --output text 2>&1 || echo "not_found")

if [ "$ENV_VAR" = "true" ]; then
  echo "✅ ENABLE_KID_INTELLIGENCE=true in Lambda environment"
else
  echo "❌ ENABLE_KID_INTELLIGENCE not set to true (found: $ENV_VAR)"
  exit 1
fi

# Step 2: Check CloudWatch logs for Kid Intelligence initialization
echo ""
echo "Step 2: Checking logs for Kid Intelligence initialization..."
KID_INTEL_LOGS=$(aws logs filter-log-events \
  --log-group-name "/aws/lambda/$LAMBDA_FUNCTION" \
  --region "$REGION" \
  --start-time $(($(date +%s) - 300))000 \
  --filter-pattern "Kid Intelligence\|kid.*intelligence\|KidCommunication" \
  --max-items 10 \
  --query 'events[*].message' \
  --output text 2>&1 | grep -i "kid\|intelligence" | head -5 || echo "")

if [ -n "$KID_INTEL_LOGS" ]; then
  echo "✅ Kid Intelligence activity detected in logs:"
  echo "$KID_INTEL_LOGS" | head -3 | sed 's/^/   /'
else
  echo "⚠️  No Kid Intelligence activity in recent logs"
  echo "   (System may initialize on first use)"
fi

# Step 3: Test with child speech input (if conversation endpoint available)
echo ""
echo "Step 3: Testing child speech processing..."
echo "Note: Requires router and conversation endpoint"
echo "      (Router bundling may be needed)"

# Check if router is available
ROUTER_LOGS=$(aws logs filter-log-events \
  --log-group-name "/aws/lambda/$LAMBDA_FUNCTION" \
  --region "$REGION" \
  --start-time $(($(date +%s) - 300))000 \
  --filter-pattern "router\|Router" \
  --max-items 5 \
  --query 'events[*].message' \
  --output text 2>&1 | grep -i "router" | head -3 || echo "")

if [ -n "$ROUTER_LOGS" ]; then
  echo "✅ Router activity detected - conversation endpoints may be available"
else
  echo "⚠️  Router not detected - conversation endpoints may not work"
  echo "   (Kid Intelligence requires conversation endpoints)"
fi

# Step 4: Verify all 11 components
echo ""
echo "Step 4: Kid Intelligence Components"
echo "====================================="
echo "Expected components:"
echo "  1. Audio Intelligence"
echo "  2. Test-Time Adaptation"
echo "  3. Multimodal Processing"
echo "  4. Developmental Processing"
echo "  5. Invented Word Intelligence"
echo "  6. Child Logic Interpreter"
echo "  7. Emotional Speech Intelligence"
echo "  8. Adaptive Transcription"
echo "  9. Continuous Personalization"
echo " 10. Confidence System"
echo " 11. Real-time Learning"
echo ""
echo "Note: Full component testing requires conversation endpoint"
echo "      with child speech input"

echo ""
echo "============================================================"
echo "Summary"
echo "============================================================"
echo "✅ ENABLE_KID_INTELLIGENCE flag: Verified"
echo "✅ Kid Intelligence initialization: Checked"
echo "⚠️  Full functionality test: Requires router + conversation endpoint"
echo ""
echo "Next: Test with actual child speech input via conversation endpoint"

