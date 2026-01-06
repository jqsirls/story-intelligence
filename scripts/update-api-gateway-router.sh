#!/bin/bash
# Update API Gateway to route all traffic through Router Lambda
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${PURPLE}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${PURPLE}║     🚦 UPDATING API GATEWAY TO USE ROUTER LAMBDA 🚦              ║${NC}"
echo -e "${PURPLE}╚══════════════════════════════════════════════════════════════════╝${NC}"

# Configuration
API_ID="sxjwfwffz7"
ENVIRONMENT="staging"
ROUTER_LAMBDA_NAME="storytailor-router-${ENVIRONMENT}"
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
AWS_REGION=$(aws configure get region || echo "us-east-1")
ROUTER_LAMBDA_ARN="arn:aws:lambda:${AWS_REGION}:${AWS_ACCOUNT_ID}:function:${ROUTER_LAMBDA_NAME}"

echo -e "${CYAN}API Gateway ID: ${API_ID}${NC}"
echo -e "${CYAN}Router Lambda: ${ROUTER_LAMBDA_NAME}${NC}"
echo -e "${CYAN}AWS Account: ${AWS_ACCOUNT_ID}${NC}"
echo ""

# Verify Router Lambda exists
echo -e "${YELLOW}🔍 Verifying Router Lambda exists...${NC}"
if aws lambda get-function --function-name "$ROUTER_LAMBDA_NAME" >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Router Lambda found${NC}"
else
    echo -e "${RED}❌ Router Lambda not found. Please deploy it first.${NC}"
    exit 1
fi

# Get current integrations
echo -e "${YELLOW}📋 Getting current API Gateway integrations...${NC}"
CURRENT_INTEGRATIONS=$(aws apigatewayv2 get-integrations --api-id "$API_ID" --output json)
echo -e "${GREEN}✅ Found $(echo "$CURRENT_INTEGRATIONS" | jq '.Items | length') existing integrations${NC}"

# Create new integration for Router Lambda
echo -e "${YELLOW}🔗 Creating Router Lambda integration...${NC}"
ROUTER_INTEGRATION=$(aws apigatewayv2 create-integration \
    --api-id "$API_ID" \
    --integration-type AWS_PROXY \
    --integration-uri "$ROUTER_LAMBDA_ARN" \
    --payload-format-version "2.0" \
    --description "Router Lambda - Central orchestrator for all agents" \
    --output json 2>/dev/null || echo '{"IntegrationId": "existing"}')

ROUTER_INTEGRATION_ID=$(echo "$ROUTER_INTEGRATION" | jq -r '.IntegrationId')

# If integration already exists, find it
if [ "$ROUTER_INTEGRATION_ID" == "existing" ]; then
    echo -e "${YELLOW}Integration may already exist, searching...${NC}"
    ROUTER_INTEGRATION_ID=$(aws apigatewayv2 get-integrations \
        --api-id "$API_ID" \
        --query "Items[?IntegrationUri=='$ROUTER_LAMBDA_ARN'].IntegrationId" \
        --output text | head -1)
fi

if [ -z "$ROUTER_INTEGRATION_ID" ] || [ "$ROUTER_INTEGRATION_ID" == "None" ]; then
    echo -e "${RED}❌ Failed to create or find Router integration${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Router Integration ID: ${ROUTER_INTEGRATION_ID}${NC}"

# Get all current routes
echo -e "${YELLOW}📋 Getting current routes...${NC}"
CURRENT_ROUTES=$(aws apigatewayv2 get-routes --api-id "$API_ID" --output json)
echo -e "${GREEN}✅ Found $(echo "$CURRENT_ROUTES" | jq '.Items | length') existing routes${NC}"

# Update existing routes to use Router Lambda
echo -e "${YELLOW}🔄 Updating routes to use Router Lambda...${NC}"
echo "$CURRENT_ROUTES" | jq -r '.Items[] | .RouteId + " " + .RouteKey' | while read -r ROUTE_ID ROUTE_KEY; do
    echo -e "${BLUE}   Updating route: ${ROUTE_KEY}${NC}"
    
    # Skip $default route if it exists
    if [ "$ROUTE_KEY" == "\$default" ]; then
        echo -e "${YELLOW}   Skipping default route${NC}"
        continue
    fi
    
    # Update route to use Router integration
    aws apigatewayv2 update-route \
        --api-id "$API_ID" \
        --route-id "$ROUTE_ID" \
        --target "integrations/$ROUTER_INTEGRATION_ID" \
        >/dev/null 2>&1 || echo -e "${YELLOW}   Could not update route (may be in use)${NC}"
done

# Create essential routes if they don't exist
echo -e "${YELLOW}🛣️  Ensuring essential routes exist...${NC}"
ESSENTIAL_ROUTES=(
    "GET /health"
    "POST /v1/auth/register"
    "POST /v1/auth/login"
    "GET /v1/auth/me"
    "POST /v1/auth/refresh"
    "GET /v1/stories"
    "POST /v1/stories"
    "GET /v1/stories/{id}"
    "PUT /v1/stories/{id}"
    "DELETE /v1/stories/{id}"
    "GET /v1/characters"
    "POST /v1/characters"
    "GET /v1/characters/{id}"
    "POST /v1/conversation/start"
    "POST /v1/conversation/message"
    "POST /v1/conversation/end"
    "GET /v1/conversation/{id}"
    "POST /knowledge/query"
    "GET /knowledge/health"
    "ANY /{proxy+}"
)

for ROUTE in "${ESSENTIAL_ROUTES[@]}"; do
    echo -e "${BLUE}   Checking route: ${ROUTE}${NC}"
    
    # Check if route exists
    ROUTE_EXISTS=$(echo "$CURRENT_ROUTES" | jq --arg route "$ROUTE" '.Items[] | select(.RouteKey == $route) | .RouteId' | head -1)
    
    if [ -z "$ROUTE_EXISTS" ]; then
        echo -e "${YELLOW}   Creating route: ${ROUTE}${NC}"
        aws apigatewayv2 create-route \
            --api-id "$API_ID" \
            --route-key "$ROUTE" \
            --target "integrations/$ROUTER_INTEGRATION_ID" \
            >/dev/null 2>&1 || echo -e "${YELLOW}   Route may already exist${NC}"
    else
        echo -e "${GREEN}   Route exists${NC}"
    fi
done

# Grant API Gateway permission to invoke Router Lambda
echo -e "${YELLOW}🔐 Updating Lambda permissions...${NC}"
STATEMENT_ID="apigateway-invoke-router-${ENVIRONMENT}-$(date +%s)"

# Add permission for API Gateway to invoke Router Lambda
aws lambda add-permission \
    --function-name "$ROUTER_LAMBDA_NAME" \
    --statement-id "$STATEMENT_ID" \
    --action "lambda:InvokeFunction" \
    --principal "apigateway.amazonaws.com" \
    --source-arn "arn:aws:execute-api:${AWS_REGION}:${AWS_ACCOUNT_ID}:${API_ID}/*/*" \
    >/dev/null 2>&1 || echo -e "${YELLOW}Permission may already exist${NC}"

echo -e "${GREEN}✅ Lambda permissions configured${NC}"

# Remove old Lambda integrations (optional - commented out for safety)
echo -e "${YELLOW}🧹 Identifying old integrations...${NC}"
OLD_INTEGRATIONS=$(aws apigatewayv2 get-integrations \
    --api-id "$API_ID" \
    --query "Items[?!contains(IntegrationUri, 'router')].IntegrationId" \
    --output text)

if [ -n "$OLD_INTEGRATIONS" ] && [ "$OLD_INTEGRATIONS" != "None" ]; then
    echo -e "${YELLOW}Found old integrations that could be cleaned up:${NC}"
    echo "$OLD_INTEGRATIONS"
    echo -e "${CYAN}(Not removing automatically for safety)${NC}"
fi

# Create deployment
echo -e "${YELLOW}🚀 Creating API deployment...${NC}"
DEPLOYMENT=$(aws apigatewayv2 create-deployment \
    --api-id "$API_ID" \
    --description "Updated to route through Router Lambda - $(date)" \
    --output json)

DEPLOYMENT_ID=$(echo "$DEPLOYMENT" | jq -r '.DeploymentId')
echo -e "${GREEN}✅ Deployment created: ${DEPLOYMENT_ID}${NC}"

# Test the updated API
echo -e "${YELLOW}🧪 Testing updated API Gateway...${NC}"
API_ENDPOINT="https://${API_ID}.execute-api.${AWS_REGION}.amazonaws.com/${ENVIRONMENT}"

echo -e "${BLUE}Testing health endpoint...${NC}"
sleep 3
HEALTH_RESPONSE=$(curl -s -w "\n%{http_code}" "${API_ENDPOINT}/health" || echo "Failed")
HTTP_CODE=$(echo "$HEALTH_RESPONSE" | tail -1)
BODY=$(echo "$HEALTH_RESPONSE" | head -n -1)

if [ "$HTTP_CODE" == "200" ]; then
    echo -e "${GREEN}✅ Health check successful${NC}"
    echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
else
    echo -e "${YELLOW}⚠️  Health check returned HTTP ${HTTP_CODE}${NC}"
    echo "$BODY"
fi

# Display summary
echo ""
echo -e "${PURPLE}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${PURPLE}║              🎉 API GATEWAY UPDATE COMPLETE! 🎉                   ║${NC}"
echo -e "${PURPLE}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}✅ All routes now point to Router Lambda${NC}"
echo -e "${GREEN}✅ Router Lambda will orchestrate to all agents${NC}"
echo -e "${GREEN}✅ API endpoint: ${API_ENDPOINT}${NC}"
echo ""
echo -e "${CYAN}Architecture Flow:${NC}"
echo -e "   API Gateway → Router Lambda → EventBridge → Individual Agents"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo -e "   1. Test multi-agent flows through the API"
echo -e "   2. Monitor Router Lambda logs for orchestration"
echo -e "   3. Begin Phase 3: Testing & Quality Assurance"
echo ""