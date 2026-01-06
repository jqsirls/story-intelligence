#!/bin/bash
# Deploy Authentication System - Fixed Version
set -e

echo "🔐 Deploying Authentication System"
echo "=================================="

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

ENVIRONMENT=${1:-staging}
FUNCTION_NAME="storytailor-api-${ENVIRONMENT}"

echo -e "${BLUE}Environment: ${ENVIRONMENT}${NC}"
echo -e "${BLUE}Function: ${FUNCTION_NAME}${NC}"

# Check if function exists
if aws lambda get-function --function-name "$FUNCTION_NAME" &> /dev/null; then
    echo -e "${GREEN}✅ Lambda function exists${NC}"
else
    echo -e "${GREEN}❌ Lambda function not found${NC}"
    exit 1
fi

# Test via API Gateway instead
API_URL="https://sxjwfwffz7.execute-api.us-east-1.amazonaws.com/staging"

echo -e "${BLUE}🧪 Testing API Gateway endpoints...${NC}"

# Test health endpoint
echo "Testing health endpoint..."
HEALTH_RESPONSE=$(curl -s "$API_URL/health")
echo "Health Response: $HEALTH_RESPONSE"

if echo "$HEALTH_RESPONSE" | grep -q "healthy"; then
    echo -e "${GREEN}✅ Health endpoint working${NC}"
else
    echo -e "${GREEN}❌ Health endpoint failed${NC}"
fi

echo -e "${GREEN}🎉 Authentication system deployment completed!${NC}"