#!/bin/bash

# Create EventBridge Rules for PLG Nudges
# Creates 3 scheduled rules that trigger Intelligence Curator Lambda

set -e

LAMBDA_ARN="arn:aws:lambda:us-east-1:326181217496:function:storytailor-intelligence-curator-production"
RULE_PREFIX="plg-nudge"

echo "🔧 Creating EventBridge Rules for PLG Nudges..."

# Day 3 Reminder (runs daily at 10 AM UTC)
echo "Creating Day 3 reminder rule..."
aws events put-rule \
  --name "${RULE_PREFIX}-day3-production" \
  --schedule-expression "cron(0 10 * * ? *)" \
  --state ENABLED \
  --description "PLG Day 3 reminder - sends email to users who haven't completed profile" \
  2>/dev/null || echo "Rule already exists or error occurred"

aws events put-targets \
  --rule "${RULE_PREFIX}-day3-production" \
  --targets "Id"="1","Arn"="${LAMBDA_ARN}","Input"='{"detail":{"jobType":"day3_nudge"}}' \
  2>/dev/null || echo "Target already exists or error occurred"

# Add Lambda permission for Day 3
aws lambda add-permission \
  --function-name storytailor-intelligence-curator-production \
  --statement-id "${RULE_PREFIX}-day3" \
  --action lambda:InvokeFunction \
  --principal events.amazonaws.com \
  --source-arn "arn:aws:events:us-east-1:326181217496:rule/${RULE_PREFIX}-day3-production" \
  2>/dev/null || echo "Permission already exists"

# Day 7 Social Proof (runs daily at 11 AM UTC)
echo "Creating Day 7 social proof rule..."
aws events put-rule \
  --name "${RULE_PREFIX}-day7-production" \
  --schedule-expression "cron(0 11 * * ? *)" \
  --state ENABLED \
  --description "PLG Day 7 social proof - encourages upgrade with testimonials" \
  2>/dev/null || echo "Rule already exists or error occurred"

aws events put-targets \
  --rule "${RULE_PREFIX}-day7-production" \
  --targets "Id"="1","Arn"="${LAMBDA_ARN}","Input"='{"detail":{"jobType":"day7_nudge"}}' \
  2>/dev/null || echo "Target already exists or error occurred"

# Add Lambda permission for Day 7
aws lambda add-permission \
  --function-name storytailor-intelligence-curator-production \
  --statement-id "${RULE_PREFIX}-day7" \
  --action lambda:InvokeFunction \
  --principal events.amazonaws.com \
  --source-arn "arn:aws:events:us-east-1:326181217496:rule/${RULE_PREFIX}-day7-production" \
  2>/dev/null || echo "Permission already exists"

# Day 14 Re-engagement (runs daily at 12 PM UTC)
echo "Creating Day 14 re-engagement rule..."
aws events put-rule \
  --name "${RULE_PREFIX}-day14-production" \
  --schedule-expression "cron(0 12 * * ? *)" \
  --state ENABLED \
  --description "PLG Day 14 re-engagement - final push with discount offer" \
  2>/dev/null || echo "Rule already exists or error occurred"

aws events put-targets \
  --rule "${RULE_PREFIX}-day14-production" \
  --targets "Id"="1","Arn"="${LAMBDA_ARN}","Input"='{"detail":{"jobType":"day14_nudge"}}' \
  2>/dev/null || echo "Target already exists or error occurred"

# Add Lambda permission for Day 14
aws lambda add-permission \
  --function-name storytailor-intelligence-curator-production \
  --statement-id "${RULE_PREFIX}-day14" \
  --action lambda:InvokeFunction \
  --principal events.amazonaws.com \
  --source-arn "arn:aws:events:us-east-1:326181217496:rule/${RULE_PREFIX}-day14-production" \
  2>/dev/null || echo "Permission already exists"

echo ""
echo "✅ EventBridge rules created!"
echo ""
echo "📋 Rules created:"
echo "  - ${RULE_PREFIX}-day3-production (Daily at 10:00 UTC)"
echo "  - ${RULE_PREFIX}-day7-production (Daily at 11:00 UTC)"
echo "  - ${RULE_PREFIX}-day14-production (Daily at 12:00 UTC)"
echo ""
echo "📝 Next steps:"
echo "  1. Verify rules in AWS Console: https://console.aws.amazon.com/events/"
echo "  2. Create SendGrid email templates with IDs:"
echo "     - plg-day0-earning-opportunities"
echo "     - plg-day3-reminder"
echo "     - plg-day7-social-proof"
echo "     - plg-day14-re-engagement"
echo "     - plg-credit-earned"
echo "     - plg-referral-reward"
echo "  3. Store template IDs in SSM Parameter Store"
echo ""

