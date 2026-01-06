#!/bin/bash
# Router Deployment with Full Debugging
# This script logs everything to a file for debugging

set -euo pipefail

REGION="us-east-1"
LAMBDA_NAME="storytailor-router-production"
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEPLOY_DIR="${PROJECT_ROOT}/lambda-deployments/router"
RUNTIME="nodejs22.x"
TIMEOUT=60
MEMORY_SIZE=512

LOG_FILE="/tmp/router-deploy-debug-$(date +%s).log"
exec > >(tee -a "$LOG_FILE") 2>&1

echo "=== Router Deployment Debug Log ==="
echo "Time: $(date)"
echo "Project Root: $PROJECT_ROOT"
echo "Deploy Dir: $DEPLOY_DIR"
echo "Log File: $LOG_FILE"
echo ""

# Step 1: Build
echo "=== Step 1: Building TypeScript ==="
cd "$DEPLOY_DIR" || { echo "ERROR: Cannot cd to $DEPLOY_DIR"; exit 1; }
echo "Current directory: $(pwd)"
echo "Running: npm run build"
npm run build || { echo "ERROR: Build failed"; exit 1; }

if [ ! -f "dist/lambda.js" ]; then
  echo "ERROR: dist/lambda.js not found after build"
  ls -la dist/ || echo "dist directory doesn't exist"
  exit 1
fi
echo "✅ Build complete - dist/lambda.js exists"
ls -lh dist/lambda.js

# Step 2: Ensure winston
echo ""
echo "=== Step 2: Ensuring winston dependency ==="
if [ ! -d "node_modules" ]; then
  echo "Creating node_modules directory"
  mkdir -p node_modules
fi

if [ ! -d "node_modules/winston" ]; then
  echo "Winston not found, searching project..."
  WINSTON_SOURCE=$(find "$PROJECT_ROOT" -type d -name "winston" -path "*/node_modules/*" 2>/dev/null | grep -v ".git" | head -1)
  
  if [ -n "$WINSTON_SOURCE" ] && [ -d "$WINSTON_SOURCE" ]; then
    echo "Found winston at: $WINSTON_SOURCE"
    cp -r "$WINSTON_SOURCE" "node_modules/winston" || { echo "ERROR: Failed to copy winston"; exit 1; }
    echo "✅ Copied winston"
  else
    echo "ERROR: winston not found in project"
    echo "Searching in common locations..."
    find "$PROJECT_ROOT" -type d -name "winston" 2>/dev/null | head -5
    exit 1
  fi
else
  echo "✅ Winston already present"
fi

# Copy winston dependencies
for dep in logform triple-beam; do
  if [ ! -d "node_modules/$dep" ]; then
    echo "Searching for $dep..."
    SOURCE=$(find "$PROJECT_ROOT" -type d -name "$dep" -path "*/node_modules/*" 2>/dev/null | grep -v ".git" | head -1)
    if [ -n "$SOURCE" ] && [ -d "$SOURCE" ]; then
      echo "Found $dep at: $SOURCE"
      cp -r "$SOURCE" "node_modules/$dep" 2>/dev/null || echo "Warning: Failed to copy $dep"
    fi
  fi
done

if [ ! -d "node_modules/winston" ]; then
  echo "ERROR: winston still missing after copy attempt"
  exit 1
fi
echo "✅ Winston verified"

# Step 3: Copy other dependencies (non-critical but helpful)
echo ""
echo "=== Step 3: Copying other dependencies ==="
CRITICAL_DEPS=("redis" "ioredis" "openai" "jsonwebtoken" "uuid" "zod" "cors" "express")

for dep in "${CRITICAL_DEPS[@]}"; do
  if [ ! -d "node_modules/${dep}" ]; then
    echo "Searching for $dep..."
    DEP_SOURCE=$(find "$PROJECT_ROOT" -type d -name "${dep}" -path "*/node_modules/*" 2>/dev/null | grep -v ".git" | head -1)
    
    if [ -n "$DEP_SOURCE" ] && [ -d "$DEP_SOURCE" ]; then
      echo "Found $dep at: $DEP_SOURCE"
      cp -r "$DEP_SOURCE" "node_modules/${dep}" 2>/dev/null && echo "✅ Copied $dep" || echo "⚠️  Failed to copy $dep"
    else
      echo "⚠️  $dep not found (will be loaded lazily if needed)"
    fi
  else
    echo "✅ $dep already present"
  fi
done

# Handle scoped packages
echo ""
echo "=== Step 4: Copying scoped packages ==="
SCOPED_DEPS=("@supabase/supabase-js" "@aws-sdk/client-ssm" "@aws-sdk/client-polly" "@aws-sdk/client-ses")

for dep in "${SCOPED_DEPS[@]}"; do
  scope=$(echo "$dep" | cut -d'/' -f1 | sed 's/@//')
  pkg=$(echo "$dep" | cut -d'/' -f2)
  target_dir="node_modules/@${scope}/${pkg}"
  
  if [ ! -d "$target_dir" ]; then
    echo "Searching for $dep..."
    DEP_SOURCE=$(find "$PROJECT_ROOT" -type d -name "${pkg}" -path "*/node_modules/@${scope}/*" 2>/dev/null | grep -v ".git" | head -1)
    
    if [ -n "$DEP_SOURCE" ] && [ -d "$DEP_SOURCE" ]; then
      echo "Found $dep at: $DEP_SOURCE"
      mkdir -p "node_modules/@${scope}"
      cp -r "$DEP_SOURCE" "$target_dir" 2>/dev/null && echo "✅ Copied $dep" || echo "⚠️  Failed to copy $dep"
    else
      echo "⚠️  $dep not found (will be loaded lazily if needed)"
    fi
  else
    echo "✅ $dep already present"
  fi
done

# Step 5: Create package
echo ""
echo "=== Step 5: Creating deployment package ==="
TEMP_DIR=$(mktemp -d)
echo "Temp directory: $TEMP_DIR"

echo "Copying dist..."
cp -r dist "$TEMP_DIR/" || { echo "ERROR: Failed to copy dist"; exit 1; }

echo "Copying node_modules..."
cp -r node_modules "$TEMP_DIR/" || { echo "ERROR: Failed to copy node_modules"; exit 1; }

echo "Copying package.json..."
cp package.json "$TEMP_DIR/" || { echo "ERROR: Failed to copy package.json"; exit 1; }

# Verify winston in package
if [ ! -d "$TEMP_DIR/node_modules/winston" ]; then
  echo "ERROR: winston not in deployment package"
  ls -la "$TEMP_DIR/node_modules/" | head -10
  exit 1
fi
echo "✅ Winston verified in package"

echo "Creating zip file..."
cd "$TEMP_DIR"
zip -r /tmp/router-deployment.zip . >/dev/null 2>&1 || { echo "ERROR: Failed to create zip"; exit 1; }

ZIP_SIZE=$(ls -lh /tmp/router-deployment.zip | awk '{print $5}')
echo "✅ Package created: /tmp/router-deployment.zip ($ZIP_SIZE)"

# Step 6: Deploy
echo ""
echo "=== Step 6: Deploying to Lambda ==="
echo "Getting environment variables..."
ENV_VARS=$(aws lambda get-function-configuration \
  --function-name "$LAMBDA_NAME" \
  --region "$REGION" \
  --query 'Environment.Variables' \
  --output json 2>/dev/null || echo '{}')

echo "Updating Lambda function code..."
aws lambda update-function-code \
  --function-name "$LAMBDA_NAME" \
  --region "$REGION" \
  --zip-file fileb:///tmp/router-deployment.zip \
  --publish || { echo "ERROR: Failed to update function code"; exit 1; }

echo "✅ Code updated"

echo "Waiting for update to complete..."
aws lambda wait function-updated --function-name "$LAMBDA_NAME" --region "$REGION" || {
  echo "ERROR: Function update failed or timed out"
  exit 1
}

echo "Updating function configuration..."
aws lambda update-function-configuration \
  --function-name "$LAMBDA_NAME" \
  --region "$REGION" \
  --handler "dist/lambda.handler" \
  --runtime "$RUNTIME" \
  --timeout "$TIMEOUT" \
  --memory-size "$MEMORY_SIZE" \
  --environment "Variables=${ENV_VARS}" || { echo "ERROR: Failed to update configuration"; exit 1; }

echo "✅ Configuration updated"

# Step 7: Test
echo ""
echo "=== Step 7: Testing deployment ==="
TEST_PAYLOAD='{"rawPath":"/health","path":"/health","requestContext":{"http":{"method":"GET","path":"/health"},"requestId":"test-'$(date +%s)'","stage":"production"},"headers":{},"body":null,"isBase64Encoded":false}'
echo "$TEST_PAYLOAD" > /tmp/router-test-payload.json

aws lambda invoke \
  --function-name "$LAMBDA_NAME" \
  --region "$REGION" \
  --payload file:///tmp/router-test-payload.json \
  --cli-binary-format raw-in-base64-out \
  /tmp/router-test-response.json || { echo "ERROR: Failed to invoke function"; exit 1; }

if [ -f /tmp/router-test-response.json ]; then
  STATUS=$(cat /tmp/router-test-response.json | jq -r '.statusCode // 500' 2>/dev/null || echo "500")
  if [ "$STATUS" = "200" ]; then
    echo "✅ Health check passed (status: $STATUS)"
  else
    echo "⚠️  Status: $STATUS"
    cat /tmp/router-test-response.json | jq '.' 2>/dev/null || cat /tmp/router-test-response.json
  fi
else
  echo "ERROR: No response file created"
fi

# Cleanup
echo ""
echo "=== Cleanup ==="
rm -rf "$TEMP_DIR"
echo "✅ Cleanup complete"

echo ""
echo "=== Deployment Complete ==="
echo "Function: $LAMBDA_NAME"
echo "Handler: dist/lambda.handler"
echo "Runtime: $RUNTIME"
echo "Log file: $LOG_FILE"
echo ""
echo "To view full log: cat $LOG_FILE"
