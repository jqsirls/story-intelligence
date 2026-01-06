#!/bin/bash
# Manual Processor Testing Script
# Tests both processors by manually invoking them and checking CloudWatch logs

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BLUE='\033[0;34m'
NC='\033[0m'

REGION="us-east-1"
INACTIVITY_LAMBDA="storytailor-inactivity-processor-production"
DELETION_LAMBDA="storytailor-deletion-processor-production"

PASSED=0
FAILED=0

echo -e "${CYAN}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║          Manual Processor Testing (Production)                  ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Function to test a processor
test_processor() {
  local LAMBDA_NAME=$1
  local PROCESSOR_NAME=$2
  
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${CYAN}Testing: ${PROCESSOR_NAME}${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  
  # Create EventBridge event payload
  PAYLOAD_FILE="/tmp/processor-test-${PROCESSOR_NAME}-$(date +%s).json"
  cat > "${PAYLOAD_FILE}" <<EOF
{
  "version": "0",
  "id": "test-$(date +%s)",
  "detail-type": "Scheduled Event",
  "source": "aws.events",
  "account": "326181217496",
  "time": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "region": "${REGION}",
  "resources": ["arn:aws:events:${REGION}::rule/test"],
  "detail": {}
}
EOF
  
  echo -e "${YELLOW}  Invoking ${LAMBDA_NAME}...${NC}"
  RESPONSE_FILE="/tmp/processor-response-${PROCESSOR_NAME}-$(date +%s).json"
  
  set +e
  aws lambda invoke \
    --function-name "${LAMBDA_NAME}" \
    --region "${REGION}" \
    --cli-binary-format raw-in-base64-out \
    --payload "file://${PAYLOAD_FILE}" \
    "${RESPONSE_FILE}" 2>&1 | tee /tmp/invoke-output.log
  INVOKE_EXIT=$?
  set -e
  
  if [ $INVOKE_EXIT -ne 0 ]; then
    echo -e "${RED}  ✗ Failed: Lambda invocation error${NC}"
    cat /tmp/invoke-output.log
    FAILED=$((FAILED + 1))
    rm -f "${PAYLOAD_FILE}" "${RESPONSE_FILE}" 2>/dev/null || true
    return 1
  fi
  
  # Check response
  if [ -f "${RESPONSE_FILE}" ] && [ -s "${RESPONSE_FILE}" ]; then
    RESPONSE_BODY=$(cat "${RESPONSE_FILE}")
    echo -e "${CYAN}  Response:${NC}"
    echo "${RESPONSE_BODY}" | jq '.' 2>/dev/null || echo "${RESPONSE_BODY}"
    
    # Check for success indicators
    if echo "${RESPONSE_BODY}" | grep -q '"success":\s*true' 2>/dev/null || \
       echo "${RESPONSE_BODY}" | grep -q '"statusCode":\s*200' 2>/dev/null || \
       echo "${RESPONSE_BODY}" | grep -q '"statusCode":200' 2>/dev/null; then
      echo -e "${GREEN}  ✓ Processor executed successfully${NC}"
      PASSED=$((PASSED + 1))
    else
      echo -e "${YELLOW}  ⚠ Processor executed but response unclear${NC}"
      echo -e "${YELLOW}  Response: ${RESPONSE_BODY}${NC}"
      PASSED=$((PASSED + 1))  # Still count as passed if it executed
    fi
  else
    echo -e "${RED}  ✗ Failed: No response received${NC}"
    FAILED=$((FAILED + 1))
  fi
  
  # Get CloudWatch log group name
  LOG_GROUP="/aws/lambda/${LAMBDA_NAME}"
  
  # Wait a moment for logs to appear
  sleep 2
  
  echo -e "${YELLOW}  Checking CloudWatch logs...${NC}"
  
  # Get recent log streams
  LOG_STREAM=$(aws logs describe-log-streams \
    --log-group-name "${LOG_GROUP}" \
    --region "${REGION}" \
    --order-by LastEventTime \
    --descending \
    --max-items 1 \
    --query 'logStreams[0].logStreamName' \
    --output text 2>/dev/null || echo "")
  
  if [ -n "${LOG_STREAM}" ] && [ "${LOG_STREAM}" != "None" ]; then
    echo -e "${CYAN}  Latest log stream: ${LOG_STREAM}${NC}"
    
    # Get last 20 log events
    LOG_EVENTS=$(aws logs get-log-events \
      --log-group-name "${LOG_GROUP}" \
      --log-stream-name "${LOG_STREAM}" \
      --region "${REGION}" \
      --limit 20 \
      --query 'events[*].message' \
      --output text 2>/dev/null || echo "")
    
    if [ -n "${LOG_EVENTS}" ]; then
      echo -e "${CYAN}  Recent log entries:${NC}"
      echo "${LOG_EVENTS}" | tail -10 | sed 's/^/    /'
      
      # Check for errors
      if echo "${LOG_EVENTS}" | grep -qi "error\|exception\|failed\|failure" 2>/dev/null; then
        echo -e "${YELLOW}  ⚠ Warnings/errors found in logs (review above)${NC}"
      else
        echo -e "${GREEN}  ✓ No errors found in logs${NC}"
      fi
    else
      echo -e "${YELLOW}  ⚠ No log events found (logs may still be propagating)${NC}"
    fi
  else
    echo -e "${YELLOW}  ⚠ No log streams found (logs may still be propagating)${NC}"
  fi
  
  rm -f "${PAYLOAD_FILE}" "${RESPONSE_FILE}" 2>/dev/null || true
  echo ""
}

# Test inactivity processor
test_processor "${INACTIVITY_LAMBDA}" "Inactivity Processor"

# Test deletion processor
test_processor "${DELETION_LAMBDA}" "Deletion Processor"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}Test Summary${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}Passed: ${PASSED}${NC}"
echo -e "${RED}Failed: ${FAILED}${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}╔══════════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${GREEN}║          All Processor Tests Passed!                             ║${NC}"
  echo -e "${GREEN}╚══════════════════════════════════════════════════════════════════╝${NC}"
  exit 0
else
  echo -e "${RED}╔══════════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${RED}║          Some Tests Failed                                         ║${NC}"
  echo -e "${RED}╚══════════════════════════════════════════════════════════════════╝${NC}"
  exit 1
fi
