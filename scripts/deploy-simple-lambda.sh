#!/bin/bash
# Deploy Simple Lambda Function
# This script creates and deploys a basic Lambda function for testing
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

ENVIRONMENT=${1:-staging}
PREFIX="/storytailor-${ENVIRONMENT}"

echo -e "${BLUE}🚀 Deploying Simple Lambda Function${NC}"
echo -e "${BLUE}Environment: ${ENVIRONMENT}${NC}"
echo -e "${BLUE}========================================${NC}"

# Get AWS info
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
AWS_REGION=$(aws configure get region || echo "us-east-1")

echo -e "${GREEN}✅ AWS Account: ${AWS_ACCOUNT_ID}${NC}"
echo -e "${GREEN}✅ AWS Region: ${AWS_REGION}${NC}"

# Create temporary directory for Lambda function
TEMP_DIR=$(mktemp -d)
echo -e "${BLUE}Working directory: $TEMP_DIR${NC}"

# Create package.json
cat > "$TEMP_DIR/package.json" << EOF
{
  "name": "storytailor-api",
  "version": "1.0.0",
  "description": "Storytailor API Lambda function",
  "main": "index.js",
  "dependencies": {
    "@supabase/supabase-js": "^2.38.0",
    "openai": "^4.20.0",
    "axios": "^1.6.0"
  }
}
EOF

# Create main handler
cat > "$TEMP_DIR/index.js" << 'EOF'
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

exports.handler = async (event, context) => {
  console.log('Event:', JSON.stringify(event, null, 2));
  
  try {
    // Parse the request
    const { httpMethod, path, body, queryStringParameters } = event;
    const requestBody = body ? JSON.parse(body) : {};
    
    // CORS headers
    const headers = {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
    };
    
    // Handle OPTIONS requests for CORS
    if (httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers,
        body: ''
      };
    }
    
    // Handle different routes
    switch (path) {
      case '/health':
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            environment: process.env.ENVIRONMENT,
            version: '1.0.0'
          })
        };
      
      case '/stories':
        if (httpMethod === 'GET') {
          // Get stories
          const { data, error } = await supabase
            .from('stories')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(10);
          
          if (error) throw error;
          
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
              success: true,
              stories: data || [],
              count: data ? data.length : 0
            })
          };
        } else if (httpMethod === 'POST') {
          // Create story
          const storyData = {
            title: requestBody.title || 'Untitled Story',
            content: requestBody.content || '',
            description: requestBody.description || '',
            age_range: requestBody.age_range || '3-8',
            themes: requestBody.themes || [],
            metadata: requestBody.metadata || {}
          };
          
          const { data, error } = await supabase
            .from('stories')
            .insert([storyData])
            .select();
          
          if (error) throw error;
          
          return {
            statusCode: 201,
            headers,
            body: JSON.stringify({ 
              success: true,
              story: data[0] 
            })
          };
        }
        break;
      
      case '/test-db':
        // Test database connection
        const { data, error } = await supabase
          .from('stories')
          .select('count(*)', { count: 'exact' });
        
        if (error) throw error;
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            database: 'connected',
            story_count: data.length,
            timestamp: new Date().toISOString()
          })
        };
      
      default:
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ 
            success: false,
            error: 'Not found',
            path: path
          })
        };
    }
    
  } catch (error) {
    console.error('Error:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: false,
        error: 'Internal server error',
        message: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
};
EOF

echo -e "${YELLOW}📦 Installing dependencies...${NC}"
cd "$TEMP_DIR"
npm install --production --silent
cd - > /dev/null

echo -e "${YELLOW}📦 Creating deployment package...${NC}"
PACKAGE_FILE="/tmp/storytailor-api-${ENVIRONMENT}.zip"
cd "$TEMP_DIR"
zip -r "$PACKAGE_FILE" . -q
cd - > /dev/null

echo -e "${GREEN}✅ Package created: $(basename $PACKAGE_FILE)${NC}"

# Create IAM role if it doesn't exist
ROLE_NAME="storytailor-lambda-role-${ENVIRONMENT}"
ROLE_ARN="arn:aws:iam::${AWS_ACCOUNT_ID}:role/${ROLE_NAME}"

if ! aws iam get-role --role-name "$ROLE_NAME" &> /dev/null; then
    echo -e "${YELLOW}🔐 Creating IAM role...${NC}"
    
    # Create trust policy
    cat > /tmp/trust-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF
    
    # Create role
    aws iam create-role \
        --role-name "$ROLE_NAME" \
        --assume-role-policy-document file:///tmp/trust-policy.json \
        --output table > /dev/null
    
    # Attach policies
    aws iam attach-role-policy \
        --role-name "$ROLE_NAME" \
        --policy-arn "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
    
    aws iam attach-role-policy \
        --role-name "$ROLE_NAME" \
        --policy-arn "arn:aws:iam::aws:policy/AmazonSSMReadOnlyAccess"
    
    # Clean up
    rm /tmp/trust-policy.json
    
    echo -e "${GREEN}✅ IAM role created${NC}"
    
    # Wait for role to be available
    echo -e "${YELLOW}⏳ Waiting for role to be available...${NC}"
    sleep 15
else
    echo -e "${GREEN}✅ IAM role already exists${NC}"
fi

# Get Supabase credentials
echo -e "${YELLOW}📋 Getting environment variables...${NC}"
SUPABASE_URL=$(aws ssm get-parameter --name "${PREFIX}/supabase/url" --query 'Parameter.Value' --output text)
SUPABASE_SERVICE_KEY=$(aws ssm get-parameter --name "${PREFIX}/supabase/service_key" --with-decryption --query 'Parameter.Value' --output text)
OPENAI_API_KEY=$(aws ssm get-parameter --name "${PREFIX}/openai/api_key" --with-decryption --query 'Parameter.Value' --output text)
ELEVENLABS_API_KEY=$(aws ssm get-parameter --name "${PREFIX}/elevenlabs/api_key" --with-decryption --query 'Parameter.Value' --output text)
JWT_SECRET=$(aws ssm get-parameter --name "${PREFIX}/jwt/secret" --with-decryption --query 'Parameter.Value' --output text)

# Deploy Lambda function
FUNCTION_NAME="storytailor-api-${ENVIRONMENT}"

if aws lambda get-function --function-name "$FUNCTION_NAME" &> /dev/null; then
    echo -e "${YELLOW}🔄 Updating existing function...${NC}"
    
    # Update function code
    aws lambda update-function-code \
        --function-name "$FUNCTION_NAME" \
        --zip-file "fileb://$PACKAGE_FILE" \
        --output table > /dev/null
    
    # Update function configuration
    aws lambda update-function-configuration \
        --function-name "$FUNCTION_NAME" \
        --handler "index.handler" \
        --timeout 60 \
        --memory-size 512 \
        --environment Variables="{
            ENVIRONMENT=$ENVIRONMENT,
            SUPABASE_URL=$SUPABASE_URL,
            SUPABASE_SERVICE_KEY=$SUPABASE_SERVICE_KEY,
            OPENAI_API_KEY=$OPENAI_API_KEY,
            ELEVENLABS_API_KEY=$ELEVENLABS_API_KEY,
            JWT_SECRET=$JWT_SECRET
        }" \
        --output table > /dev/null
    
    echo -e "${GREEN}✅ Function updated${NC}"
else
    echo -e "${YELLOW}🚀 Creating new function...${NC}"
    
    aws lambda create-function \
        --function-name "$FUNCTION_NAME" \
        --runtime "nodejs18.x" \
        --role "$ROLE_ARN" \
        --handler "index.handler" \
        --zip-file "fileb://$PACKAGE_FILE" \
        --timeout 60 \
        --memory-size 512 \
        --description "Storytailor API - Main application handler" \
        --environment Variables="{
            ENVIRONMENT=$ENVIRONMENT,
            SUPABASE_URL=$SUPABASE_URL,
            SUPABASE_SERVICE_KEY=$SUPABASE_SERVICE_KEY,
            OPENAI_API_KEY=$OPENAI_API_KEY,
            ELEVENLABS_API_KEY=$ELEVENLABS_API_KEY,
            JWT_SECRET=$JWT_SECRET
        }" \
        --output table > /dev/null
    
    echo -e "${GREEN}✅ Function created${NC}"
fi

# Test the function
echo -e "${YELLOW}🧪 Testing deployed function...${NC}"

TEST_PAYLOAD='{"httpMethod":"GET","path":"/health","body":null}'
aws lambda invoke \
    --function-name "$FUNCTION_NAME" \
    --payload "$TEST_PAYLOAD" \
    /tmp/lambda-response.json \
    --output table > /dev/null

if [ -f /tmp/lambda-response.json ]; then
    echo -e "${GREEN}✅ Lambda function test successful${NC}"
    echo -e "${BLUE}Response: $(cat /tmp/lambda-response.json)${NC}"
else
    echo -e "${RED}❌ Lambda function test failed${NC}"
fi

# Clean up
rm -rf "$TEMP_DIR"
rm -f "$PACKAGE_FILE"
rm -f /tmp/lambda-response.json

echo ""
echo -e "${GREEN}🎉 Lambda deployment completed successfully!${NC}"
echo ""
echo -e "${BLUE}📋 Deployment Summary:${NC}"
echo -e "${GREEN}✅ Function: ${FUNCTION_NAME}${NC}"
echo -e "${BLUE}   Runtime: Node.js 18.x${NC}"
echo -e "${BLUE}   Memory: 512 MB${NC}"
echo -e "${BLUE}   Timeout: 60 seconds${NC}"
echo -e "${BLUE}   Environment variables: Configured${NC}"
echo ""
echo -e "${BLUE}Available endpoints:${NC}"
echo -e "${BLUE}   GET  /health     - Health check${NC}"
echo -e "${BLUE}   GET  /stories    - List stories${NC}"
echo -e "${BLUE}   POST /stories    - Create story${NC}"
echo -e "${BLUE}   GET  /test-db    - Test database${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo -e "${BLUE}1. Set up API Gateway${NC}"
echo -e "${BLUE}2. Test end-to-end integration${NC}"
echo -e "${BLUE}3. Run validation tests${NC}"