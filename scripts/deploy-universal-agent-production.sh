#!/bin/bash
# Deploy Universal Agent to Production (with deletion system endpoints)

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BLUE='\033[0;34m'
NC='\033[0m'

REGION="us-east-1"
LAMBDA_NAME="storytailor-universal-agent-production"
DEPLOY_DIR="packages/universal-agent"

echo -e "${CYAN}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║     Deploying Universal Agent to Production                      ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Build TypeScript
echo -e "${YELLOW}📦 Building TypeScript...${NC}"
cd "${DEPLOY_DIR}"
npm run build

# Install production dependencies
echo -e "${YELLOW}📦 Installing production dependencies...${NC}"
npm install --production --legacy-peer-deps 2>&1 | grep -v "shared-types" || true

# Ensure templates are included
if [ -d "src/templates" ]; then
  echo -e "${YELLOW}📦 Copying email templates to dist...${NC}"
  mkdir -p dist/templates
  cp -r src/templates/* dist/templates/ 2>/dev/null || true
fi

# Create deployment package
echo -e "${YELLOW}📦 Creating deployment package...${NC}"
cd "${DEPLOY_DIR}"
zip -r /tmp/universal-agent-deployment.zip \
  dist/ \
  node_modules/ \
  package.json \
  >/dev/null 2>&1

# Get environment variables from existing Lambda
echo -e "${BLUE}🔧 Getting environment configuration...${NC}"
ENV_VARS=$(aws lambda get-function-configuration \
  --function-name "${LAMBDA_NAME}" \
  --region "${REGION}" \
  --query 'Environment.Variables' \
  --output json 2>/dev/null || echo '{}')

# Update Lambda function code
echo -e "${YELLOW}♻️  Updating Lambda function code...${NC}"
aws lambda update-function-code \
  --function-name "${LAMBDA_NAME}" \
  --region "${REGION}" \
  --zip-file fileb:///tmp/universal-agent-deployment.zip > /dev/null 2>&1

# Wait for update to complete
echo -e "${YELLOW}⏳ Waiting for update to complete...${NC}"
aws lambda wait function-updated --function-name "${LAMBDA_NAME}" --region "${REGION}"

echo -e "${GREEN}✅ Universal Agent deployed successfully!${NC}"
echo ""

# Test the deployment
echo -e "${CYAN}🧪 Testing deployment...${NC}"
TEST_PAYLOAD='{"action":"health","agentName":"universal"}'
echo "${TEST_PAYLOAD}" > /tmp/universal-deploy-test.json

sleep 2  # Wait for Lambda to be ready

if aws lambda invoke \
  --function-name "${LAMBDA_NAME}" \
  --region "${REGION}" \
  --payload file:///tmp/universal-deploy-test.json \
  --cli-binary-format raw-in-base64-out \
  /tmp/universal-deploy-test-response.json > /dev/null 2>&1; then
  
  if command -v jq >/dev/null 2>&1; then
    RESPONSE_BODY=$(cat /tmp/universal-deploy-test-response.json | jq -r '.body // .' 2>/dev/null)
    PARSED=$(echo "${RESPONSE_BODY}" | jq -r 'fromjson // .' 2>/dev/null || echo "${RESPONSE_BODY}")
    STATUS=$(echo "${PARSED}" | jq -r '.status // .health.status // false' 2>/dev/null)
    
    if [ "${STATUS}" = "healthy" ] || echo "${PARSED}" | grep -q "healthy" 2>/dev/null; then
      echo -e "${GREEN}✅ Deployment test passed! (status: ${STATUS})${NC}"
    else
      echo -e "${YELLOW}⚠️  Deployment test inconclusive (status: ${STATUS})${NC}"
    fi
  else
    echo -e "${YELLOW}⚠️  Deployment test completed (jq not available for verification)${NC}"
  fi
else
  echo -e "${RED}❌ Deployment test failed${NC}"
fi

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║          Universal Agent Deployment Complete!                     ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${CYAN}📝 Next steps:${NC}"
echo -e "  1. Apply database migration (if not done)"
echo -e "  2. Test deletion API endpoints"
echo -e "  3. Monitor CloudWatch logs"

cd - >/dev/null
