#!/bin/bash
# Setup AWS WAF for A2A Function URL
# Provides rate limiting and DDoS protection

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Environment setup
ENVIRONMENT=${1:-production}
AWS_REGION=${AWS_REGION:-us-east-1}
FUNCTION_NAME="storytailor-universal-agent-${ENVIRONMENT}"

echo -e "${BLUE}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║            🛡️  AWS WAF Setup for A2A Function URL 🛡️           ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo -e "${CYAN}Environment: ${ENVIRONMENT}${NC}"
echo -e "${CYAN}Function: ${FUNCTION_NAME}${NC}"
echo ""

# Get Function URL
FUNCTION_URL=$(aws lambda get-function-url-config \
    --function-name "$FUNCTION_NAME" \
    --region "$AWS_REGION" \
    --query 'FunctionUrl' \
    --output text 2>/dev/null || echo "")

if [ -z "$FUNCTION_URL" ]; then
    echo -e "${RED}❌ Function URL not found for ${FUNCTION_NAME}${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Function URL: ${FUNCTION_URL}${NC}"
echo ""

# Extract domain from Function URL
FUNCTION_DOMAIN=$(echo "$FUNCTION_URL" | sed 's|https://||' | sed 's|/.*||')
echo -e "${CYAN}Domain: ${FUNCTION_DOMAIN}${NC}"
echo ""

# Note: AWS WAF for Lambda Function URLs requires CloudFront distribution
# Function URLs don't directly support WAF - need to use CloudFront + WAF
echo -e "${YELLOW}⚠️  Important: Lambda Function URLs don't directly support AWS WAF${NC}"
echo -e "${YELLOW}   To enable WAF protection, you need to:${NC}"
echo -e "${CYAN}   1. Create a CloudFront distribution in front of the Function URL${NC}"
echo -e "${CYAN}   2. Create a WAF Web ACL${NC}"
echo -e "${CYAN}   3. Associate the WAF Web ACL with the CloudFront distribution${NC}"
echo ""
echo -e "${BLUE}📋 Creating WAF Web ACL configuration...${NC}"

# Create WAF Web ACL name
WAF_ACL_NAME="a2a-function-url-waf-${ENVIRONMENT}"
SCOPE="CLOUDFRONT"  # Required for CloudFront

# Check if WAF ACL already exists
EXISTING_ACL=$(aws wafv2 list-web-acls \
    --scope CLOUDFRONT \
    --region us-east-1 \
    --query "WebACLs[?Name=='${WAF_ACL_NAME}'].Id" \
    --output text 2>/dev/null || echo "")

if [ -n "$EXISTING_ACL" ]; then
    echo -e "${YELLOW}⚠️  WAF Web ACL already exists: ${WAF_ACL_NAME}${NC}"
    read -p "Do you want to update it? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}Skipping WAF setup${NC}"
        exit 0
    fi
fi

# Create WAF Web ACL with rate limiting rules
echo -e "${YELLOW}Creating WAF Web ACL: ${WAF_ACL_NAME}...${NC}"

# Rate limiting rule (100 requests per 5 minutes per IP)
RATE_LIMIT_RULE=$(cat <<EOF
{
  "Name": "A2A-RateLimit",
  "Priority": 1,
  "Statement": {
    "RateBasedStatement": {
      "Limit": 100,
      "AggregateKeyType": "IP"
    }
  },
  "Action": {
    "Block": {}
  },
  "VisibilityConfig": {
    "SampledRequestsEnabled": true,
    "CloudWatchMetricsEnabled": true,
    "MetricName": "A2ARateLimit"
  }
}
EOF
)

# AWS Managed Rules - Core Rule Set
CORE_RULE_SET=$(cat <<EOF
{
  "Name": "AWSManagedRulesCommonRuleSet",
  "Priority": 10,
  "Statement": {
    "ManagedRuleGroupStatement": {
      "VendorName": "AWS",
      "Name": "AWSManagedRulesCommonRuleSet"
    }
  },
  "OverrideAction": {
    "None": {}
  },
  "VisibilityConfig": {
    "SampledRequestsEnabled": true,
    "CloudWatchMetricsEnabled": true,
    "MetricName": "CommonRuleSet"
  }
}
EOF
)

# AWS Managed Rules - Known Bad Inputs
BAD_INPUTS_RULE=$(cat <<EOF
{
  "Name": "AWSManagedRulesKnownBadInputsRuleSet",
  "Priority": 20,
  "Statement": {
    "ManagedRuleGroupStatement": {
      "VendorName": "AWS",
      "Name": "AWSManagedRulesKnownBadInputsRuleSet"
    }
  },
  "OverrideAction": {
    "None": {}
  },
  "VisibilityConfig": {
    "SampledRequestsEnabled": true,
    "CloudWatchMetricsEnabled": true,
    "MetricName": "KnownBadInputs"
  }
}
EOF
)

# Combine rules
RULES_JSON=$(cat <<EOF
[
  ${RATE_LIMIT_RULE},
  ${CORE_RULE_SET},
  ${BAD_INPUTS_RULE}
]
EOF
)

# Create or update WAF Web ACL
if [ -n "$EXISTING_ACL" ]; then
    echo -e "${YELLOW}Updating existing WAF Web ACL...${NC}"
    # Get existing ACL ARN
    ACL_ARN=$(aws wafv2 get-web-acl \
        --scope CLOUDFRONT \
        --region us-east-1 \
        --name "$WAF_ACL_NAME" \
        --id "$EXISTING_ACL" \
        --query 'WebACL.Arn' \
        --output text 2>/dev/null || echo "")
    
    if [ -n "$ACL_ARN" ]; then
        aws wafv2 update-web-acl \
            --scope CLOUDFRONT \
            --region us-east-1 \
            --name "$WAF_ACL_NAME" \
            --id "$EXISTING_ACL" \
            --default-action "Allow={}" \
            --rules "$(echo "$RULES_JSON" | jq -c .)" \
            --description "WAF for A2A Function URL - Rate limiting and DDoS protection" \
            --visibility-config "SampledRequestsEnabled=true,CloudWatchMetricsEnabled=true,MetricName=${WAF_ACL_NAME}" 2>/dev/null && \
        echo -e "${GREEN}  ✅ Updated WAF Web ACL${NC}" || \
        echo -e "${YELLOW}  ⚠️  Update may have failed - check AWS console${NC}"
    fi
else
    echo -e "${YELLOW}Creating new WAF Web ACL...${NC}"
    CREATE_OUTPUT=$(aws wafv2 create-web-acl \
        --scope CLOUDFRONT \
        --region us-east-1 \
        --name "$WAF_ACL_NAME" \
        --default-action "Allow={}" \
        --rules "$(echo "$RULES_JSON" | jq -c .)" \
        --description "WAF for A2A Function URL - Rate limiting and DDoS protection" \
        --visibility-config "SampledRequestsEnabled=true,CloudWatchMetricsEnabled=true,MetricName=${WAF_ACL_NAME}" 2>/dev/null || echo "")
    
    if [ -n "$CREATE_OUTPUT" ]; then
        ACL_ARN=$(echo "$CREATE_OUTPUT" | jq -r '.Summary.ARN' 2>/dev/null || echo "")
        echo -e "${GREEN}  ✅ Created WAF Web ACL${NC}"
        echo -e "${CYAN}  ARN: ${ACL_ARN}${NC}"
    else
        echo -e "${YELLOW}  ⚠️  WAF Web ACL creation may have failed - check AWS console${NC}"
    fi
fi

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                  ✅ WAF Configuration Complete! ✅              ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${CYAN}Next Steps:${NC}"
echo -e "1. Create CloudFront distribution pointing to Function URL:"
echo -e "   ${YELLOW}Origin: ${FUNCTION_URL}${NC}"
echo -e "   ${YELLOW}Origin Protocol: HTTPS only${NC}"
echo ""
echo -e "2. Associate WAF Web ACL with CloudFront distribution:"
echo -e "   ${YELLOW}Web ACL: ${WAF_ACL_NAME}${NC}"
echo -e "   ${YELLOW}Scope: CLOUDFRONT${NC}"
echo ""
echo -e "3. Update DNS/use CloudFront domain for A2A endpoints"
echo ""
echo -e "${CYAN}WAF Rules Configured:${NC}"
echo -e "  • Rate Limiting: 100 requests per 5 minutes per IP"
echo -e "  • AWS Managed Rules - Common Rule Set"
echo -e "  • AWS Managed Rules - Known Bad Inputs"
echo ""
echo -e "${CYAN}View WAF Web ACL:${NC}"
echo -e "  ${YELLOW}aws wafv2 get-web-acl --scope CLOUDFRONT --region us-east-1 --name ${WAF_ACL_NAME}${NC}"
echo ""
