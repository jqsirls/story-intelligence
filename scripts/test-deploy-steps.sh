#!/bin/bash
# Test deployment steps individually to debug

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEPLOY_DIR="${PROJECT_ROOT}/lambda-deployments/router"

echo "=== Testing Deployment Steps ==="
echo "Project Root: $PROJECT_ROOT"
echo "Deploy Dir: $DEPLOY_DIR"
echo ""

# Test 1: Directory exists
echo "Test 1: Checking directories..."
if [ ! -d "$DEPLOY_DIR" ]; then
  echo "ERROR: $DEPLOY_DIR does not exist"
  exit 1
fi
echo "✅ Deploy directory exists"

# Test 2: Build
echo ""
echo "Test 2: Building..."
cd "$DEPLOY_DIR"
if npm run build; then
  echo "✅ Build successful"
else
  echo "ERROR: Build failed"
  exit 1
fi

# Test 3: Check dist
echo ""
echo "Test 3: Checking dist/lambda.js..."
if [ -f "dist/lambda.js" ]; then
  echo "✅ dist/lambda.js exists"
  ls -lh dist/lambda.js
else
  echo "ERROR: dist/lambda.js not found"
  ls -la dist/ || echo "dist directory doesn't exist"
  exit 1
fi

# Test 4: Find winston
echo ""
echo "Test 4: Finding winston..."
WINSTON=$(find "$PROJECT_ROOT" -type d -name "winston" -path "*/node_modules/*" 2>/dev/null | grep -v ".git" | head -1)
if [ -n "$WINSTON" ] && [ -d "$WINSTON" ]; then
  echo "✅ Found winston at: $WINSTON"
else
  echo "ERROR: winston not found"
  exit 1
fi

# Test 5: Copy winston
echo ""
echo "Test 5: Copying winston..."
mkdir -p node_modules
if cp -r "$WINSTON" node_modules/winston; then
  echo "✅ Winston copied"
  ls -la node_modules/winston/package.json
else
  echo "ERROR: Failed to copy winston"
  exit 1
fi

echo ""
echo "=== All Tests Passed ==="
echo "Ready to proceed with full deployment"
