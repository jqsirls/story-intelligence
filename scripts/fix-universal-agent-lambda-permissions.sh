#!/bin/bash
# Fix IAM permissions for Universal Agent Lambda to invoke Content Agent Lambda
# This script adds lambda:InvokeFunction permission to the Universal Agent's IAM role

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Environment setup
ENVIRONMENT=${1:-production}
ROLE_NAME="storytailor-lambda-role-${ENVIRONMENT}"

# Get AWS account info
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
AWS_REGION=${AWS_REGION:-us-east-1}

echo -e "${BLUE}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Fixing IAM Permissions for Universal Agent Lambda          ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}Environment: ${ENVIRONMENT}${NC}"
echo -e "${GREEN}AWS Account: ${AWS_ACCOUNT_ID}${NC}"
echo -e "${GREEN}AWS Region: ${AWS_REGION}${NC}"
echo -e "${GREEN}IAM Role: ${ROLE_NAME}${NC}"
echo ""

# Verify role exists
if ! aws iam get-role --role-name "$ROLE_NAME" &> /dev/null; then
    echo -e "${RED}❌ IAM role ${ROLE_NAME} does not exist${NC}"
    echo -e "${YELLOW}Please create the role first using deploy-lambda-functions.sh${NC}"
    exit 1
fi

echo -e "${BLUE}✅ IAM role found${NC}"

# Content Agent Lambda function name (production)
CONTENT_AGENT_FUNCTION="storytailor-content-agent-production"

# Check if Content Agent Lambda exists
if ! aws lambda get-function --function-name "$CONTENT_AGENT_FUNCTION" --region "$AWS_REGION" &> /dev/null; then
    echo -e "${YELLOW}⚠️  Content Agent Lambda function not found: ${CONTENT_AGENT_FUNCTION}${NC}"
    echo -e "${YELLOW}   Will add permission anyway (function may be in different region)${NC}"
fi

# Create inline policy document
POLICY_DOC=$(cat <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "lambda:InvokeFunction",
      "Resource": "arn:aws:lambda:${AWS_REGION}:${AWS_ACCOUNT_ID}:function:${CONTENT_AGENT_FUNCTION}"
    }
  ]
}
EOF
)

POLICY_NAME="UniversalAgentInvokeContentAgent"

echo -e "${BLUE}📝 Creating/updating inline policy: ${POLICY_NAME}${NC}"

# Check if policy already exists
EXISTING_POLICIES=$(aws iam list-role-policies --role-name "$ROLE_NAME" --query 'PolicyNames' --output text 2>/dev/null || echo "")

if echo "$EXISTING_POLICIES" | grep -q "$POLICY_NAME"; then
    echo -e "${YELLOW}⚠️  Policy ${POLICY_NAME} already exists, updating...${NC}"
    
    # Put inline policy (updates existing)
    aws iam put-role-policy \
        --role-name "$ROLE_NAME" \
        --policy-name "$POLICY_NAME" \
        --policy-document "$POLICY_DOC"
    
    echo -e "${GREEN}✅ Policy updated${NC}"
else
    echo -e "${BLUE}📝 Creating new inline policy...${NC}"
    
    # Put inline policy (creates new)
    aws iam put-role-policy \
        --role-name "$ROLE_NAME" \
        --policy-name "$POLICY_NAME" \
        --policy-document "$POLICY_DOC"
    
    echo -e "${GREEN}✅ Policy created${NC}"
fi

# Verify the policy was added
echo ""
echo -e "${BLUE}🔍 Verifying policy...${NC}"
VERIFY_POLICY=$(aws iam get-role-policy \
    --role-name "$ROLE_NAME" \
    --policy-name "$POLICY_NAME" \
    --query 'PolicyDocument' \
    --output json 2>/dev/null || echo "{}")

if [ "$VERIFY_POLICY" != "{}" ]; then
    echo -e "${GREEN}✅ Policy verified${NC}"
    echo ""
    echo -e "${GREEN}Policy Document:${NC}"
    echo "$VERIFY_POLICY" | jq '.'
else
    echo -e "${RED}❌ Failed to verify policy${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                    ✅ PERMISSIONS FIXED ✅                        ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}The Universal Agent Lambda can now invoke:${NC}"
echo -e "  ${CYAN}arn:aws:lambda:${AWS_REGION}:${AWS_ACCOUNT_ID}:function:${CONTENT_AGENT_FUNCTION}${NC}"
echo ""
echo -e "${YELLOW}Note: It may take a few seconds for IAM changes to propagate.${NC}"
echo -e "${YELLOW}If you still see permission errors, wait 30-60 seconds and try again.${NC}"

