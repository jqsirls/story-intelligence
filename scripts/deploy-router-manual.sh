#!/bin/bash
# Manual deployment steps - execute one at a time for debugging

REGION="us-east-1"
LAMBDA_NAME="storytailor-router-production"
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEPLOY_DIR="${PROJECT_ROOT}/lambda-deployments/router"

echo "Project Root: $PROJECT_ROOT"
echo "Deploy Dir: $DEPLOY_DIR"
echo ""

# Step 1: Build
echo "=== Step 1: Building ==="
cd "$DEPLOY_DIR"
npm run build
ls -la dist/lambda.js || echo "ERROR: dist/lambda.js not found"

# Step 2: Check winston
echo ""
echo "=== Step 2: Checking winston ==="
if [ ! -d "node_modules/winston" ]; then
  echo "Winston not found, searching..."
  WINSTON_SOURCE=$(find "$PROJECT_ROOT" -type d -name "winston" -path "*/node_modules/*" 2>/dev/null | grep -v ".git" | head -1)
  if [ -n "$WINSTON_SOURCE" ]; then
    echo "Found at: $WINSTON_SOURCE"
    mkdir -p node_modules
    cp -r "$WINSTON_SOURCE" node_modules/winston
    echo "Copied winston"
  fi
fi
ls -la node_modules/winston/package.json || echo "Winston still missing"

# Step 3: Create package
echo ""
echo "=== Step 3: Creating package ==="
TEMP_DIR=$(mktemp -d)
echo "Temp dir: $TEMP_DIR"
cp -r dist "$TEMP_DIR/"
cp -r node_modules "$TEMP_DIR/"
cp package.json "$TEMP_DIR/"
ls -la "$TEMP_DIR/node_modules/winston" || echo "Winston not in package"

# Step 4: Zip
echo ""
echo "=== Step 4: Creating zip ==="
cd "$TEMP_DIR"
zip -r /tmp/router-deployment.zip . 2>&1 | tail -5
ls -lh /tmp/router-deployment.zip || echo "Zip failed"

# Step 5: Deploy
echo ""
echo "=== Step 5: Deploying ==="
aws lambda update-function-code \
  --function-name "$LAMBDA_NAME" \
  --region "$REGION" \
  --zip-file fileb:///tmp/router-deployment.zip \
  --publish 2>&1 | head -10

echo ""
echo "=== Waiting for update ==="
aws lambda wait function-updated --function-name "$LAMBDA_NAME" --region "$REGION" 2>&1

echo ""
echo "=== Updating configuration ==="
ENV_VARS=$(aws lambda get-function-configuration \
  --function-name "$LAMBDA_NAME" \
  --region "$REGION" \
  --query 'Environment.Variables' \
  --output json 2>/dev/null || echo '{}')

aws lambda update-function-configuration \
  --function-name "$LAMBDA_NAME" \
  --region "$REGION" \
  --handler "dist/lambda.handler" \
  --runtime "nodejs22.x" \
  --timeout 60 \
  --memory-size 512 \
  --environment "Variables=${ENV_VARS}" 2>&1 | head -10

echo ""
echo "=== Testing ==="
TEST_PAYLOAD='{"rawPath":"/health","path":"/health","requestContext":{"http":{"method":"GET","path":"/health"},"requestId":"test-'$(date +%s)'","stage":"production"},"headers":{},"body":null,"isBase64Encoded":false}'
echo "$TEST_PAYLOAD" > /tmp/router-test-payload.json

aws lambda invoke \
  --function-name "$LAMBDA_NAME" \
  --region "$REGION" \
  --payload file:///tmp/router-test-payload.json \
  --cli-binary-format raw-in-base64-out \
  /tmp/router-test-response.json 2>&1

if [ -f /tmp/router-test-response.json ]; then
  cat /tmp/router-test-response.json | jq '.' 2>/dev/null || cat /tmp/router-test-response.json
fi

echo ""
echo "=== Cleanup ==="
rm -rf "$TEMP_DIR"
echo "Done"
