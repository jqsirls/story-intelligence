#!/bin/bash
# Setup CloudFront Distribution for A2A Function URL
# Enables WAF protection and better performance

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
DISTRIBUTION_COMMENT="A2A Function URL - CloudFront Distribution for ${ENVIRONMENT}"

echo -e "${BLUE}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║        ☁️  CloudFront Setup for A2A Function URL ☁️            ║${NC}"
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

# Extract domain from Function URL
FUNCTION_DOMAIN=$(echo "$FUNCTION_URL" | sed 's|https://||' | sed 's|/.*||')
echo -e "${CYAN}Function Domain: ${FUNCTION_DOMAIN}${NC}"
echo ""

# Check if WAF Web ACL exists
WAF_ACL_NAME="a2a-function-url-waf-${ENVIRONMENT}"
WAF_ACL_ID=$(aws wafv2 list-web-acls \
    --scope CLOUDFRONT \
    --region us-east-1 \
    --query "WebACLs[?Name=='${WAF_ACL_NAME}'].Id" \
    --output text 2>/dev/null || echo "")

if [ -z "$WAF_ACL_ID" ]; then
    echo -e "${YELLOW}⚠️  WAF Web ACL not found. Creating it first...${NC}"
    echo -e "${CYAN}   Run: ./scripts/setup-a2a-waf.sh ${ENVIRONMENT}${NC}"
    read -p "Do you want to create WAF Web ACL now? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        ./scripts/setup-a2a-waf.sh "$ENVIRONMENT"
        WAF_ACL_ID=$(aws wafv2 list-web-acls \
            --scope CLOUDFRONT \
            --region us-east-1 \
            --query "WebACLs[?Name=='${WAF_ACL_NAME}'].Id" \
            --output text 2>/dev/null || echo "")
    fi
fi

WAF_ACL_ARN=""
if [ -n "$WAF_ACL_ID" ]; then
    WAF_ACL_ARN=$(aws wafv2 get-web-acl \
        --scope CLOUDFRONT \
        --region us-east-1 \
        --name "$WAF_ACL_NAME" \
        --id "$WAF_ACL_ID" \
        --query 'WebACL.Arn' \
        --output text 2>/dev/null || echo "")
    echo -e "${GREEN}✅ WAF Web ACL: ${WAF_ACL_NAME} (${WAF_ACL_ARN})${NC}"
else
    echo -e "${YELLOW}⚠️  Continuing without WAF (can be added later)${NC}"
fi

# Check for existing CloudFront distribution
EXISTING_DIST=$(aws cloudfront list-distributions \
    --query "DistributionList.Items[?Comment=='${DISTRIBUTION_COMMENT}'].Id" \
    --output text 2>/dev/null || echo "")

if [ -n "$EXISTING_DIST" ]; then
    echo -e "${YELLOW}⚠️  CloudFront distribution already exists: ${EXISTING_DIST}${NC}"
    read -p "Do you want to update it? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${CYAN}Distribution ID: ${EXISTING_DIST}${NC}"
        echo -e "${CYAN}Domain: $(aws cloudfront get-distribution --id "$EXISTING_DIST" --query 'Distribution.DomainName' --output text 2>/dev/null || echo 'unknown')${NC}"
        exit 0
    fi
fi

echo -e "${BLUE}📦 Creating CloudFront Distribution...${NC}"

# Create CloudFront distribution configuration
DIST_CONFIG=$(cat <<EOF
{
  "CallerReference": "a2a-function-url-${ENVIRONMENT}-$(date +%s)",
  "Comment": "${DISTRIBUTION_COMMENT}",
  "DefaultCacheBehavior": {
    "TargetOriginId": "a2a-function-url-origin",
    "ViewerProtocolPolicy": "redirect-to-https",
    "AllowedMethods": {
      "Quantity": 7,
      "Items": ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"],
      "CachedMethods": {
        "Quantity": 2,
        "Items": ["GET", "HEAD"]
      }
    },
    "ForwardedValues": {
      "QueryString": true,
      "Cookies": {
        "Forward": "none"
      },
      "Headers": {
        "Quantity": 4,
        "Items": ["Host", "X-API-Key", "Authorization", "Content-Type"]
      }
    },
    "MinTTL": 0,
    "DefaultTTL": 0,
    "MaxTTL": 0,
    "Compress": true,
    "TrustedSigners": {
      "Enabled": false,
      "Quantity": 0
    }
  },
  "Origins": {
    "Quantity": 1,
    "Items": [
      {
        "Id": "a2a-function-url-origin",
        "DomainName": "${FUNCTION_DOMAIN}",
        "CustomOriginConfig": {
          "HTTPPort": 443,
          "HTTPSPort": 443,
          "OriginProtocolPolicy": "https-only",
          "OriginSslProtocols": {
            "Quantity": 1,
            "Items": ["TLSv1.2"]
          },
          "OriginReadTimeout": 60,
          "OriginKeepaliveTimeout": 5
        }
      }
    ]
  },
  "Enabled": true,
  "PriceClass": "PriceClass_100",
  "HttpVersion": "http2and3",
  "IsIPV6Enabled": true
}
EOF
)

if [ -n "$EXISTING_DIST" ]; then
    echo -e "${YELLOW}Updating existing distribution...${NC}"
    # Get current config
    CURRENT_CONFIG=$(aws cloudfront get-distribution-config --id "$EXISTING_DIST" --query 'DistributionConfig' --output json 2>/dev/null || echo "{}")
    
    # Update config (simplified - full update requires ETag)
    echo -e "${YELLOW}⚠️  Full distribution update requires ETag. Use AWS Console or update manually.${NC}"
    echo -e "${CYAN}Distribution ID: ${EXISTING_DIST}${NC}"
else
    echo -e "${YELLOW}Creating new distribution...${NC}"
    CREATE_OUTPUT=$(aws cloudfront create-distribution \
        --distribution-config "$DIST_CONFIG" \
        --output json 2>/dev/null || echo "")
    
    if [ -n "$CREATE_OUTPUT" ]; then
        DIST_ID=$(echo "$CREATE_OUTPUT" | jq -r '.Distribution.Id' 2>/dev/null || echo "")
        DIST_DOMAIN=$(echo "$CREATE_OUTPUT" | jq -r '.Distribution.DomainName' 2>/dev/null || echo "")
        
        if [ -n "$DIST_ID" ]; then
            echo -e "${GREEN}✅ CloudFront distribution created${NC}"
            echo -e "${CYAN}  Distribution ID: ${DIST_ID}${NC}"
            echo -e "${CYAN}  Domain: ${DIST_DOMAIN}${NC}"
            
            # Associate WAF if available
            if [ -n "$WAF_ACL_ARN" ]; then
                echo ""
                echo -e "${BLUE}🔗 Associating WAF Web ACL...${NC}"
                # Note: WAF association requires distribution update with ETag
                echo -e "${YELLOW}⚠️  WAF association requires distribution update with ETag${NC}"
                echo -e "${CYAN}   Use AWS Console or run:${NC}"
                echo -e "${YELLOW}   aws cloudfront get-distribution-config --id ${DIST_ID}${NC}"
                echo -e "${YELLOW}   # Then update WebACLId in the config and update-distribution${NC}"
            fi
        else
            echo -e "${RED}❌ Failed to create distribution${NC}"
            exit 1
        fi
    else
        echo -e "${RED}❌ Failed to create distribution${NC}"
        exit 1
    fi
fi

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║            ✅ CloudFront Setup Complete! ✅                    ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${CYAN}Next Steps:${NC}"
echo -e "1. Wait for distribution deployment (15-20 minutes)"
echo -e "2. Associate WAF Web ACL (if not done automatically)"
echo -e "3. Update DNS/CNAME to point to CloudFront domain"
echo -e "4. Test A2A endpoints via CloudFront domain"
echo ""
if [ -n "$DIST_ID" ]; then
    echo -e "${CYAN}Distribution Details:${NC}"
    echo -e "  ID: ${DIST_ID}"
    echo -e "  Domain: ${DIST_DOMAIN}"
    echo -e "  Status: $(aws cloudfront get-distribution --id "$DIST_ID" --query 'Distribution.Status' --output text 2>/dev/null || echo 'unknown')"
    echo ""
    echo -e "${CYAN}Check deployment status:${NC}"
    echo -e "  ${YELLOW}aws cloudfront get-distribution --id ${DIST_ID} --query 'Distribution.Status'${NC}"
fi
echo ""
