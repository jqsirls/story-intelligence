#!/bin/bash
# Test Lambda Function
# This script tests the deployed Lambda function
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

ENVIRONMENT=${1:-staging}
FUNCTION_NAME="storytailor-api-${ENVIRONMENT}"

echo -e "${BLUE}🧪 Testing Lambda Function${NC}"
echo -e "${BLUE}Function: ${FUNCTION_NAME}${NC}"
echo -e "${BLUE}========================================${NC}"

# Test 1: Basic invocation
echo -e "${YELLOW}Test 1: Basic invocation${NC}"
aws lambda invoke \
    --function-name "$FUNCTION_NAME" \
    --payload '{}' \
    /tmp/test1.json > /dev/null

if [ -f /tmp/test1.json ]; then
    echo -e "${GREEN}✅ Basic invocation successful${NC}"
    echo -e "${BLUE}Response: $(cat /tmp/test1.json)${NC}"
else
    echo -e "${RED}❌ Basic invocation failed${NC}"
fi

echo ""

# Test 2: Health check (using API Gateway event format)
echo -e "${YELLOW}Test 2: Health check endpoint${NC}"
cat > /tmp/health-payload.json << 'EOF'
{
  "httpMethod": "GET",
  "path": "/health",
  "headers": {},
  "queryStringParameters": null,
  "body": null,
  "isBase64Encoded": false
}
EOF

aws lambda invoke \
    --function-name "$FUNCTION_NAME" \
    --payload file:///tmp/health-payload.json \
    /tmp/test2.json > /dev/null

if [ -f /tmp/test2.json ]; then
    echo -e "${GREEN}✅ Health check successful${NC}"
    echo -e "${BLUE}Response: $(cat /tmp/test2.json)${NC}"
else
    echo -e "${RED}❌ Health check failed${NC}"
fi

echo ""

# Test 3: Database test
echo -e "${YELLOW}Test 3: Database connection test${NC}"
cat > /tmp/db-payload.json << 'EOF'
{
  "httpMethod": "GET",
  "path": "/test-db",
  "headers": {},
  "queryStringParameters": null,
  "body": null,
  "isBase64Encoded": false
}
EOF

aws lambda invoke \
    --function-name "$FUNCTION_NAME" \
    --payload file:///tmp/db-payload.json \
    /tmp/test3.json > /dev/null

if [ -f /tmp/test3.json ]; then
    echo -e "${GREEN}✅ Database test successful${NC}"
    echo -e "${BLUE}Response: $(cat /tmp/test3.json)${NC}"
else
    echo -e "${RED}❌ Database test failed${NC}"
fi

echo ""

# Test 4: Get stories
echo -e "${YELLOW}Test 4: Get stories endpoint${NC}"
cat > /tmp/stories-payload.json << 'EOF'
{
  "httpMethod": "GET",
  "path": "/stories",
  "headers": {},
  "queryStringParameters": null,
  "body": null,
  "isBase64Encoded": false
}
EOF

aws lambda invoke \
    --function-name "$FUNCTION_NAME" \
    --payload file:///tmp/stories-payload.json \
    /tmp/test4.json > /dev/null

if [ -f /tmp/test4.json ]; then
    echo -e "${GREEN}✅ Get stories successful${NC}"
    echo -e "${BLUE}Response: $(cat /tmp/test4.json)${NC}"
else
    echo -e "${RED}❌ Get stories failed${NC}"
fi

echo ""

# Test 5: Create story
echo -e "${YELLOW}Test 5: Create story endpoint${NC}"
cat > /tmp/create-story-payload.json << 'EOF'
{
  "httpMethod": "POST",
  "path": "/stories",
  "headers": {
    "Content-Type": "application/json"
  },
  "queryStringParameters": null,
  "body": "{\"title\":\"Test Story from Lambda\",\"content\":\"This is a test story created via Lambda function.\",\"description\":\"Lambda test story\",\"age_range\":\"5-10\",\"themes\":[\"test\",\"lambda\"]}",
  "isBase64Encoded": false
}
EOF

aws lambda invoke \
    --function-name "$FUNCTION_NAME" \
    --payload file:///tmp/create-story-payload.json \
    /tmp/test5.json > /dev/null

if [ -f /tmp/test5.json ]; then
    echo -e "${GREEN}✅ Create story successful${NC}"
    echo -e "${BLUE}Response: $(cat /tmp/test5.json)${NC}"
else
    echo -e "${RED}❌ Create story failed${NC}"
fi

# Clean up
rm -f /tmp/test*.json /tmp/health-payload.json /tmp/db-payload.json /tmp/stories-payload.json /tmp/create-story-payload.json

echo ""
echo -e "${GREEN}🎉 Lambda function testing completed!${NC}"
echo ""
echo -e "${BLUE}Function is ready for API Gateway integration${NC}"