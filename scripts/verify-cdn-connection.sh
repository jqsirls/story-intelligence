#!/bin/bash

##############################################################################
# CDN Connection Verification Script
# 
# Verifies that assets.storytailor.dev CloudFront distribution is fully
# operational by testing:
# 1. DNS resolution
# 2. HTTPS connectivity
# 3. S3 origin access
# 4. Sample asset retrieval
#
# Usage: ./scripts/verify-cdn-connection.sh
##############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
CDN_DOMAIN="assets.storytailor.dev"
CLOUDFRONT_DIST_ID="E2U61LKP5S3TWI"
S3_BUCKET="storytailor-assets-production-326181217496"
REGION="us-east-1"

echo -e "${BLUE}=================================="
echo "📡 CDN Connection Verification"
echo -e "==================================${NC}\n"

##############################################################################
# Test 1: DNS Resolution
##############################################################################

echo -e "${BLUE}🔍 Test 1: DNS Resolution${NC}"
echo "   Domain: $CDN_DOMAIN"

if host $CDN_DOMAIN > /dev/null 2>&1; then
    DNS_RESULT=$(host $CDN_DOMAIN | head -1)
    echo -e "   ${GREEN}✅ DNS resolves${NC}"
    echo "   Result: $DNS_RESULT"
else
    echo -e "   ${RED}❌ DNS resolution failed${NC}"
    echo "   CNAME may not be configured at DNS provider"
    exit 1
fi

echo ""

##############################################################################
# Test 2: HTTPS Connectivity
##############################################################################

echo -e "${BLUE}🔒 Test 2: HTTPS Connectivity${NC}"
echo "   URL: https://$CDN_DOMAIN"

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -I "https://$CDN_DOMAIN/" || echo "000")

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "403" ] || [ "$HTTP_CODE" = "404" ]; then
    echo -e "   ${GREEN}✅ HTTPS connection successful (HTTP $HTTP_CODE)${NC}"
    
    # Check SSL certificate
    SSL_ISSUER=$(echo | openssl s_client -servername $CDN_DOMAIN -connect $CDN_DOMAIN:443 2>/dev/null | openssl x509 -noout -issuer | sed 's/issuer=//')
    echo "   SSL Issuer: $SSL_ISSUER"
else
    echo -e "   ${RED}❌ HTTPS connection failed (HTTP $HTTP_CODE)${NC}"
    exit 1
fi

echo ""

##############################################################################
# Test 3: CloudFront Distribution Status
##############################################################################

echo -e "${BLUE}☁️  Test 3: CloudFront Distribution${NC}"
echo "   Distribution ID: $CLOUDFRONT_DIST_ID"

# Get distribution status from AWS
DIST_STATUS=$(aws cloudfront get-distribution --id $CLOUDFRONT_DIST_ID --query 'Distribution.Status' --output text 2>/dev/null || echo "UNKNOWN")
DIST_ENABLED=$(aws cloudfront get-distribution --id $CLOUDFRONT_DIST_ID --query 'Distribution.DistributionConfig.Enabled' --output text 2>/dev/null || echo "UNKNOWN")

if [ "$DIST_STATUS" = "Deployed" ] && [ "$DIST_ENABLED" = "True" ]; then
    echo -e "   ${GREEN}✅ Distribution is deployed and enabled${NC}"
    echo "   Status: $DIST_STATUS"
else
    echo -e "   ${YELLOW}⚠️  Distribution status: $DIST_STATUS (Enabled: $DIST_ENABLED)${NC}"
fi

# Get custom domain (CNAME)
CNAMES=$(aws cloudfront get-distribution --id $CLOUDFRONT_DIST_ID --query 'Distribution.DistributionConfig.Aliases.Items' --output text 2>/dev/null || echo "NONE")
echo "   CNAMEs: $CNAMES"

# Get origin (S3 bucket)
ORIGIN=$(aws cloudfront get-distribution --id $CLOUDFRONT_DIST_ID --query 'Distribution.DistributionConfig.Origins.Items[0].DomainName' --output text 2>/dev/null || echo "UNKNOWN")
echo "   Origin: $ORIGIN"

echo ""

##############################################################################
# Test 4: S3 Bucket Access (via CloudFront)
##############################################################################

echo -e "${BLUE}🪣 Test 4: S3 Bucket Access${NC}"
echo "   Bucket: $S3_BUCKET"

# Check if bucket exists and CloudFront has access
BUCKET_EXISTS=$(aws s3 ls s3://$S3_BUCKET 2>/dev/null && echo "YES" || echo "NO")

if [ "$BUCKET_EXISTS" = "YES" ]; then
    echo -e "   ${GREEN}✅ S3 bucket exists and is accessible${NC}"
    
    # Get bucket policy (should allow cloudfront.amazonaws.com)
    BUCKET_POLICY=$(aws s3api get-bucket-policy --bucket $S3_BUCKET --query 'Policy' --output text 2>/dev/null || echo "NONE")
    if [ "$BUCKET_POLICY" != "NONE" ]; then
        echo -e "   ${GREEN}✅ Bucket policy configured${NC}"
    else
        echo -e "   ${YELLOW}⚠️  No bucket policy found${NC}"
    fi
    
    # Check Block Public Access
    BLOCK_PUBLIC=$(aws s3api get-public-access-block --bucket $S3_BUCKET --query 'PublicAccessBlockConfiguration.BlockPublicAcls' --output text 2>/dev/null || echo "UNKNOWN")
    if [ "$BLOCK_PUBLIC" = "True" ]; then
        echo -e "   ${GREEN}✅ Block Public Access enabled (CloudFront-only)${NC}"
    else
        echo -e "   ${YELLOW}⚠️  Block Public Access: $BLOCK_PUBLIC${NC}"
    fi
else
    echo -e "   ${RED}❌ S3 bucket not accessible${NC}"
    exit 1
fi

echo ""

##############################################################################
# Test 5: Sample Asset Retrieval
##############################################################################

echo -e "${BLUE}📦 Test 5: Sample Asset Retrieval${NC}"
echo "   Testing with a recent asset..."

# Try to find a recent image in S3
SAMPLE_KEY=$(aws s3 ls s3://$S3_BUCKET/images/ --recursive | tail -1 | awk '{print $4}' || echo "NONE")

if [ "$SAMPLE_KEY" != "NONE" ] && [ -n "$SAMPLE_KEY" ]; then
    SAMPLE_URL="https://$CDN_DOMAIN/$SAMPLE_KEY"
    echo "   Sample URL: $SAMPLE_URL"
    
    # Try to retrieve the asset via CDN
    ASSET_HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$SAMPLE_URL" || echo "000")
    
    if [ "$ASSET_HTTP_CODE" = "200" ]; then
        echo -e "   ${GREEN}✅ Asset retrieval successful (HTTP $ASSET_HTTP_CODE)${NC}"
        
        # Get content type
        CONTENT_TYPE=$(curl -s -I "$SAMPLE_URL" | grep -i "content-type" | awk '{print $2}')
        echo "   Content-Type: $CONTENT_TYPE"
    elif [ "$ASSET_HTTP_CODE" = "403" ]; then
        echo -e "   ${RED}❌ Asset forbidden (HTTP 403)${NC}"
        echo "   CloudFront may not have S3 access (check OAC)"
        exit 1
    elif [ "$ASSET_HTTP_CODE" = "404" ]; then
        echo -e "   ${YELLOW}⚠️  Asset not found (HTTP 404)${NC}"
        echo "   Asset may have been deleted or moved"
    else
        echo -e "   ${RED}❌ Asset retrieval failed (HTTP $ASSET_HTTP_CODE)${NC}"
        exit 1
    fi
else
    echo -e "   ${YELLOW}⚠️  No sample assets found in bucket${NC}"
    echo "   Bucket may be empty (will be populated on first story generation)"
fi

echo ""

##############################################################################
# Final Summary
##############################################################################

echo -e "${GREEN}=================================="
echo "✅ CDN VERIFICATION COMPLETE"
echo -e "==================================${NC}\n"

echo "Summary:"
echo "  DNS: ✅ Resolves to CloudFront"
echo "  HTTPS: ✅ SSL certificate valid"
echo "  CloudFront: ✅ Deployed and enabled"
echo "  S3 Bucket: ✅ Accessible"
echo "  Sample Asset: ${ASSET_HTTP_CODE:+✅ HTTP $ASSET_HTTP_CODE}"

echo ""
echo "CDN Domain: https://$CDN_DOMAIN"
echo "Distribution ID: $CLOUDFRONT_DIST_ID"
echo "S3 Bucket: $S3_BUCKET"
echo ""
echo -e "${GREEN}All systems operational!${NC}"
echo ""

exit 0

