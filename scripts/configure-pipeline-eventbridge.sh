#!/bin/bash

# Configure EventBridge Rules for Intelligence Curator Pipeline System
# Usage: ./scripts/configure-pipeline-eventbridge.sh [staging|production]

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

ENVIRONMENT=${1:-staging}
AWS_REGION=${AWS_REGION:-us-east-1}

if [ "$ENVIRONMENT" != "staging" ] && [ "$ENVIRONMENT" != "production" ]; then
  echo -e "${RED}❌ Invalid environment. Use: staging or production${NC}"
  exit 1
fi

LAMBDA_NAME="storytailor-intelligence-curator-${ENVIRONMENT}"

echo -e "${BLUE}🎯 Configuring EventBridge rules for: ${ENVIRONMENT}${NC}"
echo -e "${BLUE}📍 Region: ${AWS_REGION}${NC}"
echo -e "${BLUE}🔗 Lambda: ${LAMBDA_NAME}${NC}"

# Check if Lambda exists
if ! aws lambda get-function --function-name "$LAMBDA_NAME" --region "$AWS_REGION" &>/dev/null; then
  echo -e "${RED}❌ Lambda function ${LAMBDA_NAME} does not exist${NC}"
  echo -e "${YELLOW}Deploy Lambda first: ./scripts/deploy-intelligence-curator.sh ${ENVIRONMENT}${NC}"
  exit 1
fi

# Get Lambda ARN
LAMBDA_ARN=$(aws lambda get-function \
  --function-name "$LAMBDA_NAME" \
  --region "$AWS_REGION" \
  --query 'Configuration.FunctionArn' \
  --output text)

echo -e "${GREEN}✅ Lambda ARN: ${LAMBDA_ARN}${NC}"

# ============================================================================
# EventBridge Rules Configuration
# ============================================================================

# Define rules: NAME:SCHEDULE:JOB_TYPE
RULES=(
  "storytailor-daily-digest-${ENVIRONMENT}:cron(0 20 * * ? *):daily_digest"
  "storytailor-weekly-insights-${ENVIRONMENT}:cron(0 18 ? * SUN *):weekly_insights"
  "storytailor-story-scoring-${ENVIRONMENT}:cron(0 4 * * ? *):story_scoring"
  "storytailor-referral-rewards-${ENVIRONMENT}:cron(0 1 * * ? *):referral_rewards"
  "storytailor-expire-credits-${ENVIRONMENT}:cron(0 3 * * ? *):expire_credits"
  "storytailor-org-health-${ENVIRONMENT}:cron(0 9 ? * MON#1 *):org_health"
  "storytailor-power-user-${ENVIRONMENT}:cron(0 12 * * ? *):power_user_detection"
  "storytailor-asset-timeout-${ENVIRONMENT}:rate(15 minutes):asset_timeout_check"
)

echo ""
echo -e "${YELLOW}📅 Creating ${#RULES[@]} EventBridge rules...${NC}"
echo ""

for rule_config in "${RULES[@]}"; do
  RULE_NAME=$(echo "$rule_config" | cut -d: -f1)
  SCHEDULE=$(echo "$rule_config" | cut -d: -f2)
  JOB_TYPE=$(echo "$rule_config" | cut -d: -f3)
  
  echo -e "${BLUE}⚙️  Creating rule: ${RULE_NAME}${NC}"
  echo -e "   Schedule: ${SCHEDULE}"
  echo -e "   Job Type: ${JOB_TYPE}"
  
  # Create or update rule
  aws events put-rule \
    --name "$RULE_NAME" \
    --schedule-expression "$SCHEDULE" \
    --state ENABLED \
    --description "Intelligence Curator: ${JOB_TYPE}" \
    --region "$AWS_REGION" \
    > /dev/null
  
  echo -e "${GREEN}   ✅ Rule created${NC}"
  
  # Add Lambda permission (idempotent)
  aws lambda add-permission \
    --function-name "$LAMBDA_NAME" \
    --statement-id "${RULE_NAME}-permission" \
    --action lambda:InvokeFunction \
    --principal events.amazonaws.com \
    --source-arn "arn:aws:events:${AWS_REGION}:$(aws sts get-caller-identity --query Account --output text):rule/${RULE_NAME}" \
    --region "$AWS_REGION" \
    2>/dev/null || echo -e "${YELLOW}   ⚠️  Permission already exists${NC}"
  
  # Add target with jobType input
  aws events put-targets \
    --rule "$RULE_NAME" \
    --targets "[{\"Id\":\"1\",\"Arn\":\"${LAMBDA_ARN}\",\"Input\":\"{\\\"jobType\\\":\\\"${JOB_TYPE}\\\"}\"}]" \
    --region "$AWS_REGION" \
    > /dev/null
  
  echo -e "${GREEN}   ✅ Target configured${NC}"
  echo ""
done

echo ""
echo -e "${GREEN}✅ All EventBridge rules configured successfully!${NC}"
echo ""
echo -e "${BLUE}📋 Rule Summary:${NC}"
echo -e "   • daily-digest: 8pm UTC daily"
echo -e "   • weekly-insights: 6pm UTC every Sunday"
echo -e "   • story-scoring: 4am UTC daily"
echo -e "   • referral-rewards: 1am UTC daily"
echo -e "   • expire-credits: 3am UTC daily"
echo -e "   • org-health: 9am UTC first Monday of month"
echo -e "   • power-user: 12pm UTC daily"
echo -e "   • asset-timeout: Every 15 minutes"
echo ""
echo -e "${YELLOW}⚠️  Note: Times are in UTC. Users see emails in their timezone.${NC}"
echo ""
echo -e "${BLUE}🧪 Test a rule manually:${NC}"
echo -e "   aws events put-events --entries '[{\"Source\":\"storytailor.test\",\"DetailType\":\"test\",\"Detail\":\"{\\\"jobType\\\":\\\"daily_digest\\\"}\"}]'"
echo ""

