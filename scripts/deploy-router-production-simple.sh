#!/bin/bash
# Simplified Router Deployment Script with better error handling

set -euo pipefail

REGION="us-east-1"
LAMBDA_NAME="storytailor-router-production"
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEPLOY_DIR="${PROJECT_ROOT}/lambda-deployments/router"
RUNTIME="nodejs22.x"
TIMEOUT=60
MEMORY_SIZE=512

LOG_FILE="/tmp/router-deploy-$(date +%s).log"
exec > >(tee -a "$LOG_FILE") 2>&1

echo "=== Router Deployment Started ==="
echo "Time: $(date)"
echo "Project Root: $PROJECT_ROOT"
echo "Deploy Dir: $DEPLOY_DIR"
echo ""

# Step 1: Build
echo "Step 1: Building TypeScript..."
cd "$DEPLOY_DIR" || exit 1
npm run build || { echo "Build failed"; exit 1; }

if [ ! -f "dist/lambda.js" ]; then
  echo "ERROR: dist/lambda.js not found"
  exit 1
fi
echo "✅ Build complete"

# Step 2: Ensure winston
echo "Step 2: Ensuring winston dependency..."
if [ ! -d "node_modules" ]; then
  mkdir -p node_modules
fi

if [ ! -d "node_modules/winston" ]; then
  echo "Searching for winston..."
  WINSTON_SOURCE=$(find "$PROJECT_ROOT" -type d -name "winston" -path "*/node_modules/*" 2>/dev/null | grep -v ".git" | head -1)
  if [ -n "$WINSTON_SOURCE" ] && [ -d "$WINSTON_SOURCE" ]; then
    echo "Found winston at: $WINSTON_SOURCE"
    cp -r "$WINSTON_SOURCE" "node_modules/winston" || exit 1
    echo "✅ Copied winston"
  else
    echo "ERROR: winston not found"
    exit 1
  fi
fi

# Copy dependencies
for dep in logform triple-beam; do
  if [ ! -d "node_modules/$dep" ]; then
    SOURCE=$(find "$PROJECT_ROOT" -type d -name "$dep" -path "*/node_modules/*" 2>/dev/null | grep -v ".git" | head -1)
    if [ -n "$SOURCE" ] && [ -d "$SOURCE" ]; then
      cp -r "$SOURCE" "node_modules/$dep" 2>/dev/null || true
    fi
  fi
done

if [ ! -d "node_modules/winston" ]; then
  echo "ERROR: winston still missing"
  exit 1
fi
echo "✅ Winston verified"

# Step 3: Create package
echo "Step 3: Creating deployment package..."
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

cp -r dist "$TEMP_DIR/" || exit 1
cp -r node_modules "$TEMP_DIR/" || exit 1
cp package.json "$TEMP_DIR/" || exit 1

if [ ! -d "$TEMP_DIR/node_modules/winston" ]; then
  echo "ERROR: winston not in package"
  exit 1
fi

cd "$TEMP_DIR"
zip -r /tmp/router-deployment.zip . >/dev/null 2>&1 || exit 1
echo "✅ Package created"

# Step 4: Deploy
echo "Step 4: Deploying to Lambda..."
ENV_VARS=$(aws lambda get-function-configuration \
  --function-name "$LAMBDA_NAME" \
  --region "$REGION" \
  --query 'Environment.Variables' \
  --output json 2>/dev/null || echo '{}')

aws lambda update-function-code \
  --function-name "$LAMBDA_NAME" \
  --region "$REGION" \
  --zip-file fileb:///tmp/router-deployment.zip \
  --publish || exit 1

echo "✅ Code updated"

# Wait
echo "Waiting for update..."
aws lambda wait function-updated --function-name "$LAMBDA_NAME" --region "$REGION"

# Update config
aws lambda update-function-configuration \
  --function-name "$LAMBDA_NAME" \
  --region "$REGION" \
  --handler "dist/lambda.handler" \
  --runtime "$RUNTIME" \
  --timeout "$TIMEOUT" \
  --memory-size "$MEMORY_SIZE" \
  --environment "Variables=${ENV_VARS}" || exit 1

echo "✅ Configuration updated"

# Step 5: Test
echo "Step 5: Testing..."
TEST_PAYLOAD='{"rawPath":"/health","path":"/health","requestContext":{"http":{"method":"GET","path":"/health"},"requestId":"test-'$(date +%s)'","stage":"production"},"headers":{},"body":null,"isBase64Encoded":false}'
echo "$TEST_PAYLOAD" > /tmp/router-test-payload.json

aws lambda invoke \
  --function-name "$LAMBDA_NAME" \
  --region "$REGION" \
  --payload file:///tmp/router-test-payload.json \
  --cli-binary-format raw-in-base64-out \
  /tmp/router-test-response.json || exit 1

if [ -f /tmp/router-test-response.json ]; then
  STATUS=$(cat /tmp/router-test-response.json | jq -r '.statusCode // 500' 2>/dev/null || echo "500")
  if [ "$STATUS" = "200" ]; then
    echo "✅ Health check passed (status: $STATUS)"
  else
    echo "⚠️  Status: $STATUS"
    cat /tmp/router-test-response.json | jq '.' 2>/dev/null || cat /tmp/router-test-response.json
  fi
fi

echo ""
echo "=== Deployment Complete ==="
echo "Function: $LAMBDA_NAME"
echo "Handler: dist/lambda.handler"
echo "Runtime: $RUNTIME"
echo "Log file: $LOG_FILE"
