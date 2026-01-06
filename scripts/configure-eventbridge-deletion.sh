#!/bin/bash
# Configure EventBridge Rules for Deletion System Processors

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BLUE='\033[0;34m'
NC='\033[0m'

REGION="us-east-1"
INACTIVITY_RULE="storytailor-inactivity-check"
DELETION_RULE="storytailor-deletion-processing"
INACTIVITY_LAMBDA="storytailor-inactivity-processor-production"
DELETION_LAMBDA="storytailor-deletion-processor-production"

echo -e "${CYAN}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║     Configuring EventBridge Rules for Deletion System            ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Get AWS account ID
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text --region "${REGION}" 2>/dev/null || echo "")

if [ -z "${ACCOUNT_ID}" ]; then
  echo -e "${RED}❌ Failed to get AWS account ID. Please check AWS credentials.${NC}"
  exit 1
fi

INACTIVITY_ARN="arn:aws:lambda:${REGION}:${ACCOUNT_ID}:function:${INACTIVITY_LAMBDA}"
DELETION_ARN="arn:aws:lambda:${REGION}:${ACCOUNT_ID}:function:${DELETION_LAMBDA}"

# Function to create or update EventBridge rule
setup_rule() {
  local RULE_NAME=$1
  local SCHEDULE=$2
  local LAMBDA_ARN=$3
  local DESCRIPTION=$4
  
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${CYAN}Setting up: ${RULE_NAME}${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  
  # Check if rule exists
  if aws events describe-rule --name "${RULE_NAME}" --region "${REGION}" >/dev/null 2>&1; then
    echo -e "${YELLOW}  Rule exists, updating...${NC}"
    aws events put-rule \
      --name "${RULE_NAME}" \
      --schedule-expression "${SCHEDULE}" \
      --description "${DESCRIPTION}" \
      --state ENABLED \
      --region "${REGION}" >/dev/null 2>&1
  else
    echo -e "${YELLOW}  Creating new rule...${NC}"
    aws events put-rule \
      --name "${RULE_NAME}" \
      --schedule-expression "${SCHEDULE}" \
      --description "${DESCRIPTION}" \
      --state ENABLED \
      --region "${REGION}" >/dev/null 2>&1
  fi
  
  # Check if Lambda function exists
  if ! aws lambda get-function --function-name "${LAMBDA_ARN##*:}" --region "${REGION}" >/dev/null 2>&1; then
    echo -e "${YELLOW}  ⚠ Lambda function not found: ${LAMBDA_ARN##*:}${NC}"
    echo -e "${YELLOW}  Please deploy the processor first using: ./scripts/deploy-deletion-processors.sh${NC}"
    return 1
  fi
  
  # Add Lambda permission for EventBridge
  echo -e "${YELLOW}  Adding Lambda permission...${NC}"
  PERMISSION_ID="eventbridge-${RULE_NAME}-$(date +%s)"
  aws lambda add-permission \
    --function-name "${LAMBDA_ARN##*:}" \
    --statement-id "${PERMISSION_ID}" \
    --action "lambda:InvokeFunction" \
    --principal "events.amazonaws.com" \
    --source-arn "arn:aws:events:${REGION}:${ACCOUNT_ID}:rule/${RULE_NAME}" \
    --region "${REGION}" >/dev/null 2>&1 || echo -e "${YELLOW}    Permission may already exist${NC}"
  
  # Add target to rule
  echo -e "${YELLOW}  Adding Lambda target...${NC}"
  aws events put-targets \
    --rule "${RULE_NAME}" \
    --targets "Id=1,Arn=${LAMBDA_ARN}" \
    --region "${REGION}" >/dev/null 2>&1
  
  echo -e "${GREEN}  ✓ ${RULE_NAME} configured${NC}"
  echo ""
}

# Setup inactivity check rule (daily at 2 AM UTC)
setup_rule \
  "${INACTIVITY_RULE}" \
  "cron(0 2 * * ? *)" \
  "${INACTIVITY_ARN}" \
  "Daily inactivity monitoring for Storytailor users"

# Setup deletion processing rule (daily at 3 AM UTC)
setup_rule \
  "${DELETION_RULE}" \
  "cron(0 3 * * ? *)" \
  "${DELETION_ARN}" \
  "Daily deletion processing for Storytailor"

echo -e "${GREEN}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║          EventBridge Rules Configured Successfully!               ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${CYAN}📝 Summary:${NC}"
echo -e "  • ${INACTIVITY_RULE}: Runs daily at 2 AM UTC"
echo -e "  • ${DELETION_RULE}: Runs daily at 3 AM UTC"
echo ""
echo -e "${CYAN}📝 Next steps:${NC}"
echo -e "  1. Verify Lambda functions are deployed"
echo -e "  2. Test the processors manually if needed"
echo -e "  3. Monitor CloudWatch logs for first runs"
