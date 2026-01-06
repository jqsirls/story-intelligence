#!/bin/bash
# Final Router Deployment - Full execution with comprehensive logging

set -e

REGION="us-east-1"
LAMBDA_NAME="storytailor-router-production"
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEPLOY_DIR="${PROJECT_ROOT}/lambda-deployments/router"
RUNTIME="nodejs22.x"
TIMEOUT=60
MEMORY_SIZE=512

# Log file
LOG_FILE="/tmp/router-deploy-final-$(date +%s).log"
exec > >(tee "$LOG_FILE") 2>&1

echo "=========================================="
echo "Router Lambda Deployment"
echo "Started: $(date)"
echo "Log: $LOG_FILE"
echo "=========================================="
echo ""

# Function to log steps
log_step() {
  echo ""
  echo ">>> $1"
  echo "----------------------------------------"
}

# Function to handle errors
handle_error() {
  echo ""
  echo "ERROR: $1"
  echo "Check log file: $LOG_FILE"
  exit 1
}

# Step 1: Build
log_step "Step 1: Building TypeScript"
cd "$DEPLOY_DIR" || handle_error "Cannot cd to $DEPLOY_DIR"
echo "Directory: $(pwd)"

if ! npm run build; then
  handle_error "TypeScript build failed"
fi

if [ ! -f "dist/lambda.js" ]; then
  handle_error "dist/lambda.js not found after build"
fi
echo "✅ Build complete - dist/lambda.js exists ($(ls -lh dist/lambda.js | awk '{print $5}'))"

# Step 2: Setup node_modules
log_step "Step 2: Setting up dependencies"
if [ ! -d "node_modules" ]; then
  mkdir -p node_modules
  echo "Created node_modules directory"
fi

# Step 3: Copy winston (MANDATORY)
log_step "Step 3: Copying winston (mandatory)"
if [ ! -d "node_modules/winston" ]; then
  echo "Searching for winston in project..."
  WINSTON_SOURCE=$(find "$PROJECT_ROOT" -type d -name "winston" -path "*/node_modules/*" 2>/dev/null | grep -v ".git" | head -1)
  
  if [ -z "$WINSTON_SOURCE" ] || [ ! -d "$WINSTON_SOURCE" ]; then
    handle_error "winston not found in project. Searched: $PROJECT_ROOT"
  fi
  
  echo "Found winston at: $WINSTON_SOURCE"
  if ! cp -r "$WINSTON_SOURCE" "node_modules/winston"; then
    handle_error "Failed to copy winston"
  fi
  echo "✅ Winston copied"
else
  echo "✅ Winston already present"
fi

# Copy winston and all its transitive dependencies
log_step "Step 3b: Copying winston transitive dependencies"
# Copy winston's node_modules if it exists (contains all transitive deps)
if [ -d "node_modules/winston/node_modules" ]; then
  echo "Copying winston's node_modules (transitive dependencies)..."
  cp -r node_modules/winston/node_modules/* node_modules/ 2>/dev/null && echo "✅ Winston transitive dependencies copied" || echo "⚠️  Some dependencies may be missing"
fi

# Also copy common winston dependencies explicitly
WINSTON_DEPS=("logform" "triple-beam" "readable-stream" "inherits" "safe-buffer" "util-deprecate" "wrappy" "once" "isarray" "string_decoder" "core-util-is" "process-nextick-args" "async" "is-stream")
for dep in "${WINSTON_DEPS[@]}"; do
  if [ ! -d "node_modules/$dep" ]; then
    SOURCE=$(find "$PROJECT_ROOT" -type d -name "$dep" -path "*/node_modules/*" 2>/dev/null | grep -v ".git" | head -1)
    if [ -n "$SOURCE" ] && [ -d "$SOURCE" ]; then
      cp -r "$SOURCE" "node_modules/$dep" 2>/dev/null && echo "✅ $dep" || echo "⚠️  $dep"
    fi
  fi
done

# Verify winston
if [ ! -d "node_modules/winston" ]; then
  handle_error "winston verification failed"
fi
echo "✅ Winston verified"

# Step 4: Copy other dependencies (optional)
log_step "Step 4: Copying other dependencies"
DEPS=("redis" "ioredis" "openai" "jsonwebtoken" "uuid" "zod" "cors" "express")
for dep in "${DEPS[@]}"; do
  if [ ! -d "node_modules/${dep}" ]; then
    SOURCE=$(find "$PROJECT_ROOT" -type d -name "${dep}" -path "*/node_modules/*" 2>/dev/null | grep -v ".git" | head -1)
    if [ -n "$SOURCE" ] && [ -d "$SOURCE" ]; then
      cp -r "$SOURCE" "node_modules/${dep}" 2>/dev/null && echo "✅ $dep" || echo "⚠️  $dep (skipped)"
    else
      echo "⚠️  $dep not found (will load lazily)"
    fi
  else
    echo "✅ $dep already present"
  fi
done

# Copy scoped packages
log_step "Step 5: Copying scoped packages"
SCOPED=("@supabase/supabase-js" "@aws-sdk/client-ssm" "@aws-sdk/client-polly" "@aws-sdk/client-ses" "@colors/colors" "@dabh/diagnostics")

# Copy @smithy packages (AWS SDK v3 dependencies)
if [ ! -d "node_modules/@smithy" ]; then
  echo "Copying @smithy dependencies..."
  SMITHY_SOURCE=$(find "$PROJECT_ROOT" -type d -path "*/node_modules/@smithy" 2>/dev/null | grep -v ".git" | head -1)
  if [ -n "$SMITHY_SOURCE" ] && [ -d "$SMITHY_SOURCE" ]; then
    mkdir -p "node_modules/@smithy"
    cp -r "$SMITHY_SOURCE"/* "node_modules/@smithy/" 2>/dev/null && echo "✅ @smithy dependencies copied" || echo "⚠️  @smithy copy failed"
  fi
fi

# Copy @aws/lambda-invoke-store (AWS SDK v3 dependency)
if [ ! -d "node_modules/@aws/lambda-invoke-store" ]; then
  echo "Copying @aws/lambda-invoke-store..."
  mkdir -p "node_modules/@aws"
  LAMBDA_STORE_SOURCE=$(find "$PROJECT_ROOT" -type d -path "*/node_modules/@aws/lambda-invoke-store" 2>/dev/null | grep -v ".git" | head -1)
  if [ -n "$LAMBDA_STORE_SOURCE" ] && [ -d "$LAMBDA_STORE_SOURCE" ]; then
    cp -r "$LAMBDA_STORE_SOURCE" "node_modules/@aws/lambda-invoke-store" 2>/dev/null && echo "✅ @aws/lambda-invoke-store copied" || echo "⚠️  @aws/lambda-invoke-store copy failed"
  fi
fi
for dep in "${SCOPED[@]}"; do
  scope=$(echo "$dep" | cut -d'/' -f1 | sed 's/@//')
  pkg=$(echo "$dep" | cut -d'/' -f2)
  target="node_modules/@${scope}/${pkg}"
  
  if [ ! -d "$target" ]; then
    SOURCE=$(find "$PROJECT_ROOT" -type d -name "${pkg}" -path "*/node_modules/@${scope}/*" 2>/dev/null | grep -v ".git" | head -1)
    if [ -n "$SOURCE" ] && [ -d "$SOURCE" ]; then
      mkdir -p "node_modules/@${scope}"
      cp -r "$SOURCE" "$target" 2>/dev/null && echo "✅ $dep" || echo "⚠️  $dep (skipped)"
    else
      echo "⚠️  $dep not found (will load lazily)"
    fi
  else
    echo "✅ $dep already present"
  fi
done

# Step 6: Create deployment package
log_step "Step 6: Creating deployment package"
TEMP_DIR=$(mktemp -d)
echo "Temp dir: $TEMP_DIR"

echo "Copying dist..."
if ! cp -r dist "$TEMP_DIR/"; then
  handle_error "Failed to copy dist"
fi

echo "Copying node_modules..."
if ! cp -r node_modules "$TEMP_DIR/"; then
  handle_error "Failed to copy node_modules"
fi

echo "Copying package.json..."
if ! cp package.json "$TEMP_DIR/"; then
  handle_error "Failed to copy package.json"
fi

# Verify winston in package
if [ ! -d "$TEMP_DIR/node_modules/winston" ]; then
  handle_error "winston not in deployment package"
fi
echo "✅ Winston verified in package"

# Create zip
echo "Creating zip file..."
cd "$TEMP_DIR"
ZIP_FILE="/tmp/router-deployment.zip"
if ! zip -r "$ZIP_FILE" . >/dev/null 2>&1; then
  handle_error "Failed to create zip file"
fi

ZIP_SIZE=$(ls -lh "$ZIP_FILE" | awk '{print $5}')
echo "✅ Package created: $ZIP_FILE ($ZIP_SIZE)"

# Step 7: Deploy to Lambda
log_step "Step 7: Deploying to Lambda"
echo "Getting environment variables..."
ENV_VARS=$(aws lambda get-function-configuration \
  --function-name "$LAMBDA_NAME" \
  --region "$REGION" \
  --query 'Environment.Variables' \
  --output json 2>/dev/null || echo '{}')

echo "Updating function code..."
# Wait for any in-progress updates first
echo "Checking for in-progress updates..."
for i in {1..10}; do
  STATUS=$(aws lambda get-function --function-name "$LAMBDA_NAME" --region "$REGION" --query 'Configuration.LastUpdateStatus' --output text 2>/dev/null || echo "Unknown")
  if [ "$STATUS" != "InProgress" ]; then
    break
  fi
  echo "Waiting for in-progress update to complete... ($i/10)"
  sleep 2
done

if ! aws lambda update-function-code \
  --function-name "$LAMBDA_NAME" \
  --region "$REGION" \
  --zip-file "fileb://$ZIP_FILE" \
  --publish; then
  handle_error "Failed to update Lambda function code"
fi
echo "✅ Code updated"

echo "Waiting for update to complete..."
if ! aws lambda wait function-updated --function-name "$LAMBDA_NAME" --region "$REGION"; then
  handle_error "Function update failed or timed out"
fi

echo "Updating function configuration..."
# Create proper JSON file for environment variables
ENV_FILE=$(mktemp)
# Wrap ENV_VARS in proper structure: {"Variables": {...}}
echo "$ENV_VARS" | jq '{Variables: .}' > "$ENV_FILE" 2>/dev/null || {
  # Fallback if jq fails
  echo "{\"Variables\": $ENV_VARS}" > "$ENV_FILE"
}

if ! aws lambda update-function-configuration \
  --function-name "$LAMBDA_NAME" \
  --region "$REGION" \
  --handler "dist/lambda.handler" \
  --runtime "$RUNTIME" \
  --timeout "$TIMEOUT" \
  --memory-size "$MEMORY_SIZE" \
  --environment "file://$ENV_FILE"; then
  rm -f "$ENV_FILE"
  handle_error "Failed to update function configuration"
fi
rm -f "$ENV_FILE"
echo "✅ Configuration updated"

# Step 8: Test
log_step "Step 8: Testing deployment"
TEST_PAYLOAD='{"rawPath":"/health","path":"/health","requestContext":{"http":{"method":"GET","path":"/health"},"requestId":"test-'$(date +%s)'","stage":"production"},"headers":{},"body":null,"isBase64Encoded":false}'
echo "$TEST_PAYLOAD" > /tmp/router-test-payload.json

if ! aws lambda invoke \
  --function-name "$LAMBDA_NAME" \
  --region "$REGION" \
  --payload file:///tmp/router-test-payload.json \
  --cli-binary-format raw-in-base64-out \
  /tmp/router-test-response.json; then
  handle_error "Failed to invoke function"
fi

if [ -f /tmp/router-test-response.json ]; then
  STATUS=$(cat /tmp/router-test-response.json | jq -r '.statusCode // 500' 2>/dev/null || echo "500")
  if [ "$STATUS" = "200" ]; then
    echo "✅ Health check passed (status: $STATUS)"
  else
    echo "⚠️  Health check returned status: $STATUS"
    cat /tmp/router-test-response.json | jq '.' 2>/dev/null || cat /tmp/router-test-response.json
  fi
else
  echo "⚠️  No response file created"
fi

# Cleanup
log_step "Cleanup"
rm -rf "$TEMP_DIR"
echo "✅ Cleanup complete"

echo ""
echo "=========================================="
echo "✅ DEPLOYMENT COMPLETE"
echo "Function: $LAMBDA_NAME"
echo "Handler: dist/lambda.handler"
echo "Runtime: $RUNTIME"
echo "Completed: $(date)"
echo "Log file: $LOG_FILE"
echo "=========================================="
