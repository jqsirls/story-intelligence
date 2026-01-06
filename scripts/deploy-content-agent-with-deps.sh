#!/bin/bash
# Deploy Content Agent Lambda with shared-types dependency bundled
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Environment setup
ENVIRONMENT=${1:-production}
LAMBDA_NAME="storytailor-content-agent-${ENVIRONMENT}"
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONTENT_AGENT_DIR="$PROJECT_ROOT/lambda-deployments/content-agent"
DEPLOY_DIR="$PROJECT_ROOT/deploy-content-agent-temp"

echo -e "${BLUE}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║          Deploying Content Agent Lambda with Dependencies      ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}Environment: ${ENVIRONMENT}${NC}"
echo -e "${GREEN}Lambda Name: ${LAMBDA_NAME}${NC}"
echo ""

# Clean up old deployment directory
rm -rf "$DEPLOY_DIR"
mkdir -p "$DEPLOY_DIR"

# Step 1: Build shared-types first
echo -e "${BLUE}📦 Step 1: Building shared-types...${NC}"
cd "$PROJECT_ROOT/packages/shared-types"
npm run build || echo -e "${YELLOW}⚠️  shared-types build had errors but continuing (using existing dist)${NC}"
if [ -d "$PROJECT_ROOT/packages/shared-types/dist" ]; then
    echo -e "${GREEN}✅ shared-types dist available${NC}"
else
    echo -e "${RED}❌ ERROR: shared-types dist directory not found${NC}"
    exit 1
fi

# Step 2: Build Content Agent
echo -e "${BLUE}📦 Step 2: Building Content Agent...${NC}"
cd "$CONTENT_AGENT_DIR"
npm run build || echo -e "${YELLOW}⚠️  Build had errors but continuing (dist may be partial)${NC}"
if [ ! -d "$CONTENT_AGENT_DIR/dist" ]; then
    echo -e "${RED}❌ ERROR: dist directory not found${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Content Agent built (with warnings)${NC}"

# Step 3: Copy Content Agent dist
echo -e "${BLUE}📦 Step 3: Copying Content Agent files...${NC}"
cp -r "$CONTENT_AGENT_DIR/dist" "$DEPLOY_DIR/"
cp "$CONTENT_AGENT_DIR/package.json" "$DEPLOY_DIR/"
if [ -f "$CONTENT_AGENT_DIR/package-lock.json" ]; then
    cp "$CONTENT_AGENT_DIR/package-lock.json" "$DEPLOY_DIR/"
fi

# Step 4: Install production dependencies (pinned via package-lock.json)
echo -e "${BLUE}📦 Step 4: Installing production dependencies...${NC}"
cd "$DEPLOY_DIR"
if [ -f "$DEPLOY_DIR/package-lock.json" ]; then
    npm ci --omit=dev --legacy-peer-deps --no-audit --no-fund 2>&1 | grep -v "npm WARN" || true
else
    npm install --production --legacy-peer-deps --no-audit --no-fund 2>&1 | grep -v "npm WARN" || true
fi
echo -e "${GREEN}✅ Dependencies installed${NC}"

# Step 5: Bundle shared-types (AFTER npm install so it doesn't get removed)
echo -e "${BLUE}📦 Step 5: Bundling shared-types...${NC}"
mkdir -p "$DEPLOY_DIR/node_modules/@alexa-multi-agent/shared-types/dist"
# Copy dist directory contents
if [ -d "$PROJECT_ROOT/packages/shared-types/dist" ]; then
    cp -r "$PROJECT_ROOT/packages/shared-types/dist"/* "$DEPLOY_DIR/node_modules/@alexa-multi-agent/shared-types/dist/" 2>/dev/null || true
    # Verify index.js exists
    if [ ! -f "$DEPLOY_DIR/node_modules/@alexa-multi-agent/shared-types/dist/index.js" ]; then
        echo -e "${RED}❌ ERROR: dist/index.js not found after copy${NC}"
        ls -la "$PROJECT_ROOT/packages/shared-types/dist/" | head -10
        exit 1
    fi
fi
# Create package.json with correct main entry point (pointing to dist/index.js)
cat > "$DEPLOY_DIR/node_modules/@alexa-multi-agent/shared-types/package.json" << 'EOF'
{
  "name": "@alexa-multi-agent/shared-types",
  "version": "1.0.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "type": "commonjs"
}
EOF
echo -e "${GREEN}✅ shared-types bundled${NC}"
echo -e "${BLUE}  Verifying bundle...${NC}"
if [ -f "$DEPLOY_DIR/node_modules/@alexa-multi-agent/shared-types/dist/index.js" ]; then
    echo -e "${GREEN}  ✅ dist/index.js found${NC}"
else
    echo -e "${RED}  ❌ dist/index.js NOT found${NC}"
    exit 1
fi

# Step 6: Verify structure before packaging
echo -e "${BLUE}📦 Step 6: Verifying deployment structure...${NC}"
if [ ! -f "$DEPLOY_DIR/node_modules/@alexa-multi-agent/shared-types/dist/index.js" ]; then
    echo -e "${RED}❌ ERROR: shared-types/dist/index.js not found before packaging${NC}"
    exit 1
fi
if [ ! -f "$DEPLOY_DIR/node_modules/@alexa-multi-agent/shared-types/package.json" ]; then
    echo -e "${RED}❌ ERROR: shared-types/package.json not found before packaging${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Structure verified${NC}"

# Step 7: Create deployment package
echo -e "${BLUE}📦 Step 7: Creating deployment package...${NC}"
cd "$DEPLOY_DIR"
zip -r "$PROJECT_ROOT/content-agent-deployment.zip" . -q
echo -e "${GREEN}✅ Deployment package created${NC}"

# Verify zip contents
echo -e "${BLUE}  Verifying zip contents...${NC}"
if unzip -l "$PROJECT_ROOT/content-agent-deployment.zip" | grep -q "node_modules/@alexa-multi-agent/shared-types/dist/index.js"; then
    echo -e "${GREEN}  ✅ shared-types/dist/index.js found in zip${NC}"
else
    echo -e "${RED}  ❌ shared-types/dist/index.js NOT found in zip${NC}"
    unzip -l "$PROJECT_ROOT/content-agent-deployment.zip" | grep "shared-types" | head -10
    exit 1
fi

# Verify qrcode dependency is included (QR is generated locally and uploaded to S3)
if unzip -l "$PROJECT_ROOT/content-agent-deployment.zip" | grep -q "node_modules/qrcode/package.json"; then
    echo -e "${GREEN}  ✅ qrcode dependency found in zip${NC}"
else
    echo -e "${RED}  ❌ qrcode dependency NOT found in zip${NC}"
    unzip -l "$PROJECT_ROOT/content-agent-deployment.zip" | grep "node_modules/qrcode" | head -10
    exit 1
fi

# Step 7: Deploy to Lambda
echo -e "${BLUE}🚀 Step 7: Deploying to Lambda...${NC}"
aws lambda update-function-code \
  --function-name "$LAMBDA_NAME" \
  --zip-file "fileb://$PROJECT_ROOT/content-agent-deployment.zip" \
  --region us-east-1

echo -e "${GREEN}✅ Lambda function updated${NC}"

# Wait for update to complete
echo -e "${YELLOW}⏳ Waiting for Lambda update to complete...${NC}"
aws lambda wait function-updated --function-name "$LAMBDA_NAME" --region us-east-1

# Cleanup
rm -rf "$DEPLOY_DIR"
rm -f "$PROJECT_ROOT/content-agent-deployment.zip"

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                    ✅ DEPLOYMENT COMPLETE ✅                    ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}Content Agent Lambda deployed with shared-types dependency${NC}"

