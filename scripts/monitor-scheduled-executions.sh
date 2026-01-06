#!/bin/bash
# Monitor Scheduled Processor Executions
# Checks CloudWatch logs for scheduled executions and verifies success

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
INACTIVITY_RULE="storytailor-inactivity-check"
DELETION_RULE="storytailor-deletion-processing"

# Calculate time ranges (macOS compatible)
if [[ "$OSTYPE" == "darwin"* ]]; then
  # macOS date command
  NOW=$(date -u +%s)
  YESTERDAY=$(date -u -v-1d +%s)
  TWO_DAYS_AGO=$(date -u -v-2d +%s)
else
  # Linux date command
  NOW=$(date -u +%s)
  YESTERDAY=$(date -u -d '1 day ago' +%s)
  TWO_DAYS_AGO=$(date -u -d '2 days ago' +%s)
fi

echo -e "${CYAN}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║          Scheduled Execution Monitoring Report                 ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Function to check scheduled executions
check_scheduled_executions() {
  local LAMBDA_NAME=$1
  local RULE_NAME=$2
  local SCHEDULE_TIME=$3  # Expected execution time (e.g., "02:00" for 2 AM UTC)
  
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${CYAN}Checking: ${LAMBDA_NAME}${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  
  # Get log group
  LOG_GROUP="/aws/lambda/${LAMBDA_NAME}"
  
  # Check for executions in the last 48 hours
  echo -e "${YELLOW}  Checking logs for last 48 hours...${NC}"
  
  # Get log events from last 48 hours
  LOG_EVENTS=$(aws logs filter-log-events \
    --log-group-name "${LOG_GROUP}" \
    --region "${REGION}" \
    --start-time ${TWO_DAYS_AGO}000 \
    --end-time ${NOW}000 \
    --query 'events[*].message' \
    --output text 2>/dev/null || echo "")
  
  if [ -z "${LOG_EVENTS}" ]; then
    echo -e "${YELLOW}  ⚠ No log events found in last 48 hours${NC}"
    return
  fi
  
  # Count successful executions (exclude error messages from success logs)
  SUCCESS_COUNT=$(echo "${LOG_EVENTS}" | grep -c "processing completed" 2>/dev/null || echo "0")
  # Count actual errors (exclude success messages that contain "error" in JSON)
  ERROR_COUNT=$(echo "${LOG_EVENTS}" | grep -i "error\|failed" | grep -v "processing completed" | grep -v "\"errors\":0" | grep -v "\"error\":null" | wc -l | tr -d ' ' || echo "0")
  
  # Get latest execution details
  LATEST_SUCCESS=$(echo "${LOG_EVENTS}" | grep "processing completed" | tail -1 || echo "")
  LATEST_ERROR=$(echo "${LOG_EVENTS}" | grep -i "error\|failed" | tail -1 || echo "")
  
  echo -e "${CYAN}  Execution Summary (Last 48 hours):${NC}"
  echo -e "${GREEN}    Successful: ${SUCCESS_COUNT}${NC}"
  echo -e "${RED}    Errors: ${ERROR_COUNT}${NC}"
  
  if [ -n "${LATEST_SUCCESS}" ]; then
    echo -e "${CYAN}  Latest Success:${NC}"
    echo "${LATEST_SUCCESS}" | sed 's/^/    /'
  fi
  
  if [ -n "${LATEST_ERROR}" ] && [ "${ERROR_COUNT}" -gt 0 ]; then
    echo -e "${RED}  Latest Error:${NC}"
    echo "${LATEST_ERROR}" | sed 's/^/    /'
  fi
  
  # Check for scheduled execution times
  echo -e "${CYAN}  Checking for scheduled execution times...${NC}"
  
  # Get today's expected execution time (macOS compatible)
  TODAY=$(date -u +%Y-%m-%d)
  EXPECTED_TIME="${TODAY}T${SCHEDULE_TIME}:00Z"
  if [[ "$OSTYPE" == "darwin"* ]]; then
    EXPECTED_TIMESTAMP=$(date -u -j -f "%Y-%m-%dT%H:%M:%SZ" "${EXPECTED_TIME}" +%s 2>/dev/null || echo "0")
  else
    EXPECTED_TIMESTAMP=$(date -u -d "${EXPECTED_TIME}" +%s 2>/dev/null || echo "0")
  fi
  
  if [ "${EXPECTED_TIMESTAMP}" -gt 0 ]; then
    # Check if there's an execution around the expected time (±30 minutes)
    EXECUTION_FOUND=$(echo "${LOG_EVENTS}" | grep -E "${TODAY}.*${SCHEDULE_TIME}" || echo "")
    
    if [ -n "${EXECUTION_FOUND}" ]; then
      echo -e "${GREEN}    ✓ Found execution at scheduled time${NC}"
    else
      echo -e "${YELLOW}    ⚠ No execution found at scheduled time (${SCHEDULE_TIME} UTC)${NC}"
    fi
  fi
  
  echo ""
}

# Check inactivity processor (runs at 2 AM UTC)
check_scheduled_executions "${INACTIVITY_LAMBDA}" "${INACTIVITY_RULE}" "02:00"

# Check deletion processor (runs at 3 AM UTC)
check_scheduled_executions "${DELETION_LAMBDA}" "${DELETION_RULE}" "03:00"

# Check EventBridge rule status
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}EventBridge Rule Status${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

for RULE in "${INACTIVITY_RULE}" "${DELETION_RULE}"; do
  STATE=$(aws events describe-rule --name "${RULE}" --region "${REGION}" --query 'State' --output text 2>/dev/null || echo "UNKNOWN")
  SCHEDULE=$(aws events describe-rule --name "${RULE}" --region "${REGION}" --query 'ScheduleExpression' --output text 2>/dev/null || echo "UNKNOWN")
  
  if [ "${STATE}" = "ENABLED" ]; then
    echo -e "${GREEN}  ✓ ${RULE}: ENABLED${NC}"
    echo -e "${CYAN}    Schedule: ${SCHEDULE}${NC}"
  else
    echo -e "${RED}  ✗ ${RULE}: ${STATE}${NC}"
  fi
done

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}Summary${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${GREEN}✅ Monitoring complete${NC}"
echo ""
echo -e "${CYAN}Next scheduled executions:${NC}"
echo -e "  Inactivity Processor: Daily at 2 AM UTC"
echo -e "  Deletion Processor: Daily at 3 AM UTC"
echo ""
echo -e "${YELLOW}Tip: Run this script daily to monitor scheduled executions${NC}"
