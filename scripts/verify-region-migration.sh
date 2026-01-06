#!/bin/bash
# Verify Region Migration Status
# Checks deployment status of processors and EventBridge rules in both regions

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BLUE='\033[0;34m'
NC='\033[0m'

REGION1="us-east-1"
REGION2="us-east-2"
INACTIVITY_LAMBDA="storytailor-inactivity-processor-production"
DELETION_LAMBDA="storytailor-deletion-processor-production"
INACTIVITY_RULE="storytailor-inactivity-check"
DELETION_RULE="storytailor-deletion-processing"

echo -e "${CYAN}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║          Region Migration Verification Report                    ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Counters
PASS=0
FAIL=0
WARN=0

# Function to check Lambda function
check_lambda() {
  local REGION=$1
  local FUNCTION_NAME=$2
  local EXPECTED=$3
  
  if aws lambda get-function --function-name "${FUNCTION_NAME}" --region "${REGION}" >/dev/null 2>&1; then
    if [ "${EXPECTED}" = "yes" ]; then
      echo -e "${GREEN}  ✓ ${FUNCTION_NAME} exists in ${REGION}${NC}"
      PASS=$((PASS + 1))
    else
      echo -e "${YELLOW}  ⚠ ${FUNCTION_NAME} exists in ${REGION} (should be removed)${NC}"
      WARN=$((WARN + 1))
    fi
  else
    if [ "${EXPECTED}" = "yes" ]; then
      echo -e "${RED}  ✗ ${FUNCTION_NAME} NOT found in ${REGION} (should exist)${NC}"
      FAIL=$((FAIL + 1))
    else
      echo -e "${GREEN}  ✓ ${FUNCTION_NAME} not in ${REGION} (correct)${NC}"
      PASS=$((PASS + 1))
    fi
  fi
}

# Function to check EventBridge rule
check_rule() {
  local REGION=$1
  local RULE_NAME=$2
  local EXPECTED=$3
  
  if aws events describe-rule --name "${RULE_NAME}" --region "${REGION}" >/dev/null 2>&1; then
    # Get rule state
    STATE=$(aws events describe-rule --name "${RULE_NAME}" --region "${REGION}" --query 'State' --output text 2>/dev/null || echo "UNKNOWN")
    
    if [ "${EXPECTED}" = "yes" ]; then
      if [ "${STATE}" = "ENABLED" ]; then
        echo -e "${GREEN}  ✓ ${RULE_NAME} exists and is ENABLED in ${REGION}${NC}"
        PASS=$((PASS + 1))
      else
        echo -e "${YELLOW}  ⚠ ${RULE_NAME} exists but is ${STATE} in ${REGION}${NC}"
        WARN=$((WARN + 1))
      fi
    else
      if [ "${STATE}" = "DISABLED" ]; then
        echo -e "${YELLOW}  ⚠ ${RULE_NAME} exists but is DISABLED in ${REGION} (should be deleted)${NC}"
        WARN=$((WARN + 1))
      else
        echo -e "${RED}  ✗ ${RULE_NAME} exists and is ENABLED in ${REGION} (should be disabled/deleted)${NC}"
        FAIL=$((FAIL + 1))
      fi
    fi
  else
    if [ "${EXPECTED}" = "yes" ]; then
      echo -e "${RED}  ✗ ${RULE_NAME} NOT found in ${REGION} (should exist)${NC}"
      FAIL=$((FAIL + 1))
    else
      echo -e "${GREEN}  ✓ ${RULE_NAME} not in ${REGION} (correct)${NC}"
      PASS=$((PASS + 1))
    fi
  fi
}

# Function to check rule targets
check_rule_targets() {
  local REGION=$1
  local RULE_NAME=$2
  
  TARGETS=$(aws events list-targets-by-rule --rule "${RULE_NAME}" --region "${REGION}" --query 'Targets[0].Arn' --output text 2>/dev/null || echo "")
  
  if [ -n "${TARGETS}" ] && [ "${TARGETS}" != "None" ]; then
    TARGET_FUNCTION=$(echo "${TARGETS}" | awk -F: '{print $NF}')
    TARGET_REGION=$(echo "${TARGETS}" | awk -F: '{print $4}')
    
    if [ "${TARGET_REGION}" = "${REGION}" ]; then
      echo -e "${GREEN}    → Targets ${TARGET_FUNCTION} in ${TARGET_REGION} (correct)${NC}"
      PASS=$((PASS + 1))
    else
      echo -e "${RED}    → Targets ${TARGET_FUNCTION} in ${TARGET_REGION} (WRONG REGION!)${NC}"
      FAIL=$((FAIL + 1))
    fi
  else
    echo -e "${YELLOW}    → No targets configured${NC}"
    WARN=$((WARN + 1))
  fi
}

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}Lambda Functions Status${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo -e "${CYAN}us-east-1 (Primary Region):${NC}"
check_lambda "${REGION1}" "${INACTIVITY_LAMBDA}" "yes"
check_lambda "${REGION1}" "${DELETION_LAMBDA}" "yes"

echo ""
echo -e "${CYAN}us-east-2 (Legacy Region):${NC}"
check_lambda "${REGION2}" "${INACTIVITY_LAMBDA}" "no"
check_lambda "${REGION2}" "${DELETION_LAMBDA}" "no"

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}EventBridge Rules Status${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo -e "${CYAN}us-east-1 (Primary Region):${NC}"
check_rule "${REGION1}" "${INACTIVITY_RULE}" "yes"
check_rule_targets "${REGION1}" "${INACTIVITY_RULE}"
check_rule "${REGION1}" "${DELETION_RULE}" "yes"
check_rule_targets "${REGION1}" "${DELETION_RULE}"

echo ""
echo -e "${CYAN}us-east-2 (Legacy Region):${NC}"
check_rule "${REGION2}" "${INACTIVITY_RULE}" "no"
check_rule "${REGION2}" "${DELETION_RULE}" "no"

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}Summary${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${GREEN}Passed: ${PASS}${NC}"
echo -e "${YELLOW}Warnings: ${WARN}${NC}"
echo -e "${RED}Failed: ${FAIL}${NC}"
echo ""

if [ $FAIL -eq 0 ] && [ $WARN -eq 0 ]; then
  echo -e "${GREEN}╔══════════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${GREEN}║          Migration Complete - All Checks Passed!                 ║${NC}"
  echo -e "${GREEN}╚══════════════════════════════════════════════════════════════════╝${NC}"
  exit 0
elif [ $FAIL -eq 0 ]; then
  echo -e "${YELLOW}╔══════════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${YELLOW}║          Migration In Progress - Warnings Found                 ║${NC}"
  echo -e "${YELLOW}╚══════════════════════════════════════════════════════════════════╝${NC}"
  exit 0
else
  echo -e "${RED}╔══════════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${RED}║          Migration Incomplete - Action Required                  ║${NC}"
  echo -e "${RED}╚══════════════════════════════════════════════════════════════════╝${NC}"
  exit 1
fi
