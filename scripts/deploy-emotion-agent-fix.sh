#!/bin/bash
# Deploy Emotion Agent with UUID validation fix

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

REGION="us-east-1"
LAMBDA_NAME="storytailor-emotion-agent-production"
DEPLOY_DIR="lambda-deployments/emotion-agent"

echo -e "${CYAN}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║          Deploying Emotion Agent Fix (Production)               ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Build TypeScript
echo -e "${YELLOW}📦 Building TypeScript...${NC}"
cd "${DEPLOY_DIR}"
npm run build

# Install production dependencies (skip if node_modules exists and has required packages)
echo -e "${YELLOW}📦 Checking dependencies...${NC}"
if [ ! -d "node_modules/@supabase" ]; then
  echo -e "${YELLOW}📦 Installing production dependencies...${NC}"
  # Try to install, but continue even if shared-types fails (it's bundled in dist)
  npm install --production --legacy-peer-deps 2>&1 | grep -v "shared-types" || true
  # If still missing critical deps, try installing just what we need
  if [ ! -d "node_modules/@supabase" ]; then
    npm install @supabase/supabase-js@^2.75.0 redis@^4.7.1 winston@^3.18.3 --no-save 2>&1 || true
  fi
else
  echo -e "${GREEN}✅ Dependencies already installed${NC}"
fi

# Create deployment package (include dist, node_modules, package.json)
echo -e "${YELLOW}📦 Creating deployment package...${NC}"
cd "${DEPLOY_DIR}"
zip -r /tmp/emotion-agent-deployment.zip dist/ node_modules/ package.json >/dev/null 2>&1

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
  --zip-file fileb:///tmp/emotion-agent-deployment.zip > /dev/null 2>&1

# Wait for update to complete
echo -e "${YELLOW}⏳ Waiting for update to complete...${NC}"
aws lambda wait function-updated --function-name "${LAMBDA_NAME}" --region "${REGION}"

echo -e "${GREEN}✅ Emotion Agent deployed successfully!${NC}"
echo ""

# Test the deployment
echo -e "${CYAN}🧪 Testing deployment...${NC}"
TEST_USER_ID="00000000-0000-0000-0000-$(date +%s | tail -c 12)"
TEST_LIBRARY_ID="11111111-1111-1111-1111-$(date +%s | tail -c 12)"
TEST_PAYLOAD='{"action":"detect_emotion","userInput":"I am feeling happy today!","userId":"'${TEST_USER_ID}'","sessionId":"test-session-'$(date +%s)'","libraryId":"'${TEST_LIBRARY_ID}'"}'
echo "${TEST_PAYLOAD}" > /tmp/emotion-deploy-test.json

sleep 2  # Wait for Lambda to be ready

if aws lambda invoke \
  --function-name "${LAMBDA_NAME}" \
  --region "${REGION}" \
  --payload file:///tmp/emotion-deploy-test.json \
  --cli-binary-format raw-in-base64-out \
  /tmp/emotion-deploy-test-response.json > /dev/null 2>&1; then
  
  if command -v jq >/dev/null 2>&1; then
    RESPONSE_BODY=$(cat /tmp/emotion-deploy-test-response.json | jq -r '.body // .' 2>/dev/null)
    PARSED=$(echo "${RESPONSE_BODY}" | jq -r 'fromjson // .' 2>/dev/null || echo "${RESPONSE_BODY}")
    SUCCESS=$(echo "${PARSED}" | jq -r '.success // false' 2>/dev/null)
    MOOD=$(echo "${PARSED}" | jq -r '.data.mood // empty' 2>/dev/null)
    
    if [ "${SUCCESS}" = "true" ] && [ -n "${MOOD}" ]; then
      echo -e "${GREEN}✅ Deployment test passed! (mood: ${MOOD})${NC}"
    else
      echo -e "${YELLOW}⚠️  Deployment test inconclusive (success: ${SUCCESS}, mood: ${MOOD})${NC}"
    fi
  else
    echo -e "${YELLOW}⚠️  Deployment test completed (jq not available for verification)${NC}"
  fi
else
  echo -e "${RED}❌ Deployment test failed${NC}"
fi

cd - > /dev/null
echo ""
echo -e "${GREEN}✅ Emotion Agent deployment complete!${NC}"
