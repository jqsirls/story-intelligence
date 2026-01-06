#!/bin/bash
# Deploy Lambda Functions
# This script packages and deploys all Lambda functions for the Storytailor platform
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

ENVIRONMENT=${1:-staging}
PREFIX="/storytailor-${ENVIRONMENT}"

echo -e "${BLUE}🚀 Deploying Lambda Functions${NC}"
echo -e "${BLUE}Environment: ${ENVIRONMENT}${NC}"
echo -e "${BLUE}========================================${NC}"

# Check prerequisites
check_prerequisites() {
    echo -e "${YELLOW}🔍 Checking prerequisites...${NC}"
    
    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        echo -e "${RED}❌ AWS CLI not found${NC}"
        exit 1
    fi
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        echo -e "${RED}❌ Node.js not found${NC}"
        exit 1
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        echo -e "${RED}❌ npm not found${NC}"
        exit 1
    fi
    
    # Check zip
    if ! command -v zip &> /dev/null; then
        echo -e "${RED}❌ zip utility not found${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ All prerequisites available${NC}"
}

# Get AWS account info
get_aws_info() {
    echo -e "${YELLOW}📋 Getting AWS account information...${NC}"
    
    AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    AWS_REGION=$(aws configure get region || echo "us-east-1")
    
    echo -e "${GREEN}✅ AWS Account: ${AWS_ACCOUNT_ID}${NC}"
    echo -e "${GREEN}✅ AWS Region: ${AWS_REGION}${NC}"
}

# Create Lambda deployment package
create_lambda_package() {
    local function_name="$1"
    local source_dir="$2"
    local description="$3"
    
    echo -e "${YELLOW}📦 Packaging: ${description}${NC}"
    
    # Create temporary directory for packaging
    local temp_dir=$(mktemp -d)
    local package_file="/tmp/${function_name}-${ENVIRONMENT}.zip"
    
    # Copy source files
    if [ -d "$source_dir" ]; then
        cp -r "$source_dir"/* "$temp_dir/"
    else
        echo -e "${RED}❌ Source directory not found: $source_dir${NC}"
        return 1
    fi
    
    # Install dependencies if package.json exists
    if [ -f "$temp_dir/package.json" ]; then
        echo -e "${BLUE}   Installing dependencies...${NC}"
        cd "$temp_dir"
        npm install --production --silent
        cd - > /dev/null
    fi
    
    # Create deployment package
    cd "$temp_dir"
    zip -r "$package_file" . -q
    cd - > /dev/null
    
    # Clean up temp directory
    rm -rf "$temp_dir"
    
    echo -e "${GREEN}   ✅ Package created: $(basename $package_file)${NC}"
    echo "$package_file"
}

# Deploy Lambda function
deploy_lambda_function() {
    local function_name="$1"
    local package_file="$2"
    local handler="$3"
    local description="$4"
    local timeout="${5:-30}"
    local memory="${6:-256}"
    
    echo -e "${YELLOW}🚀 Deploying: ${description}${NC}"
    
    # Check if function exists
    if aws lambda get-function --function-name "$function_name" &> /dev/null; then
        echo -e "${BLUE}   Updating existing function...${NC}"
        
        # Update function code
        aws lambda update-function-code \
            --function-name "$function_name" \
            --zip-file "fileb://$package_file" \
            --output table > /dev/null
        
        # Update function configuration
        aws lambda update-function-configuration \
            --function-name "$function_name" \
            --handler "$handler" \
            --timeout "$timeout" \
            --memory-size "$memory" \
            --environment Variables="{
                ENVIRONMENT=$ENVIRONMENT,
                SUPABASE_URL=$(aws ssm get-parameter --name "${PREFIX}/supabase/url" --query 'Parameter.Value' --output text),
                SUPABASE_SERVICE_KEY=$(aws ssm get-parameter --name "${PREFIX}/supabase/service_key" --with-decryption --query 'Parameter.Value' --output text),
                OPENAI_API_KEY=$(aws ssm get-parameter --name "${PREFIX}/openai/api_key" --with-decryption --query 'Parameter.Value' --output text),
                ELEVENLABS_API_KEY=$(aws ssm get-parameter --name "${PREFIX}/elevenlabs/api_key" --with-decryption --query 'Parameter.Value' --output text),
                JWT_SECRET=$(aws ssm get-parameter --name "${PREFIX}/jwt/secret" --with-decryption --query 'Parameter.Value' --output text)
            }" \
            --output table > /dev/null
        
        echo -e "${GREEN}   ✅ Function updated${NC}"
    else
        echo -e "${BLUE}   Creating new function...${NC}"
        
        # Create IAM role for Lambda if it doesn't exist
        local role_name="storytailor-lambda-role-${ENVIRONMENT}"
        local role_arn
        
        if ! aws iam get-role --role-name "$role_name" &> /dev/null; then
            echo -e "${BLUE}   Creating IAM role...${NC}"
            
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
                --role-name "$role_name" \
                --assume-role-policy-document file:///tmp/trust-policy.json \
                --output table > /dev/null
            
            # Attach basic execution policy
            aws iam attach-role-policy \
                --role-name "$role_name" \
                --policy-arn "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
            
            # Attach SSM access policy
            aws iam attach-role-policy \
                --role-name "$role_name" \
                --policy-arn "arn:aws:iam::aws:policy/AmazonSSMReadOnlyAccess"
            
            # Clean up
            rm /tmp/trust-policy.json
            
            # Wait for role to be available
            sleep 10
        fi
        
        role_arn="arn:aws:iam::${AWS_ACCOUNT_ID}:role/${role_name}"
        
        # Create function
        aws lambda create-function \
            --function-name "$function_name" \
            --runtime "nodejs18.x" \
            --role "$role_arn" \
            --handler "$handler" \
            --zip-file "fileb://$package_file" \
            --timeout "$timeout" \
            --memory-size "$memory" \
            --description "$description" \
            --environment Variables="{
                ENVIRONMENT=$ENVIRONMENT,
                SUPABASE_URL=$(aws ssm get-parameter --name "${PREFIX}/supabase/url" --query 'Parameter.Value' --output text),
                SUPABASE_SERVICE_KEY=$(aws ssm get-parameter --name "${PREFIX}/supabase/service_key" --with-decryption --query 'Parameter.Value' --output text),
                OPENAI_API_KEY=$(aws ssm get-parameter --name "${PREFIX}/openai/api_key" --with-decryption --query 'Parameter.Value' --output text),
                ELEVENLABS_API_KEY=$(aws ssm get-parameter --name "${PREFIX}/elevenlabs/api_key" --with-decryption --query 'Parameter.Value' --output text),
                JWT_SECRET=$(aws ssm get-parameter --name "${PREFIX}/jwt/secret" --with-decryption --query 'Parameter.Value' --output text)
            }" \
            --output table > /dev/null
        
        echo -e "${GREEN}   ✅ Function created${NC}"
    fi
    
    # Clean up package file
    rm -f "$package_file"
}

# Create a simple Lambda function for testing
create_test_lambda() {
    echo -e "${YELLOW}📝 Creating test Lambda function...${NC}"
    
    local test_dir=$(mktemp -d)
    
    # Create package.json
    cat > "$test_dir/package.json" << EOF
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
    cat > "$test_dir/index.js" << 'EOF'
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
    const { httpMethod, path, body } = event;
    const requestBody = body ? JSON.parse(body) : {};
    
    // Handle different routes
    switch (path) {
      case '/health':
        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,Authorization',
            'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
          },
          body: JSON.stringify({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            environment: process.env.ENVIRONMENT
          })
        };
      
      case '/stories':
        if (httpMethod === 'GET') {
          // Get stories
          const { data, error } = await supabase
            .from('stories')
            .select('*')
            .limit(10);
          
          if (error) throw error;
          
          return {
            statusCode: 200,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({ stories: data })
          };
        } else if (httpMethod === 'POST') {
          // Create story
          const { data, error } = await supabase
            .from('stories')
            .insert([requestBody])
            .select();
          
          if (error) throw error;
          
          return {
            statusCode: 201,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({ story: data[0] })
          };
        }
        break;
      
      default:
        return {
          statusCode: 404,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({ error: 'Not found' })
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
        error: 'Internal server error',
        message: error.message
      })
    };
  }
};
EOF
    
    echo "$test_dir"
}

# Main deployment process
main() {
    echo -e "${BLUE}Starting Lambda function deployment...${NC}"
    echo ""
    
    # Check prerequisites
    check_prerequisites
    echo ""
    
    # Get AWS info
    get_aws_info
    echo ""
    
    # Create test Lambda function
    echo -e "${YELLOW}🏗️  Creating Lambda functions...${NC}"
    
    # Create and deploy main API function
    local test_lambda_dir=$(create_test_lambda)
    echo -e "${BLUE}   Test Lambda directory: $test_lambda_dir${NC}"
    local package_file=$(create_lambda_package "storytailor-api-${ENVIRONMENT}" "$test_lambda_dir" "Main API function")
    
    deploy_lambda_function \
        "storytailor-api-${ENVIRONMENT}" \
        "$package_file" \
        "index.handler" \
        "Storytailor API - Main application handler" \
        60 \
        512
    
    # Clean up
    rm -rf "$test_lambda_dir"
    
    echo ""
    echo -e "${GREEN}🎉 Lambda deployment completed!${NC}"
    
    # Test the deployed function
    echo -e "${YELLOW}🧪 Testing deployed function...${NC}"
    
    local test_result=$(aws lambda invoke \
        --function-name "storytailor-api-${ENVIRONMENT}" \
        --payload '{"httpMethod":"GET","path":"/health","body":null}' \
        /tmp/lambda-response.json \
        --output text --query 'StatusCode')
    
    if [ "$test_result" = "200" ]; then
        echo -e "${GREEN}✅ Lambda function test successful${NC}"
        echo -e "${BLUE}Response: $(cat /tmp/lambda-response.json)${NC}"
    else
        echo -e "${RED}❌ Lambda function test failed (Status: $test_result)${NC}"
    fi
    
    # Clean up
    rm -f /tmp/lambda-response.json
    
    echo ""
    echo -e "${BLUE}📋 Deployment Summary:${NC}"
    echo -e "${GREEN}✅ Function: storytailor-api-${ENVIRONMENT}${NC}"
    echo -e "${BLUE}   Runtime: Node.js 18.x${NC}"
    echo -e "${BLUE}   Memory: 512 MB${NC}"
    echo -e "${BLUE}   Timeout: 60 seconds${NC}"
    echo -e "${BLUE}   Environment variables configured${NC}"
    
    echo ""
    echo -e "${BLUE}Next steps:${NC}"
    echo -e "${BLUE}1. Set up API Gateway${NC}"
    echo -e "${BLUE}2. Test end-to-end integration${NC}"
    echo -e "${BLUE}3. Run validation tests${NC}"
}

# Show help
show_help() {
    echo "Usage: $0 [environment]"
    echo ""
    echo "Deploy Lambda functions for the Storytailor platform"
    echo ""
    echo "Arguments:"
    echo "  environment    Environment name (staging, prod) [default: staging]"
    echo ""
    echo "Examples:"
    echo "  $0 staging     # Deploy to staging"
    echo "  $0 prod        # Deploy to production"
    echo ""
    echo "Prerequisites:"
    echo "  - AWS CLI configured"
    echo "  - Node.js and npm installed"
    echo "  - API keys configured in SSM"
    echo "  - Supabase database set up"
}

# Handle script arguments
case "${1}" in
    "help"|"-h"|"--help")
        show_help
        ;;
    "")
        main
        ;;
    *)
        if [[ "$1" =~ ^(staging|prod|dev)$ ]]; then
            main
        else
            echo -e "${RED}❌ Invalid environment: $1${NC}"
            echo -e "${YELLOW}Valid environments: staging, prod, dev${NC}"
            show_help
            exit 1
        fi
        ;;
esac