#!/bin/bash
# Deploy Brand-Compliant Storytailor API
set -e

echo "🎨 Deploying Brand-Compliant Storytailor API"
echo "============================================"

ENVIRONMENT=${1:-staging}
FUNCTION_NAME="storytailor-api-${ENVIRONMENT}"

# Create temporary directory
TEMP_DIR=$(mktemp -d)
echo "Working directory: $TEMP_DIR"

# Create package.json
cat > "$TEMP_DIR/package.json" << EOF
{
  "name": "storytailor-brand-compliant",
  "version": "5.0.0",
  "main": "index.js",
  "dependencies": {
    "@supabase/supabase-js": "^2.38.0"
  }
}
EOF

# Copy our brand-compliant Lambda function
cp "brand-compliant-lambda.js" "$TEMP_DIR/index.js"

# Navigate to temp directory and install dependencies
cd "$TEMP_DIR"
echo "📦 Installing dependencies..."
npm install --silent

# Create deployment package
echo "📦 Creating deployment package..."
zip -r "../storytailor-api-${ENVIRONMENT}.zip" . > /dev/null 2>&1
PACKAGE_FILE="$(dirname $TEMP_DIR)/storytailor-api-${ENVIRONMENT}.zip"
echo "✅ Package created: storytailor-api-${ENVIRONMENT}.zip"

# Get environment variables
source "../.env.staging" 2>/dev/null || echo "Warning: .env.staging not found"

# Update Lambda function
echo "🔄 Updating Lambda function..."
aws lambda update-function-code \
    --function-name "$FUNCTION_NAME" \
    --zip-file "fileb://$PACKAGE_FILE" \
    --output table > /dev/null

echo "🔄 Updating function configuration..."
aws lambda update-function-configuration \
    --function-name "$FUNCTION_NAME" \
    --handler "index.handler" \
    --timeout 60 \
    --memory-size 512 \
    --environment Variables="{
        ENVIRONMENT=$ENVIRONMENT,
        SUPABASE_URL=$SUPABASE_URL,
        SUPABASE_SERVICE_KEY=$SUPABASE_SERVICE_KEY
    }" \
    --output table > /dev/null

echo "✅ Brand-compliant API deployed successfully!"

# Test the function
echo "🧪 Testing brand-compliant API..."
sleep 3

# Test health endpoint
echo "Testing /health endpoint..."
curl -s "https://sxjwfwffz7.execute-api.us-east-1.amazonaws.com/staging/health" | jq '.'

echo ""
echo "✅ Brand-compliant deployment completed!"
echo "🎨 API now includes proper Story Intelligence™ branding"
echo "📋 All responses follow brand guidelines"
 
 
 