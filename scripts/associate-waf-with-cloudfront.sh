#!/bin/bash
# Associate WAF Web ACL with CloudFront Distribution
# This script automates the WAF association process

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
DISTRIBUTION_ID=${2:-E3E123A9Y293GH}
WAF_ACL_NAME="a2a-function-url-waf-${ENVIRONMENT}"

echo -e "${BLUE}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║        🔗 Associate WAF with CloudFront Distribution 🔗        ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo -e "${CYAN}Environment: ${ENVIRONMENT}${NC}"
echo -e "${CYAN}Distribution ID: ${DISTRIBUTION_ID}${NC}"
echo -e "${CYAN}WAF ACL Name: ${WAF_ACL_NAME}${NC}"
echo ""

# Check if distribution exists
DIST_STATUS=$(aws cloudfront get-distribution \
  --id "$DISTRIBUTION_ID" \
  --query 'Distribution.Status' \
  --output text 2>/dev/null || echo "")

if [ -z "$DIST_STATUS" ]; then
    echo -e "${RED}❌ CloudFront distribution not found: ${DISTRIBUTION_ID}${NC}"
    exit 1
fi

if [ "$DIST_STATUS" != "Deployed" ]; then
    echo -e "${YELLOW}⚠️  CloudFront distribution is not deployed yet (Status: ${DIST_STATUS})${NC}"
    echo -e "${YELLOW}   WAF can only be associated with deployed distributions${NC}"
    echo -e "${CYAN}   Wait for deployment to complete, then run this script again${NC}"
    exit 1
fi

echo -e "${GREEN}✅ CloudFront distribution is deployed${NC}"

# Check if WAF already associated
CURRENT_WAF=$(aws cloudfront get-distribution \
  --id "$DISTRIBUTION_ID" \
  --query 'Distribution.DistributionConfig.WebACLId' \
  --output text 2>/dev/null || echo "")

if [ -n "$CURRENT_WAF" ] && [ "$CURRENT_WAF" != "None" ] && [ "$CURRENT_WAF" != "" ]; then
    echo -e "${YELLOW}⚠️  WAF already associated: ${CURRENT_WAF}${NC}"
    read -p "Do you want to update it? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}Skipping WAF association${NC}"
        exit 0
    fi
fi

# Get WAF Web ACL ID
echo -e "${BLUE}📋 Getting WAF Web ACL...${NC}"
WAF_ACL_ID=$(aws wafv2 list-web-acls \
    --scope CLOUDFRONT \
    --region us-east-1 \
    --query "WebACLs[?Name=='${WAF_ACL_NAME}'].Id" \
    --output text 2>/dev/null || echo "")

if [ -z "$WAF_ACL_ID" ]; then
    echo -e "${RED}❌ WAF Web ACL not found: ${WAF_ACL_NAME}${NC}"
    echo -e "${YELLOW}   Run: ./scripts/setup-a2a-waf.sh ${ENVIRONMENT}${NC}"
    exit 1
fi

WAF_ACL_ARN=$(aws wafv2 get-web-acl \
    --scope CLOUDFRONT \
    --region us-east-1 \
    --name "$WAF_ACL_NAME" \
    --id "$WAF_ACL_ID" \
    --query 'WebACL.Arn' \
    --output text 2>/dev/null || echo "")

echo -e "${GREEN}✅ Found WAF Web ACL: ${WAF_ACL_NAME} (${WAF_ACL_ID})${NC}"

# Get current distribution config and ETag
echo -e "${BLUE}📥 Getting CloudFront distribution config...${NC}"
ETAG=$(aws cloudfront get-distribution-config \
    --id "$DISTRIBUTION_ID" \
    --query 'ETag' \
    --output text 2>/dev/null || echo "")

if [ -z "$ETAG" ]; then
    echo -e "${RED}❌ Failed to get distribution config${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Got ETag: ${ETAG}${NC}"

# Get distribution config JSON
CONFIG_FILE="/tmp/cloudfront-config-${DISTRIBUTION_ID}.json"
aws cloudfront get-distribution-config \
    --id "$DISTRIBUTION_ID" \
    --query 'DistributionConfig' \
    --output json > "$CONFIG_FILE"

# Update config with WAF Web ACL ID
echo -e "${BLUE}🔧 Updating config with WAF Web ACL ID...${NC}"
jq ".WebACLId = \"${WAF_ACL_ARN}\"" "$CONFIG_FILE" > "${CONFIG_FILE}.updated"
mv "${CONFIG_FILE}.updated" "$CONFIG_FILE"

# Update distribution
echo -e "${BLUE}📤 Updating CloudFront distribution...${NC}"
UPDATE_OUTPUT=$(aws cloudfront update-distribution \
    --id "$DISTRIBUTION_ID" \
    --distribution-config "file://${CONFIG_FILE}" \
    --if-match "$ETAG" \
    --output json 2>&1 || echo "")

if [ -n "$UPDATE_OUTPUT" ]; then
    NEW_ETAG=$(echo "$UPDATE_OUTPUT" | jq -r '.ETag' 2>/dev/null || echo "")
    NEW_STATUS=$(echo "$UPDATE_OUTPUT" | jq -r '.Distribution.Status' 2>/dev/null || echo "")
    
    if [ -n "$NEW_ETAG" ]; then
        echo -e "${GREEN}✅ WAF successfully associated with CloudFront distribution${NC}"
        echo -e "${CYAN}  New ETag: ${NEW_ETAG}${NC}"
        echo -e "${CYAN}  Distribution Status: ${NEW_STATUS}${NC}"
        echo ""
        echo -e "${YELLOW}⚠️  Note: Distribution will need to redeploy (15-20 minutes)${NC}"
        echo -e "${CYAN}  Monitor status:${NC}"
        echo -e "${YELLOW}  aws cloudfront get-distribution --id ${DISTRIBUTION_ID} --query 'Distribution.Status'${NC}"
    else
        echo -e "${RED}❌ Failed to associate WAF${NC}"
        echo "$UPDATE_OUTPUT"
        exit 1
    fi
else
    echo -e "${RED}❌ Failed to update distribution${NC}"
    exit 1
fi

# Cleanup
rm -f "$CONFIG_FILE"

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║              ✅ WAF Association Complete! ✅                   ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${CYAN}Next Steps:${NC}"
echo -e "1. Wait for distribution redeployment (15-20 minutes)"
echo -e "2. Verify WAF is blocking excessive requests"
echo -e "3. Monitor WAF metrics in CloudWatch"
echo ""
