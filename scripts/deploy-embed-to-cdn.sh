#!/bin/bash
#
# Deploy Storytailor Embed Widget to CDN (S3 + CloudFront)
# Usage: ./scripts/deploy-embed-to-cdn.sh [environment]
# Environment: production (default) | staging
#

set -e

ENVIRONMENT="${1:-production}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
EMBED_DIR="$PROJECT_ROOT/packages/storytailor-embed"

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Deploying Storytailor Embed Widget to CDN${NC}"
echo -e "${YELLOW}Environment: $ENVIRONMENT${NC}"

# Configuration
if [ "$ENVIRONMENT" = "production" ]; then
    S3_BUCKET="storytailor-cdn-production"
    CLOUDFRONT_DISTRIBUTION_ID="E1234567890ABC" # TODO: Replace with actual CloudFront distribution ID
    CDN_PATH="embed/v1"
else
    S3_BUCKET="storytailor-cdn-staging"
    CLOUDFRONT_DISTRIBUTION_ID="E0987654321XYZ" # TODO: Replace with actual CloudFront distribution ID
    CDN_PATH="embed/staging"
fi

# Step 1: Build the embed package
echo -e "\n${YELLOW}📦 Building embed package...${NC}"
cd "$EMBED_DIR"

if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install --no-workspaces
fi

npm run build

if [ ! -d "dist" ]; then
    echo -e "${RED}❌ Build failed - dist directory not found${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Build complete${NC}"

# Step 2: Upload to S3
echo -e "\n${YELLOW}☁️  Uploading to S3: s3://$S3_BUCKET/$CDN_PATH/${NC}"

# Upload main files with cache control
aws s3 cp dist/storytailor-embed.js \
    "s3://$S3_BUCKET/$CDN_PATH/storytailor-embed.js" \
    --content-type "application/javascript" \
    --cache-control "public, max-age=3600" \
    --metadata-directive REPLACE

aws s3 cp dist/storytailor-embed.min.js \
    "s3://$S3_BUCKET/$CDN_PATH/storytailor-embed.min.js" \
    --content-type "application/javascript" \
    --cache-control "public, max-age=3600" \
    --metadata-directive REPLACE

# Upload ESM version
aws s3 cp dist/storytailor-embed.esm.js \
    "s3://$S3_BUCKET/$CDN_PATH/storytailor-embed.esm.js" \
    --content-type "application/javascript" \
    --cache-control "public, max-age=3600" \
    --metadata-directive REPLACE

# Upload CommonJS version
aws s3 cp dist/storytailor-embed.cjs.js \
    "s3://$S3_BUCKET/$CDN_PATH/storytailor-embed.cjs.js" \
    --content-type "application/javascript" \
    --cache-control "public, max-age=3600" \
    --metadata-directive REPLACE

# Upload source maps (with longer cache)
aws s3 cp dist/storytailor-embed.js.map \
    "s3://$S3_BUCKET/$CDN_PATH/storytailor-embed.js.map" \
    --content-type "application/json" \
    --cache-control "public, max-age=31536000" \
    --metadata-directive REPLACE

aws s3 cp dist/storytailor-embed.min.js.map \
    "s3://$S3_BUCKET/$CDN_PATH/storytailor-embed.min.js.map" \
    --content-type "application/json" \
    --cache-control "public, max-age=31536000" \
    --metadata-directive REPLACE

# Upload TypeScript definitions
aws s3 cp dist/index.d.ts \
    "s3://$S3_BUCKET/$CDN_PATH/index.d.ts" \
    --content-type "text/plain" \
    --cache-control "public, max-age=31536000" \
    --metadata-directive REPLACE

echo -e "${GREEN}✅ Files uploaded to S3${NC}"

# Step 3: Invalidate CloudFront cache
echo -e "\n${YELLOW}🔄 Invalidating CloudFront cache...${NC}"

INVALIDATION_ID=$(aws cloudfront create-invalidation \
    --distribution-id "$CLOUDFRONT_DISTRIBUTION_ID" \
    --paths "/$CDN_PATH/*" \
    --query 'Invalidation.Id' \
    --output text)

echo -e "${GREEN}✅ CloudFront invalidation created: $INVALIDATION_ID${NC}"
echo "Waiting for invalidation to complete (this may take a few minutes)..."

aws cloudfront wait invalidation-completed \
    --distribution-id "$CLOUDFRONT_DISTRIBUTION_ID" \
    --id "$INVALIDATION_ID" 2>/dev/null || true

echo -e "${GREEN}✅ CloudFront cache invalidated${NC}"

# Step 4: Test the deployment
echo -e "\n${YELLOW}🧪 Testing deployment...${NC}"

if [ "$ENVIRONMENT" = "production" ]; then
    CDN_URL="https://cdn.storytailor.com/$CDN_PATH/storytailor-embed.js"
else
    CDN_URL="https://cdn-staging.storytailor.com/$CDN_PATH/storytailor-embed.js"
fi

HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$CDN_URL")

if [ "$HTTP_STATUS" = "200" ]; then
    echo -e "${GREEN}✅ Deployment successful!${NC}"
    echo -e "\n${GREEN}📦 Widget is now available at:${NC}"
    echo -e "   ${YELLOW}$CDN_URL${NC}"
    echo -e "\n${GREEN}📝 Integration code:${NC}"
    echo -e "${YELLOW}<script src=\"$CDN_URL\"></script>${NC}"
else
    echo -e "${RED}❌ Deployment test failed (HTTP $HTTP_STATUS)${NC}"
    exit 1
fi

# Step 5: Create version tag
VERSION=$(node -p "require('$EMBED_DIR/package.json').version")
echo -e "\n${YELLOW}🏷️  Creating version tag: v$VERSION${NC}"

# Upload versioned copy
aws s3 cp dist/storytailor-embed.min.js \
    "s3://$S3_BUCKET/embed/v$VERSION/storytailor-embed.min.js" \
    --content-type "application/javascript" \
    --cache-control "public, max-age=31536000, immutable" \
    --metadata-directive REPLACE

echo -e "${GREEN}✅ Versioned copy uploaded: embed/v$VERSION/${NC}"

# Summary
echo -e "\n${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🎉 Deployment Complete!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "\n${YELLOW}CDN URLs:${NC}"
echo -e "  Latest:    $CDN_URL"
echo -e "  Minified:  ${CDN_URL%.js}.min.js"
echo -e "  Versioned: https://cdn.storytailor.com/embed/v$VERSION/storytailor-embed.min.js"
echo -e "\n${YELLOW}Next Steps:${NC}"
echo -e "  1. Test the widget in a browser"
echo -e "  2. Update documentation with new CDN URLs"
echo -e "  3. Notify partners of the new version"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

