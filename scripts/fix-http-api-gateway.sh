#!/bin/bash
# Fix HTTP API Gateway Configuration
set -e

echo "🔧 Fixing HTTP API Gateway Configuration"
echo "========================================"

API_ID="sxjwfwffz7"
LAMBDA_ARN="arn:aws:lambda:us-east-1:326181217496:function:storytailor-api-staging"

echo "✅ API ID: $API_ID"

# Get current routes
echo "Current routes:"
aws apigatewayv2 get-routes --api-id "$API_ID" --query "Items[*].[RouteKey,RouteId]" --output table

# Create a catch-all route if it doesn't exist
echo "Creating catch-all route..."

# First, create an integration
INTEGRATION_ID=$(aws apigatewayv2 create-integration \
    --api-id "$API_ID" \
    --integration-type AWS_PROXY \
    --integration-uri "$LAMBDA_ARN" \
    --payload-format-version "2.0" \
    --query "IntegrationId" --output text 2>/dev/null || \
    aws apigatewayv2 get-integrations --api-id "$API_ID" --query "Items[0].IntegrationId" --output text)

echo "✅ Integration ID: $INTEGRATION_ID"

# Create routes for different methods and paths
ROUTES=(
    "GET /health"
    "POST /v1/auth/register"
    "POST /v1/auth/login"
    "GET /v1/auth/me"
    "POST /v1/auth/refresh"
    "GET /v1/stories"
    "POST /v1/stories"
    "GET /stories"
    "POST /stories"
    "GET /test-db"
    "ANY /{proxy+}"
)

for route in "${ROUTES[@]}"; do
    echo "Creating route: $route"
    aws apigatewayv2 create-route \
        --api-id "$API_ID" \
        --route-key "$route" \
        --target "integrations/$INTEGRATION_ID" 2>/dev/null || echo "Route may already exist"
done

# Update Lambda permissions
echo "Updating Lambda permissions..."
aws lambda add-permission \
    --function-name "storytailor-api-staging" \
    --statement-id "apigateway-invoke-$(date +%s)" \
    --action "lambda:InvokeFunction" \
    --principal "apigateway.amazonaws.com" \
    --source-arn "arn:aws:execute-api:us-east-1:326181217496:$API_ID/*/*" 2>/dev/null || echo "Permission may already exist"

echo "✅ HTTP API Gateway configuration completed"

# Test the fix
echo "🧪 Testing the fix..."
sleep 3
echo "Testing health endpoint:"
curl -s "https://$API_ID.execute-api.us-east-1.amazonaws.com/staging/health" | jq '.' || echo "Failed to parse JSON"