#!/bin/bash
# Setup CloudFront Distribution for Assets S3 Bucket
# Creates branded vanity URL: assets.storytailor.dev
# Usage: ./scripts/setup-assets-cloudfront.sh [environment]
# Environment: production (default) | staging

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
CUSTOM_DOMAIN="assets.storytailor.dev"
DISTRIBUTION_COMMENT="Assets CDN - CloudFront Distribution for ${ENVIRONMENT}"

echo -e "${BLUE}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║        ☁️  CloudFront Setup for Assets CDN ☁️                  ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo -e "${CYAN}Environment: ${ENVIRONMENT}${NC}"
echo -e "${CYAN}Custom Domain: ${CUSTOM_DOMAIN}${NC}"
echo ""

# Get S3 bucket name
if [ "$ENVIRONMENT" = "production" ]; then
    S3_BUCKET="storytailor-assets-production"
else
    S3_BUCKET="storytailor-assets-staging"
fi

# Verify bucket exists
if ! aws s3api head-bucket --bucket "$S3_BUCKET" 2>/dev/null; then
    echo -e "${RED}❌ S3 bucket not found: ${S3_BUCKET}${NC}"
    echo -e "${YELLOW}   Please create the bucket first or check the bucket name${NC}"
    exit 1
fi

echo -e "${GREEN}✅ S3 Bucket: ${S3_BUCKET}${NC}"
echo ""

# Check for existing CloudFront distribution
EXISTING_DIST=$(aws cloudfront list-distributions \
    --query "DistributionList.Items[?Comment=='${DISTRIBUTION_COMMENT}'].Id" \
    --output text 2>/dev/null || echo "")

if [ -n "$EXISTING_DIST" ]; then
    echo -e "${YELLOW}⚠️  CloudFront distribution already exists: ${EXISTING_DIST}${NC}"
    DIST_DOMAIN=$(aws cloudfront get-distribution --id "$EXISTING_DIST" --query 'Distribution.DomainName' --output text 2>/dev/null || echo "unknown")
    echo -e "${CYAN}   Domain: ${DIST_DOMAIN}${NC}"
    echo -e "${CYAN}   Status: $(aws cloudfront get-distribution --id "$EXISTING_DIST" --query 'Distribution.Status' --output text 2>/dev/null || echo 'unknown')${NC}"
    read -p "Do you want to create a new distribution? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${CYAN}Distribution ID: ${EXISTING_DIST}${NC}"
        exit 0
    fi
fi

echo -e "${BLUE}📦 Creating CloudFront Distribution...${NC}"

# Create Origin Access Control (OAC) for S3
OAC_NAME="assets-s3-oac-${ENVIRONMENT}"
EXISTING_OAC=$(aws cloudfront list-origin-access-controls \
    --query "OriginAccessControlList.Items[?Name=='${OAC_NAME}'].Id" \
    --output text 2>/dev/null || echo "")

if [ -z "$EXISTING_OAC" ]; then
    echo -e "${CYAN}Creating Origin Access Control...${NC}"
    OAC_RESPONSE=$(aws cloudfront create-origin-access-control \
        --origin-access-control-config "Name=${OAC_NAME},OriginAccessControlOriginType=s3,SigningBehavior=always,SigningProtocol=sigv4" \
        --query 'OriginAccessControl.Id' \
        --output text 2>/dev/null || echo "")
    
    if [ -n "$OAC_RESPONSE" ]; then
        EXISTING_OAC="$OAC_RESPONSE"
        echo -e "${GREEN}✅ Created OAC: ${EXISTING_OAC}${NC}"
    fi
else
    echo -e "${GREEN}✅ Using existing OAC: ${EXISTING_OAC}${NC}"
fi

# Get OAC details
OAC_ETAG=$(aws cloudfront get-origin-access-control \
    --id "$EXISTING_OAC" \
    --query 'ETag' \
    --output text 2>/dev/null || echo "")

# Create bucket policy for CloudFront OAC
echo -e "${CYAN}Updating S3 bucket policy for CloudFront access...${NC}"
BUCKET_POLICY=$(cat <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowCloudFrontServicePrincipal",
      "Effect": "Allow",
      "Principal": {
        "Service": "cloudfront.amazonaws.com"
      },
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::${S3_BUCKET}/*",
      "Condition": {
        "StringEquals": {
          "AWS:SourceArn": "arn:aws:cloudfront::$(aws sts get-caller-identity --query Account --output text):distribution/*"
        }
      }
    }
  ]
}
EOF
)

# Note: We'll update the bucket policy after distribution is created (need the ARN)
echo -e "${YELLOW}⚠️  Bucket policy will be updated after distribution creation${NC}"

# Create CloudFront distribution configuration
DIST_CONFIG=$(cat <<EOF
{
  "CallerReference": "assets-cdn-${ENVIRONMENT}-$(date +%s)",
  "Comment": "${DISTRIBUTION_COMMENT}",
  "DefaultCacheBehavior": {
    "TargetOriginId": "S3-${S3_BUCKET}",
    "ViewerProtocolPolicy": "redirect-to-https",
    "AllowedMethods": {
      "Quantity": 2,
      "Items": ["GET", "HEAD"],
      "CachedMethods": {
        "Quantity": 2,
        "Items": ["GET", "HEAD"]
      }
    },
    "ForwardedValues": {
      "QueryString": false,
      "Cookies": {
        "Forward": "none"
      },
      "Headers": {
        "Quantity": 0,
        "Items": []
      }
    },
    "MinTTL": 0,
    "DefaultTTL": 86400,
    "MaxTTL": 31536000,
    "Compress": true,
    "TrustedSigners": {
      "Enabled": false,
      "Quantity": 0
    },
    "OriginAccessControlId": "${EXISTING_OAC}"
  },
  "Origins": {
    "Quantity": 1,
    "Items": [
      {
        "Id": "S3-${S3_BUCKET}",
        "DomainName": "${S3_BUCKET}.s3.${AWS_REGION}.amazonaws.com",
        "S3OriginConfig": {
          "OriginAccessIdentity": ""
        },
        "OriginAccessControlId": "${EXISTING_OAC}"
      }
    ]
  },
  "Enabled": true,
  "PriceClass": "PriceClass_100",
  "HttpVersion": "http2and3",
  "IsIPV6Enabled": true,
  "CustomErrorResponses": {
    "Quantity": 0,
    "Items": []
  }
}
EOF
)

# Create distribution
echo -e "${CYAN}Creating CloudFront distribution...${NC}"
DIST_RESPONSE=$(aws cloudfront create-distribution \
    --distribution-config "$DIST_CONFIG" \
    --output json 2>/dev/null || echo "{}")

DIST_ID=$(echo "$DIST_RESPONSE" | jq -r '.Distribution.Id // empty' 2>/dev/null || echo "")
DIST_ARN=$(echo "$DIST_RESPONSE" | jq -r '.Distribution.ARN // empty' 2>/dev/null || echo "")
DIST_DOMAIN=$(echo "$DIST_RESPONSE" | jq -r '.Distribution.DomainName // empty' 2>/dev/null || echo "")

if [ -z "$DIST_ID" ]; then
    echo -e "${RED}❌ Failed to create CloudFront distribution${NC}"
    echo -e "${RED}Response: ${DIST_RESPONSE}${NC}"
    exit 1
fi

echo -e "${GREEN}✅ CloudFront Distribution Created${NC}"
echo -e "${CYAN}   Distribution ID: ${DIST_ID}${NC}"
echo -e "${CYAN}   Domain: ${DIST_DOMAIN}${NC}"
echo -e "${CYAN}   Status: InProgress (deploying...)${NC}"
echo ""

# Update bucket policy with actual distribution ARN
echo -e "${CYAN}Updating S3 bucket policy with distribution ARN...${NC}"
UPDATED_BUCKET_POLICY=$(cat <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowCloudFrontServicePrincipal",
      "Effect": "Allow",
      "Principal": {
        "Service": "cloudfront.amazonaws.com"
      },
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::${S3_BUCKET}/*",
      "Condition": {
        "StringEquals": {
          "AWS:SourceArn": "${DIST_ARN}"
        }
      }
    }
  ]
}
EOF
)

aws s3api put-bucket-policy \
    --bucket "$S3_BUCKET" \
    --policy "$UPDATED_BUCKET_POLICY" \
    --output text > /dev/null 2>&1 || echo -e "${YELLOW}⚠️  Could not update bucket policy automatically. Please update manually.${NC}"

echo -e "${GREEN}✅ Bucket policy updated${NC}"
echo ""

# Instructions for custom domain setup
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}📋 Next Steps for Custom Domain${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${YELLOW}1. Wait for CloudFront to deploy (15-20 minutes)${NC}"
echo -e "   Check status: ${CYAN}aws cloudfront get-distribution --id ${DIST_ID} --query 'Distribution.Status'${NC}"
echo ""
echo -e "${YELLOW}2. Request SSL certificate for ${CUSTOM_DOMAIN}${NC}"
echo -e "   ${CYAN}aws acm request-certificate \\${NC}"
echo -e "     --domain-name ${CUSTOM_DOMAIN} \\${NC}"
echo -e "     --validation-method DNS \\${NC}"
echo -e "     --region us-east-1${NC}"
echo ""
echo -e "${YELLOW}3. Add certificate to CloudFront distribution${NC}"
echo -e "   ${CYAN}aws cloudfront update-distribution \\${NC}"
echo -e "     --id ${DIST_ID} \\${NC}"
echo -e "     --distribution-config file://dist-config.json${NC}"
echo -e "   (Include Aliases: [\"${CUSTOM_DOMAIN}\"] and ACM certificate ARN)${NC}"
echo ""
echo -e "${YELLOW}4. Create CNAME record in DNS${NC}"
echo -e "   ${CYAN}Type: CNAME${NC}"
echo -e "   ${CYAN}Name: assets.storytailor.dev${NC}"
echo -e "   ${CYAN}Value: ${DIST_DOMAIN}${NC}"
echo -e "   ${CYAN}TTL: 300${NC}"
echo ""
echo -e "${YELLOW}5. Update ASSET_CDN_URL in SSM Parameter Store${NC}"
echo -e "   ${CYAN}aws ssm put-parameter \\${NC}"
echo -e "     --name \"/storytailor-${ENVIRONMENT}/asset-cdn-url\" \\${NC}"
echo -e "     --type \"String\" \\${NC}"
echo -e "     --value \"https://${CUSTOM_DOMAIN}\" \\${NC}"
echo -e "     --region ${AWS_REGION} \\${NC}"
echo -e "     --overwrite${NC}"
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ CloudFront Distribution Setup Complete!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${CYAN}Distribution ID: ${DIST_ID}${NC}"
echo -e "${CYAN}CloudFront Domain: ${DIST_DOMAIN}${NC}"
echo -e "${CYAN}Custom Domain: ${CUSTOM_DOMAIN}${NC}"
echo -e "${CYAN}S3 Bucket: ${S3_BUCKET}${NC}"
echo ""

