#!/bin/bash
# Fix API Gateway Configuration
set -e

echo "🔧 Fixing API Gateway Configuration"
echo "==================================="

# Get API Gateway ID
API_ID=$(aws apigateway get-rest-apis --query "items[?name=='storytailor-staging-api'].id" --output text)

if [ -z "$API_ID" ] || [ "$API_ID" = "None" ]; then
    echo "❌ API Gateway not found"
    exit 1
fi

echo "✅ Found API Gateway: $API_ID"

# Get the root resource ID
ROOT_RESOURCE_ID=$(aws apigateway get-resources --rest-api-id "$API_ID" --query "items[?path=='/'].id" --output text)

echo "✅ Root resource ID: $ROOT_RESOURCE_ID"

# Create a proxy resource if it doesn't exist
PROXY_RESOURCE_ID=$(aws apigateway get-resources --rest-api-id "$API_ID" --query "items[?pathPart=='{proxy+}'].id" --output text)

if [ -z "$PROXY_RESOURCE_ID" ] || [ "$PROXY_RESOURCE_ID" = "None" ]; then
    echo "Creating proxy resource..."
    PROXY_RESOURCE_ID=$(aws apigateway create-resource \
        --rest-api-id "$API_ID" \
        --parent-id "$ROOT_RESOURCE_ID" \
        --path-part "{proxy+}" \
        --query "id" --output text)
    echo "✅ Created proxy resource: $PROXY_RESOURCE_ID"
else
    echo "✅ Proxy resource exists: $PROXY_RESOURCE_ID"
fi

# Create ANY method for proxy resource
aws apigateway put-method \
    --rest-api-id "$API_ID" \
    --resource-id "$PROXY_RESOURCE_ID" \
    --http-method ANY \
    --authorization-type NONE \
    --no-api-key-required || echo "Method may already exist"

# Set up integration
LAMBDA_ARN="arn:aws:lambda:us-east-1:326181217496:function:storytailor-api-staging"

aws apigateway put-integration \
    --rest-api-id "$API_ID" \
    --resource-id "$PROXY_RESOURCE_ID" \
    --http-method ANY \
    --type AWS_PROXY \
    --integration-http-method POST \
    --uri "arn:aws:apigateway:us-east-1:lambda:path/2015-03-31/functions/$LAMBDA_ARN/invocations" || echo "Integration may already exist"

# Deploy the API
aws apigateway create-deployment \
    --rest-api-id "$API_ID" \
    --stage-name staging

echo "✅ API Gateway configuration fixed and deployed"

# Test the fix
echo "🧪 Testing the fix..."
sleep 5
curl -s "https://$API_ID.execute-api.us-east-1.amazonaws.com/staging/health" | jq '.'