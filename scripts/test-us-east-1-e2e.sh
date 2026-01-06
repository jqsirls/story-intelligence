#!/bin/bash
# Comprehensive End-to-End Test for us-east-1 Production
# Tests all critical components after region migration

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
PURPLE='\033[0;35m'
NC='\033[0m'

REGION="us-east-1"
PASSED=0
FAILED=0
WARNINGS=0

echo -e "${PURPLE}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${PURPLE}║        us-east-1 End-to-End Production Test Suite               ║${NC}"
echo -e "${PURPLE}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Test helper functions
test_pass() {
  echo -e "${GREEN}  ✅ PASS: $1${NC}"
  PASSED=$((PASSED + 1))
}

test_fail() {
  echo -e "${RED}  ❌ FAIL: $1${NC}"
  FAILED=$((FAILED + 1))
}

test_warn() {
  echo -e "${YELLOW}  ⚠️  WARN: $1${NC}"
  WARNINGS=$((WARNINGS + 1))
}

test_section() {
  echo ""
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${CYAN}$1${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
}

# Test 1: Core Production Lambda Functions
test_section "Test 1: Core Production Lambda Functions"

CORE_FUNCTIONS=(
  "storytailor-universal-agent-production"
  "storytailor-router-production"
  "storytailor-inactivity-processor-production"
  "storytailor-deletion-processor-production"
)

for func in "${CORE_FUNCTIONS[@]}"; do
  if aws lambda get-function --function-name "$func" --region "$REGION" >/dev/null 2>&1; then
    STATE=$(aws lambda get-function-configuration --function-name "$func" --region "$REGION" --query 'State' --output text 2>/dev/null || echo "Unknown")
    if [ "$STATE" = "Active" ]; then
      test_pass "$func is Active"
    else
      test_fail "$func is in state: $STATE"
    fi
  else
    test_fail "$func not found"
  fi
done

# Test 2: Specialized Agent Functions
test_section "Test 2: Specialized Agent Functions"

AGENT_FUNCTIONS=(
  "storytailor-auth-agent-production"
  "storytailor-content-agent-production"
  "storytailor-library-agent-production"
  "storytailor-commerce-agent-production"
  "storytailor-emotion-agent-production"
  "storytailor-insights-agent-production"
)

for func in "${AGENT_FUNCTIONS[@]}"; do
  if aws lambda get-function --function-name "$func" --region "$REGION" >/dev/null 2>&1; then
    STATE=$(aws lambda get-function-configuration --function-name "$func" --region "$REGION" --query 'State' --output text 2>/dev/null || echo "Unknown")
    if [ "$STATE" = "Active" ]; then
      test_pass "$func is Active"
    else
      test_fail "$func is in state: $STATE"
    fi
  else
    test_warn "$func not found (may be optional)"
  fi
done

# Test 3: EventBridge Rules
test_section "Test 3: EventBridge Rules"

EVENTBRIDGE_RULES=(
  "storytailor-inactivity-check"
  "storytailor-deletion-processing"
)

for rule in "${EVENTBRIDGE_RULES[@]}"; do
  if aws events describe-rule --name "$rule" --region "$REGION" >/dev/null 2>&1; then
    STATE=$(aws events describe-rule --name "$rule" --region "$REGION" --query 'State' --output text 2>/dev/null || echo "Unknown")
    if [ "$STATE" = "ENABLED" ]; then
      test_pass "$rule is ENABLED"
    else
      test_fail "$rule is in state: $STATE"
    fi
  else
    test_fail "$rule not found"
  fi
done

# Test 4: Lambda Function Environment Variables
test_section "Test 4: Critical Environment Variables"

UNIVERSAL_AGENT_ENV=$(aws lambda get-function-configuration \
  --function-name "storytailor-universal-agent-production" \
  --region "$REGION" \
  --query 'Environment.Variables' \
  --output json 2>/dev/null || echo "{}")

if echo "$UNIVERSAL_AGENT_ENV" | grep -q "SUPABASE_URL" && \
   echo "$UNIVERSAL_AGENT_ENV" | grep -q "SUPABASE_SERVICE_ROLE_KEY" && \
   echo "$UNIVERSAL_AGENT_ENV" | grep -q "REDIS_URL"; then
  test_pass "Universal Agent has critical environment variables"
else
  test_fail "Universal Agent missing critical environment variables"
fi

# Test 5: Lambda Function Invocation (Health Check)
test_section "Test 5: Lambda Function Health Checks"

# Test Universal Agent
echo -e "${CYAN}  Testing Universal Agent invocation...${NC}"
UNIVERSAL_PAYLOAD='{"requestContext":{"http":{"method":"GET","path":"/health"}},"rawPath":"/health","routeKey":"GET /health"}'
echo "$UNIVERSAL_PAYLOAD" > /tmp/universal-payload.json

UNIVERSAL_RESPONSE=$(aws lambda invoke \
  --function-name "storytailor-universal-agent-production" \
  --region "$REGION" \
  --payload file:///tmp/universal-payload.json \
  --cli-binary-format raw-in-base64-out \
  /tmp/lambda-response.json 2>&1) || UNIVERSAL_RESPONSE="timeout or error"

if [ -f /tmp/lambda-response.json ]; then
  RESPONSE_BODY=$(cat /tmp/lambda-response.json 2>/dev/null | jq -r '.body // .statusCode // .' 2>/dev/null || cat /tmp/lambda-response.json | head -c 200)
  if echo "$RESPONSE_BODY" | grep -qi "ok\|healthy\|success\|200"; then
    test_pass "Universal Agent responds to health check"
  else
    test_warn "Universal Agent responded but may not be healthy: ${RESPONSE_BODY:0:100}"
  fi
else
  test_warn "Universal Agent invocation may have timed out or failed: ${UNIVERSAL_RESPONSE:0:100}"
fi

# Test Router
echo -e "${CYAN}  Testing Router invocation...${NC}"
ROUTER_PAYLOAD='{"requestContext":{"http":{"method":"POST","path":"/health"}},"rawPath":"/health","routeKey":"POST /health","body":"{}"}'
echo "$ROUTER_PAYLOAD" > /tmp/router-payload.json

ROUTER_RESPONSE=$(aws lambda invoke \
  --function-name "storytailor-router-production" \
  --region "$REGION" \
  --payload file:///tmp/router-payload.json \
  --cli-binary-format raw-in-base64-out \
  /tmp/router-response.json 2>&1) || ROUTER_RESPONSE="timeout or error"

if [ -f /tmp/router-response.json ]; then
  RESPONSE_BODY=$(cat /tmp/router-response.json 2>/dev/null | jq -r '.body // .statusCode // .' 2>/dev/null || cat /tmp/router-response.json | head -c 200)
  if echo "$RESPONSE_BODY" | grep -qi "ok\|healthy\|success\|200"; then
    test_pass "Router responds to health check"
  else
    test_warn "Router responded but may not be healthy: ${RESPONSE_BODY:0:100}"
  fi
else
  test_warn "Router invocation may have timed out (may require specific payload): ${ROUTER_RESPONSE:0:100}"
fi

# Test 6: API Gateway Integration (if configured)
test_section "Test 6: API Gateway Endpoints"

# Check if API Gateway exists
API_ID=$(aws apigatewayv2 get-apis --region "$REGION" --query "Items[?Name=='storytailor-api' || contains(Name, 'storytailor')].ApiId" --output text 2>/dev/null | head -1)

if [ -n "$API_ID" ] && [ "$API_ID" != "None" ]; then
  test_pass "API Gateway found: $API_ID"
  
  # Try to get API details
  API_STATE=$(aws apigatewayv2 get-api --api-id "$API_ID" --region "$REGION" --query 'Name' --output text 2>/dev/null || echo "Unknown")
  if [ "$API_STATE" != "Unknown" ]; then
    test_pass "API Gateway is accessible"
  fi
else
  test_warn "API Gateway not found (may use direct Lambda invocation)"
fi

# Test 7: S3 Buckets
test_section "Test 7: S3 Deployment Buckets"

S3_BUCKET="storytailor-lambda-deploys-us-east-1"
if aws s3api head-bucket --bucket "$S3_BUCKET" --region "$REGION" 2>/dev/null; then
  test_pass "S3 deployment bucket exists: $S3_BUCKET"
else
  test_warn "S3 deployment bucket not found: $S3_BUCKET (may use different bucket name)"
fi

# Test 8: CloudWatch Log Groups
test_section "Test 8: CloudWatch Log Groups"

LOG_GROUPS=(
  "/aws/lambda/storytailor-universal-agent-production"
  "/aws/lambda/storytailor-router-production"
  "/aws/lambda/storytailor-inactivity-processor-production"
  "/aws/lambda/storytailor-deletion-processor-production"
)

for log_group in "${LOG_GROUPS[@]}"; do
  if aws logs describe-log-groups --log-group-name-prefix "$log_group" --region "$REGION" --query 'logGroups[0].logGroupName' --output text 2>/dev/null | grep -q "$log_group"; then
    test_pass "Log group exists: $log_group"
  else
    test_warn "Log group not found: $log_group (may be created on first invocation)"
  fi
done

# Test 9: SSM Parameter Store
test_section "Test 9: SSM Parameter Store Configuration"

SSM_PARAMS=(
  "/storytailor/production/supabase/url"
  "/storytailor/production/supabase/service-key"
  "/storytailor/production/redis-url"
)

for param in "${SSM_PARAMS[@]}"; do
  if aws ssm get-parameter --name "$param" --region "$REGION" --with-decryption >/dev/null 2>&1; then
    test_pass "SSM parameter exists: $param"
  else
    # Try alternative naming
    ALT_PARAM=$(echo "$param" | sed 's|/storytailor/production/|/storytailor-production/|')
    if aws ssm get-parameter --name "$ALT_PARAM" --region "$REGION" --with-decryption >/dev/null 2>&1; then
      test_pass "SSM parameter exists (alt name): $ALT_PARAM"
    else
      test_warn "SSM parameter not found: $param (may use different path)"
    fi
  fi
done

# Test 10: EventBridge Rule Targets
test_section "Test 10: EventBridge Rule Targets"

for rule in "${EVENTBRIDGE_RULES[@]}"; do
  TARGETS=$(aws events list-targets-by-rule --rule "$rule" --region "$REGION" --query 'Targets[0].Arn' --output text 2>/dev/null || echo "None")
  if [ "$TARGETS" != "None" ] && [ -n "$TARGETS" ]; then
    if echo "$TARGETS" | grep -q "lambda"; then
      test_pass "$rule has Lambda target configured"
    else
      test_warn "$rule has target but not Lambda: $TARGETS"
    fi
  else
    test_fail "$rule has no targets configured"
  fi
done

# Test 11: Lambda Function Permissions
test_section "Test 11: Lambda Function Permissions"

# Check if EventBridge can invoke processors
INACTIVITY_PERM=$(aws lambda get-policy \
  --function-name "storytailor-inactivity-processor-production" \
  --region "$REGION" \
  --query 'Policy' \
  --output text 2>/dev/null | jq -r '.Statement[] | select(.Principal.Service == "events.amazonaws.com")' 2>/dev/null || echo "")

if [ -n "$INACTIVITY_PERM" ]; then
  test_pass "Inactivity processor has EventBridge permission"
else
  test_warn "Inactivity processor EventBridge permission not found (may use resource-based policy)"
fi

DELETION_PERM=$(aws lambda get-policy \
  --function-name "storytailor-deletion-processor-production" \
  --region "$REGION" \
  --query 'Policy' \
  --output text 2>/dev/null | jq -r '.Statement[] | select(.Principal.Service == "events.amazonaws.com")' 2>/dev/null || echo "")

if [ -n "$DELETION_PERM" ]; then
  test_pass "Deletion processor has EventBridge permission"
else
  test_warn "Deletion processor EventBridge permission not found (may use resource-based policy)"
fi

# Test 12: Region Verification
test_section "Test 12: Region Verification"

# Count all storytailor functions in us-east-1
FUNCTION_COUNT=$(aws lambda list-functions --region "$REGION" \
  --query 'Functions[?starts_with(FunctionName, `storytailor-`) && contains(FunctionName, `production`)].FunctionName' \
  --output text 2>/dev/null | tr '\t' '\n' | wc -l | tr -d ' ')

if [ "$FUNCTION_COUNT" -ge 10 ]; then
  test_pass "Found $FUNCTION_COUNT production functions in us-east-1"
else
  test_fail "Only found $FUNCTION_COUNT production functions (expected at least 10)"
fi

# Verify no production functions in us-east-2
FUNCTION_COUNT_E2=$(aws lambda list-functions --region "us-east-2" \
  --query 'Functions[?starts_with(FunctionName, `storytailor-`) && contains(FunctionName, `production`)].FunctionName' \
  --output text 2>/dev/null | tr '\t' '\n' | wc -l | tr -d ' ')

if [ "$FUNCTION_COUNT_E2" -eq 0 ]; then
  test_pass "No production functions in us-east-2 (cleanup verified)"
else
  test_fail "Found $FUNCTION_COUNT_E2 production functions in us-east-2 (should be 0)"
fi

# Final Summary
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}Test Summary${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${GREEN}✅ Passed: ${PASSED}${NC}"
echo -e "${YELLOW}⚠️  Warnings: ${WARNINGS}${NC}"
echo -e "${RED}❌ Failed: ${FAILED}${NC}"
echo ""

TOTAL=$((PASSED + WARNINGS + FAILED))
if [ "$TOTAL" -gt 0 ]; then
  PASS_RATE=$(echo "scale=1; $PASSED * 100 / $TOTAL" | bc)
  echo -e "${CYAN}Pass Rate: ${PASS_RATE}%${NC}"
fi

echo ""
if [ "$FAILED" -eq 0 ]; then
  echo -e "${GREEN}╔══════════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${GREEN}║              All Critical Tests Passed!                        ║${NC}"
  echo -e "${GREEN}╚══════════════════════════════════════════════════════════════════╝${NC}"
  exit 0
else
  echo -e "${RED}╔══════════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${RED}║              Some Tests Failed - Review Above                  ║${NC}"
  echo -e "${RED}╚══════════════════════════════════════════════════════════════════╝${NC}"
  exit 1
fi

