#!/bin/bash
# Test API Gateway Configuration

API_URL="https://sxjwfwffz7.execute-api.us-east-1.amazonaws.com/staging"

echo "🧪 Testing API Gateway Configuration"
echo "===================================="

echo "1. Testing root path:"
curl -s "$API_URL" | jq '.' || echo "Failed to parse JSON"

echo -e "\n2. Testing /health path:"
curl -s "$API_URL/health" | jq '.' || echo "Failed to parse JSON"

echo -e "\n3. Testing /stories path:"
curl -s "$API_URL/stories" | jq '.' || echo "Failed to parse JSON"

echo -e "\n4. Testing with different method:"
curl -s -X GET "$API_URL/health" | jq '.' || echo "Failed to parse JSON"

echo -e "\n5. Testing Lambda function directly:"
aws lambda invoke \
    --function-name "storytailor-api-staging" \
    --payload '{"httpMethod":"GET","path":"/health","headers":{},"requestContext":{"path":"/staging/health"}}' \
    /tmp/direct-test.json \
    --output text --query 'StatusCode'

echo "Direct Lambda Response:"
cat /tmp/direct-test.json | jq '.' || cat /tmp/direct-test.json