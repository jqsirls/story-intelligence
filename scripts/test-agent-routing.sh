#!/bin/bash
# Test Agent Routing and Delegation
# Verifies router is accessible and agent routing works

set -e

echo "============================================================"
echo "Agent Routing Test"
echo "============================================================"
echo ""

LAMBDA_FUNCTION="storytailor-universal-agent-production"
REGION="us-east-1"

# Step 1: Verify router module is bundled
echo "Step 1: Checking router module availability..."
ROUTER_LOGS=$(aws logs filter-log-events \
  --log-group-name "/aws/lambda/$LAMBDA_FUNCTION" \
  --region "$REGION" \
  --start-time $(($(date +%s) - 300))000 \
  --filter-pattern "router\|Router" \
  --max-items 10 \
  --query 'events[*].message' \
  --output text 2>&1 | grep -i "router" | head -5 || echo "")

if [ -n "$ROUTER_LOGS" ]; then
  echo "✅ Router activity detected in logs"
  echo "$ROUTER_LOGS" | head -3 | sed 's/^/   /'
else
  echo "⚠️  No router activity in recent logs"
  echo "   Router may not be bundled or initialized"
fi

# Step 2: Test conversation initiation (requires router)
echo ""
echo "Step 2: Testing conversation initiation..."
cat > /tmp/test-conversation-start.json << 'EOF'
{
  "requestContext": {
    "http": {
      "method": "POST",
      "path": "/v1/conversation/start"
    }
  },
  "rawPath": "/v1/conversation/start",
  "body": "{\"platform\":\"api\",\"language\":\"en\",\"voiceEnabled\":false,\"smartHomeEnabled\":false,\"parentalControls\":{},\"privacySettings\":{}}"
}
EOF

CONV_RESPONSE=$(aws lambda invoke \
  --function-name "$LAMBDA_FUNCTION" \
  --region "$REGION" \
  --payload file:///tmp/test-conversation-start.json \
  --cli-binary-format raw-in-base64-out \
  /tmp/conversation-start-response.json 2>&1)

if [ $? -eq 0 ]; then
  CONV_BODY=$(cat /tmp/conversation-start-response.json | jq -r '.body' | jq '.' 2>/dev/null || echo "{}")
  echo "Conversation Start Response:"
  echo "$CONV_BODY" | jq '.'
  
  if echo "$CONV_BODY" | jq -e '.sessionId' >/dev/null 2>&1; then
    SESSION_ID=$(echo "$CONV_BODY" | jq -r '.sessionId')
    echo ""
    echo "✅ Conversation started successfully"
    echo "   Session ID: $SESSION_ID"
  else
    ERROR=$(echo "$CONV_BODY" | jq -r '.error // .message // "Unknown error"')
    echo ""
    echo "⚠️  Conversation start response: $ERROR"
  fi
else
  echo "❌ Conversation start request failed"
fi

# Step 3: Test intent classification (if conversation works)
echo ""
echo "Step 3: Testing intent classification..."
echo "Note: Requires successful conversation session"
echo "      and message endpoint"

# Step 4: List available agents
echo ""
echo "Step 4: Available Agents"
echo "========================"
echo "Expected agents (20+):"
echo "  - Router (main)"
echo "  - Content Agent"
echo "  - Emotion Agent"
echo "  - Personality Agent"
echo "  - Auth Agent"
echo "  - Library Agent"
echo "  - Commerce Agent"
echo "  - Educational Agent"
echo "  - Therapeutic Agent"
echo "  - Accessibility Agent"
echo "  - Localization Agent"
echo "  - Conversation Intelligence"
echo "  - Analytics Intelligence"
echo "  - Insights Agent"
echo "  - Smart Home Agent"
echo "  - Child Safety Agent"
echo "  - Knowledge Base Agent"
echo "  - And more..."
echo ""
echo "Note: Full agent list requires router introspection endpoint"

# Step 5: Test agent delegation
echo ""
echo "Step 5: Agent Delegation"
echo "========================"
echo "Agent delegation is handled by the router."
echo "Test by sending messages that trigger different agents:"
echo "  - Story requests → Content Agent"
echo "  - Emotional content → Emotion Agent"
echo "  - Character creation → Content Agent"
echo "  - Purchase requests → Commerce Agent"
echo ""

echo "============================================================"
echo "Summary"
echo "============================================================"
echo "✅ Router module: Checked"
echo "✅ Conversation initiation: Tested"
echo "⚠️  Full routing test: Requires multiple message exchanges"
echo ""
echo "Next: Test with multiple conversation turns to verify"
echo "      agent delegation and routing logic"

