#!/bin/bash
# Deploy Deletion System Processors (inactivity-processor and deletion-processor)

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BLUE='\033[0;34m'
NC='\033[0m'

REGION="us-east-1"
INACTIVITY_LAMBDA="storytailor-inactivity-processor-production"
DELETION_LAMBDA="storytailor-deletion-processor-production"
INACTIVITY_DIR="lambda-deployments/inactivity-processor"
DELETION_DIR="lambda-deployments/deletion-processor"

# Get environment variables from SSM Parameter Store (source of truth)
echo -e "${YELLOW}📋 Reading environment variables from SSM Parameter Store...${NC}"
PREFIX="/storytailor-production"

# Try both parameter path formats for compatibility
SUPABASE_URL=$(aws ssm get-parameter --name "${PREFIX}/supabase/url" --with-decryption --query 'Parameter.Value' --output text --region "${REGION}" 2>/dev/null || \
               aws ssm get-parameter --name "${PREFIX}/supabase-url" --with-decryption --query 'Parameter.Value' --output text --region "${REGION}" 2>/dev/null || echo "")

SUPABASE_SERVICE_KEY=$(aws ssm get-parameter --name "${PREFIX}/supabase/service-key" --with-decryption --query 'Parameter.Value' --output text --region "${REGION}" 2>/dev/null || \
                        aws ssm get-parameter --name "${PREFIX}/supabase-service-key" --with-decryption --query 'Parameter.Value' --output text --region "${REGION}" 2>/dev/null || \
                        aws ssm get-parameter --name "${PREFIX}/supabase-service-role-key" --with-decryption --query 'Parameter.Value' --output text --region "${REGION}" 2>/dev/null || echo "")

REDIS_URL=$(aws ssm get-parameter --name "${PREFIX}/redis-url" --with-decryption --query 'Parameter.Value' --output text --region "${REGION}" 2>/dev/null || \
             aws ssm get-parameter --name "${PREFIX}/redis/url" --with-decryption --query 'Parameter.Value' --output text --region "${REGION}" 2>/dev/null || echo "")

# Email service configuration
EMAIL_FROM=$(aws ssm get-parameter --name "${PREFIX}/email-from" --with-decryption --query 'Parameter.Value' --output text --region "${REGION}" 2>/dev/null || echo "magic@storytailor.com")

# SendGrid API key (if available)
SENDGRID_API_KEY=$(aws ssm get-parameter --name "${PREFIX}/sendgrid-api-key" --with-decryption --query 'Parameter.Value' --output text --region "${REGION}" 2>/dev/null || \
                    aws ssm get-parameter --name "${PREFIX}/sendgrid/api-key" --with-decryption --query 'Parameter.Value' --output text --region "${REGION}" 2>/dev/null || echo "")

# Validate required parameters
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_KEY" ]; then
  echo -e "${RED}❌ Error: Missing required SSM parameters${NC}"
  echo -e "${YELLOW}  Required:${NC}"
  echo -e "${YELLOW}    - ${PREFIX}/supabase/url${NC}"
  echo -e "${YELLOW}    - ${PREFIX}/supabase/service-key${NC}"
  echo -e "${YELLOW}  Please ensure these parameters exist in SSM Parameter Store${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Environment variables loaded from SSM${NC}"

echo -e "${CYAN}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║     Deploying Deletion System Processors (Production)            ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Function to deploy a processor
deploy_processor() {
  local LAMBDA_NAME=$1
  local DEPLOY_DIR=$2
  local PROCESSOR_NAME=$3
  
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${CYAN}Deploying ${PROCESSOR_NAME}...${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  
  # Install all dependencies first (needed for building services)
  echo -e "${YELLOW}📦 Installing dependencies...${NC}"
  cd "${DEPLOY_DIR}"
  npm install --legacy-peer-deps 2>&1 | grep -v "shared-types" || true
  
  # Run build script that copies services and templates
  echo -e "${YELLOW}📦 Building with services...${NC}"
  if [ -f "build.sh" ]; then
    chmod +x build.sh
    ./build.sh
  else
    npm run build
  fi
  
  # Install production dependencies only
  echo -e "${YELLOW}📦 Installing production dependencies...${NC}"
  npm install --production --legacy-peer-deps 2>&1 | grep -v "shared-types" || true
  
  # Ensure templates are copied to dist
  if [ -d "src/templates" ]; then
    echo -e "${YELLOW}📦 Copying email templates...${NC}"
    mkdir -p dist/templates
    cp -r src/templates/* dist/templates/ 2>/dev/null || true
  fi
  
  # Create deployment package
  echo -e "${YELLOW}📦 Creating deployment package...${NC}"
  zip -r "/tmp/${PROCESSOR_NAME}-deployment.zip" \
    dist/ \
    node_modules/ \
    package.json \
    >/dev/null 2>&1
  
  # Check if Lambda exists
  if aws lambda get-function --function-name "${LAMBDA_NAME}" --region "${REGION}" >/dev/null 2>&1; then
    echo -e "${YELLOW}♻️  Updating existing Lambda function...${NC}"
    aws lambda update-function-code \
      --function-name "${LAMBDA_NAME}" \
      --region "${REGION}" \
      --zip-file "fileb:///tmp/${PROCESSOR_NAME}-deployment.zip" >/dev/null 2>&1
    
    # Wait for update to complete
    echo -e "${YELLOW}⏳ Waiting for update to complete...${NC}"
    aws lambda wait function-updated --function-name "${LAMBDA_NAME}" --region "${REGION}"
    
    # Update environment variables
    echo -e "${YELLOW}🔧 Updating environment variables...${NC}"
    aws lambda update-function-configuration \
      --function-name "${LAMBDA_NAME}" \
      --region "${REGION}" \
      --environment "Variables={
        SUPABASE_URL='${SUPABASE_URL}',
        SUPABASE_SERVICE_ROLE_KEY='${SUPABASE_SERVICE_KEY}',
        REDIS_URL='${REDIS_URL}',
        SENDGRID_API_KEY='${SENDGRID_API_KEY}',
        EMAIL_FROM='${EMAIL_FROM}',
        LOG_LEVEL=info
      }" >/dev/null 2>&1
    
    # Wait for configuration update to complete
    echo -e "${YELLOW}⏳ Waiting for configuration update...${NC}"
    aws lambda wait function-updated --function-name "${LAMBDA_NAME}" --region "${REGION}"
  else
    echo -e "${YELLOW}🆕 Creating new Lambda function...${NC}"
    # Get role ARN (try production role first, then fallback)
    ROLE_ARN=$(aws iam get-role --role-name "storytailor-lambda-role-production" --query 'Role.Arn' --output text --region "${REGION}" 2>/dev/null || \
               aws iam get-role --role-name "storytailor-production-lambda-execution-role" --query 'Role.Arn' --output text --region "${REGION}" 2>/dev/null || \
               echo "")
    
    if [ -z "$ROLE_ARN" ]; then
      echo -e "${RED}❌ Lambda execution role not found. Please create it first.${NC}"
      echo -e "${YELLOW}  Tried: storytailor-lambda-role-production, storytailor-production-lambda-execution-role${NC}"
      return 1
    fi
    
    aws lambda create-function \
      --function-name "${LAMBDA_NAME}" \
      --region "${REGION}" \
      --runtime nodejs20.x \
      --role "${ROLE_ARN}" \
      --handler dist/index.handler \
      --zip-file "fileb:///tmp/${PROCESSOR_NAME}-deployment.zip" \
      --timeout 300 \
      --memory-size 512 \
      --environment "Variables={
        SUPABASE_URL='${SUPABASE_URL}',
        SUPABASE_SERVICE_ROLE_KEY='${SUPABASE_SERVICE_KEY}',
        REDIS_URL='${REDIS_URL}',
        SENDGRID_API_KEY='${SENDGRID_API_KEY}',
        EMAIL_FROM='${EMAIL_FROM}',
        LOG_LEVEL=info
      }" >/dev/null 2>&1
  fi
  
  echo -e "${GREEN}✅ ${PROCESSOR_NAME} deployed successfully!${NC}"
  echo ""
  
  cd - >/dev/null
}

# Deploy inactivity processor
deploy_processor "${INACTIVITY_LAMBDA}" "${INACTIVITY_DIR}" "Inactivity Processor"

# Deploy deletion processor
deploy_processor "${DELETION_LAMBDA}" "${DELETION_DIR}" "Deletion Processor"

echo -e "${GREEN}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║          All Processors Deployed Successfully!                    ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${CYAN}📝 Next steps:${NC}"
echo -e "  1. Configure EventBridge rules to trigger these processors"
echo -e "  2. Set up SSM parameters for configuration"
echo -e "  3. Test the processors"
