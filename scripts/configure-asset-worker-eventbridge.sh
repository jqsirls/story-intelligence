#!/bin/bash
# Configure EventBridge rule for asset worker Lambda
# Usage: ./scripts/configure-asset-worker-eventbridge.sh [production|staging]

set -e

ENVIRONMENT=${1:-production}
FUNCTION_NAME="storytailor-asset-worker-${ENVIRONMENT}"
RULE_NAME="storytailor-asset-worker-${ENVIRONMENT}"

echo "Configuring EventBridge rule for asset worker..."
echo "Environment: ${ENVIRONMENT}"
echo "Function: ${FUNCTION_NAME}"
echo "Rule: ${RULE_NAME}"

# Get AWS account ID
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
REGION=${AWS_REGION:-us-east-1}

FUNCTION_ARN="arn:aws:lambda:${REGION}:${ACCOUNT_ID}:function:${FUNCTION_NAME}"

# Create or update EventBridge rule
echo "Creating/updating EventBridge rule..."
aws events put-rule \
  --name "${RULE_NAME}" \
  --schedule-expression "rate(5 minutes)" \
  --state ENABLED \
  --description "Process queued asset generation jobs every 5 minutes" \
  --region "${REGION}"

# Add Lambda permission for EventBridge
echo "Adding Lambda permission for EventBridge..."
aws lambda add-permission \
  --function-name "${FUNCTION_NAME}" \
  --statement-id "eventbridge-${ENVIRONMENT}-$(date +%s)" \
  --action "lambda:InvokeFunction" \
  --principal events.amazonaws.com \
  --source-arn "arn:aws:events:${REGION}:${ACCOUNT_ID}:rule/${RULE_NAME}" \
  --region "${REGION}" \
  2>/dev/null || echo "Permission may already exist, continuing..."

# Add Lambda as target
echo "Adding Lambda as EventBridge target..."
aws events put-targets \
  --rule "${RULE_NAME}" \
  --targets "Id"="1","Arn"="${FUNCTION_ARN}" \
  --region "${REGION}"

echo "✅ EventBridge rule configured successfully!"
echo "Rule: ${RULE_NAME}"
echo "Schedule: rate(5 minutes)"
echo "Target: ${FUNCTION_ARN}"

