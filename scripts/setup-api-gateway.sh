#!/bin/bash
# Setup API Gateway
# This script creates an HTTP API Gateway and connects it to the Lambda function
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

ENVIRONMENT=${1:-staging}
FUNCTION_NAME="storytailor-api-${ENVIRONMENT}"
API_NAME="storytailor-api-${ENVIRONMENT}"

echo -e "${BLUE}🌐 Setting up API Gateway${NC}"
echo -e "${BLUE}Environment: ${ENVIRONMENT}${NC}"
echo -e "${BLUE}========================================${NC}"

# Get AWS info
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
AWS_REGION=$(aws configure get region || echo "us-east-1")

echo -e "${GREEN}✅ AWS Account: ${AWS_ACCOUNT_ID}${NC}"
echo -e "${GREEN}✅ AWS Region: ${AWS_REGION}${NC}"

# Check if Lambda function exists
echo -e "${YELLOW}🔍 Checking Lambda function...${NC}"
if ! aws lambda get-function --function-name "$FUNCTION_NAME" &> /dev/null; then
    echo -e "${RED}❌ Lambda function not found: $FUNCTION_NAME${NC}"
    echo -e "${YELLOW}Please run: ./scripts/deploy-simple-lambda.sh ${ENVIRONMENT}${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Lambda function found${NC}"

# Create or update HTTP API
echo -e "${YELLOW}🚀 Creating HTTP API Gateway...${NC}"

# Check if API already exists
API_ID=$(aws apigatewayv2 get-apis --query "Items[?Name=='$API_NAME'].ApiId" --output text 2>/dev/null || echo "")

if [ -n "$API_ID" ] && [ "$API_ID" != "None" ]; then
    echo -e "${BLUE}   Updating existing API: $API_ID${NC}"
else
    echo -e "${BLUE}   Creating new API...${NC}"
    
    # Create HTTP API
    API_RESPONSE=$(aws apigatewayv2 create-api \
        --name "$API_NAME" \
        --protocol-type HTTP \
        --description "Storytailor API - ${ENVIRONMENT} environment" \
        --cors-configuration AllowCredentials=false,AllowHeaders="Content-Type,Authorization",AllowMethods="GET,POST,PUT,DELETE,OPTIONS",AllowOrigins="*" \
        --output json)
    
    API_ID=$(echo "$API_RESPONSE" | jq -r '.ApiId')
    echo -e "${GREEN}   ✅ API created: $API_ID${NC}"
fi

# Get API endpoint
API_ENDPOINT=$(aws apigatewayv2 get-api --api-id "$API_ID" --query 'ApiEndpoint' --output text)
echo -e "${BLUE}   API Endpoint: ${API_ENDPOINT}${NC}"

# Create Lambda integration
echo -e "${YELLOW}🔗 Creating Lambda integration...${NC}"

# Check if integration exists
INTEGRATION_ID=$(aws apigatewayv2 get-integrations --api-id "$API_ID" --query "Items[?IntegrationUri=='arn:aws:lambda:${AWS_REGION}:${AWS_ACCOUNT_ID}:function:${FUNCTION_NAME}'].IntegrationId" --output text 2>/dev/null || echo "")

if [ -n "$INTEGRATION_ID" ] && [ "$INTEGRATION_ID" != "None" ]; then
    echo -e "${BLUE}   Using existing integration: $INTEGRATION_ID${NC}"
else
    echo -e "${BLUE}   Creating new integration...${NC}"
    
    INTEGRATION_RESPONSE=$(aws apigatewayv2 create-integration \
        --api-id "$API_ID" \
        --integration-type AWS_PROXY \
        --integration-uri "arn:aws:lambda:${AWS_REGION}:${AWS_ACCOUNT_ID}:function:${FUNCTION_NAME}" \
        --payload-format-version "2.0" \
        --output json)
    
    INTEGRATION_ID=$(echo "$INTEGRATION_RESPONSE" | jq -r '.IntegrationId')
    echo -e "${GREEN}   ✅ Integration created: $INTEGRATION_ID${NC}"
fi

# Create routes
echo -e "${YELLOW}🛣️  Creating API routes...${NC}"

# Define routes
declare -a routes=(
    "GET /health"
    "GET /stories"
    "POST /stories"
    "GET /test-db"
    "ANY /{proxy+}"
)

for route in "${routes[@]}"; do
    method=$(echo "$route" | cut -d' ' -f1)
    path=$(echo "$route" | cut -d' ' -f2)
    
    echo -e "${BLUE}   Creating route: $method $path${NC}"
    
    # Check if route exists
    ROUTE_ID=$(aws apigatewayv2 get-routes --api-id "$API_ID" --query "Items[?RouteKey=='$route'].RouteId" --output text 2>/dev/null || echo "")
    
    if [ -n "$ROUTE_ID" ] && [ "$ROUTE_ID" != "None" ]; then
        echo -e "${YELLOW}     Route already exists: $ROUTE_ID${NC}"
    else
        ROUTE_RESPONSE=$(aws apigatewayv2 create-route \
            --api-id "$API_ID" \
            --route-key "$route" \
            --target "integrations/$INTEGRATION_ID" \
            --output json 2>/dev/null || echo '{}')
        
        ROUTE_ID=$(echo "$ROUTE_RESPONSE" | jq -r '.RouteId // empty')
        if [ -n "$ROUTE_ID" ]; then
            echo -e "${GREEN}     ✅ Route created: $ROUTE_ID${NC}"
        else
            echo -e "${YELLOW}     ⚠️  Route may already exist or failed to create${NC}"
        fi
    fi
done

# Grant API Gateway permission to invoke Lambda
echo -e "${YELLOW}🔐 Setting up Lambda permissions...${NC}"

STATEMENT_ID="apigateway-invoke-${ENVIRONMENT}"

# Remove existing permission if it exists
aws lambda remove-permission \
    --function-name "$FUNCTION_NAME" \
    --statement-id "$STATEMENT_ID" \
    &> /dev/null || true

# Add permission for API Gateway to invoke Lambda
aws lambda add-permission \
    --function-name "$FUNCTION_NAME" \
    --statement-id "$STATEMENT_ID" \
    --action lambda:InvokeFunction \
    --principal apigateway.amazonaws.com \
    --source-arn "arn:aws:execute-api:${AWS_REGION}:${AWS_ACCOUNT_ID}:${API_ID}/*/*" \
    --output table > /dev/null

echo -e "${GREEN}✅ Lambda permissions configured${NC}"

# Create deployment
echo -e "${YELLOW}🚀 Deploying API...${NC}"

DEPLOYMENT_RESPONSE=$(aws apigatewayv2 create-deployment \
    --api-id "$API_ID" \
    --description "Deployment for ${ENVIRONMENT} environment" \
    --output json)

DEPLOYMENT_ID=$(echo "$DEPLOYMENT_RESPONSE" | jq -r '.DeploymentId')
echo -e "${GREEN}✅ API deployed: $DEPLOYMENT_ID${NC}"

# Test the API
echo -e "${YELLOW}🧪 Testing API endpoints...${NC}"

# Test health endpoint
echo -e "${BLUE}   Testing health endpoint...${NC}"
HEALTH_RESPONSE=$(curl -s -w "%{http_code}" -o /tmp/health_test.json "${API_ENDPOINT}/health" || echo "000")
HEALTH_CODE="${HEALTH_RESPONSE: -3}"

if [ "$HEALTH_CODE" = "200" ]; then
    echo -e "${GREEN}   ✅ Health endpoint working${NC}"
    echo -e "${BLUE}   Response: $(cat /tmp/health_test.json)${NC}"
else
    echo -e "${RED}   ❌ Health endpoint failed (HTTP $HEALTH_CODE)${NC}"
fi

# Test stories endpoint
echo -e "${BLUE}   Testing stories endpoint...${NC}"
STORIES_RESPONSE=$(curl -s -w "%{http_code}" -o /tmp/stories_test.json "${API_ENDPOINT}/stories" || echo "000")
STORIES_CODE="${STORIES_RESPONSE: -3}"

if [ "$STORIES_CODE" = "200" ]; then
    echo -e "${GREEN}   ✅ Stories endpoint working${NC}"
    echo -e "${BLUE}   Response: $(cat /tmp/stories_test.json)${NC}"
else
    echo -e "${RED}   ❌ Stories endpoint failed (HTTP $STORIES_CODE)${NC}"
fi

# Test creating a story
echo -e "${BLUE}   Testing story creation...${NC}"
CREATE_RESPONSE=$(curl -s -w "%{http_code}" -o /tmp/create_test.json \
    -X POST \
    -H "Content-Type: application/json" \
    -d '{"title":"API Gateway Test Story","content":"This story was created via API Gateway!","description":"Test story from API Gateway","age_range":"5-10","themes":["test","api"]}' \
    "${API_ENDPOINT}/stories" || echo "000")

CREATE_CODE="${CREATE_RESPONSE: -3}"

if [ "$CREATE_CODE" = "201" ]; then
    echo -e "${GREEN}   ✅ Story creation working${NC}"
    echo -e "${BLUE}   Response: $(cat /tmp/create_test.json)${NC}"
else
    echo -e "${RED}   ❌ Story creation failed (HTTP $CREATE_CODE)${NC}"
fi

# Clean up test files
rm -f /tmp/health_test.json /tmp/stories_test.json /tmp/create_test.json

echo ""
echo -e "${GREEN}🎉 API Gateway setup completed successfully!${NC}"
echo ""
echo -e "${BLUE}📋 API Gateway Summary:${NC}"
echo -e "${GREEN}✅ API ID: ${API_ID}${NC}"
echo -e "${GREEN}✅ API Endpoint: ${API_ENDPOINT}${NC}"
echo -e "${GREEN}✅ Integration ID: ${INTEGRATION_ID}${NC}"
echo -e "${GREEN}✅ Deployment ID: ${DEPLOYMENT_ID}${NC}"
echo ""
echo -e "${BLUE}🌐 Available Endpoints:${NC}"
echo -e "${BLUE}   GET  ${API_ENDPOINT}/health     - Health check${NC}"
echo -e "${BLUE}   GET  ${API_ENDPOINT}/stories    - List stories${NC}"
echo -e "${BLUE}   POST ${API_ENDPOINT}/stories    - Create story${NC}"
echo -e "${BLUE}   GET  ${API_ENDPOINT}/test-db    - Test database${NC}"
echo ""
echo -e "${BLUE}🧪 Test your API:${NC}"
echo -e "${BLUE}   curl ${API_ENDPOINT}/health${NC}"
echo -e "${BLUE}   curl ${API_ENDPOINT}/stories${NC}"
echo ""
echo -e "${GREEN}🎯 Deployment Complete! Your Storytailor API is now live!${NC}"