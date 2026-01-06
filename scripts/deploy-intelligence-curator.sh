#!/bin/bash

# Deploy Intelligence Curator Lambda
# Usage: ./scripts/deploy-intelligence-curator.sh [staging|production]

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

ENVIRONMENT=${1:-staging}
AWS_REGION=${AWS_REGION:-us-east-1}

if [ "$ENVIRONMENT" != "staging" ] && [ "$ENVIRONMENT" != "production" ]; then
  echo -e "${RED}❌ Invalid environment. Use: staging or production${NC}"
  exit 1
fi

LAMBDA_NAME="storytailor-intelligence-curator-${ENVIRONMENT}"
LAMBDA_ROLE="arn:aws:iam::326181217496:role/storytailor-lambda-role-staging"

echo -e "${MAGENTA}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${MAGENTA}║          INTELLIGENCE CURATOR DEPLOYMENT                         ║${NC}"
echo -e "${MAGENTA}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}🎯 Environment: ${ENVIRONMENT}${NC}"
echo -e "${BLUE}📍 Region: ${AWS_REGION}${NC}"
echo -e "${BLUE}🔗 Lambda: ${LAMBDA_NAME}${NC}"
echo ""

# ============================================================================
# Build Dependencies
# ============================================================================

echo -e "${YELLOW}🔨 Building workspace dependencies...${NC}"

# Build shared-types first
echo -e "${CYAN}   Building shared-types...${NC}"
cd packages/shared-types
npm run build
cd ../..

# Build universal-agent (contains all services)
echo -e "${CYAN}   Building universal-agent...${NC}"
cd packages/universal-agent
npm run build
cd ../..

echo -e "${GREEN}✅ Dependencies built${NC}"
echo ""

# ============================================================================
# Create Deployment Package
# ============================================================================

echo -e "${YELLOW}📦 Creating deployment package...${NC}"

# Create temp directory
DEPLOY_DIR="lambda-deployments/intelligence-curator"
mkdir -p "$DEPLOY_DIR/dist"
mkdir -p "$DEPLOY_DIR/node_modules"

# Copy Lambda handler
# NOTE: When deploying from within the monorepo, `$DEPLOY_DIR` is already
# `lambda-deployments/intelligence-curator`, so copying `src/` onto itself can
# cause `cp` to exit non-zero ("are identical") under `set -e`.
# The handler sources are already in place, so treat this as a no-op.
cp -r lambda-deployments/intelligence-curator/src "$DEPLOY_DIR/" 2>/dev/null || true

# Copy built services from universal-agent
echo -e "${CYAN}   Copying services...${NC}"
mkdir -p "$DEPLOY_DIR/dist/services"
cp packages/universal-agent/dist/services/IntelligenceCurator.* "$DEPLOY_DIR/dist/services/" 2>/dev/null || true
cp packages/universal-agent/dist/services/EmailService.* "$DEPLOY_DIR/dist/services/" 2>/dev/null || true
cp packages/universal-agent/dist/services/ConsumptionAnalyticsService.* "$DEPLOY_DIR/dist/services/" 2>/dev/null || true
cp packages/universal-agent/dist/services/DailyDigestService.* "$DEPLOY_DIR/dist/services/" 2>/dev/null || true
cp packages/universal-agent/dist/services/WeeklyInsightsService.* "$DEPLOY_DIR/dist/services/" 2>/dev/null || true
cp packages/universal-agent/dist/services/StoryEffectivenessService.* "$DEPLOY_DIR/dist/services/" 2>/dev/null || true
cp packages/universal-agent/dist/services/PowerUserDetectionService.* "$DEPLOY_DIR/dist/services/" 2>/dev/null || true
cp packages/universal-agent/dist/services/OrganizationHealthService.* "$DEPLOY_DIR/dist/services/" 2>/dev/null || true
cp packages/universal-agent/dist/services/ReferralRewardService.* "$DEPLOY_DIR/dist/services/" 2>/dev/null || true
cp packages/universal-agent/dist/services/UserTypeRouter.* "$DEPLOY_DIR/dist/services/" 2>/dev/null || true

# Install production dependencies
echo -e "${CYAN}   Installing production dependencies...${NC}"
cd "$DEPLOY_DIR"
npm init -y > /dev/null 2>&1
npm install --production \
  @supabase/supabase-js \
  winston \
  stripe \
  @aws-sdk/client-s3 \
  @aws-sdk/s3-request-presigner \
  @aws-sdk/client-ssm \
  > /dev/null 2>&1
cd ../..

# Create deployment zip
echo -e "${CYAN}   Creating deployment zip...${NC}"
cd "$DEPLOY_DIR"
zip -r ../intelligence-curator-deployment.zip . > /dev/null
cd ../..

PACKAGE_SIZE=$(du -h lambda-deployments/intelligence-curator-deployment.zip | cut -f1)
echo -e "${GREEN}✅ Deployment package created: ${PACKAGE_SIZE}${NC}"
echo ""

# ============================================================================
# Deploy to Lambda
# ============================================================================

echo -e "${YELLOW}🚀 Deploying to Lambda...${NC}"

# Check if function exists
if aws lambda get-function --function-name "$LAMBDA_NAME" --region "$AWS_REGION" &>/dev/null; then
  echo -e "${YELLOW}♻️  Updating existing Lambda function...${NC}"
  
  aws lambda update-function-code \
    --function-name "$LAMBDA_NAME" \
    --zip-file fileb://lambda-deployments/intelligence-curator-deployment.zip \
    --region "$AWS_REGION" \
    > /dev/null
  
  echo -e "${GREEN}✅ Lambda function updated${NC}"
else
  echo -e "${YELLOW}🆕 Creating new Lambda function...${NC}"
  
  # Get SSM parameters for environment variables
  echo -e "${CYAN}   Fetching environment variables from SSM...${NC}"
  
  SUPABASE_URL=$(aws ssm get-parameter --name "/storytailor-${ENVIRONMENT}/supabase-url" --query 'Parameter.Value' --output text 2>/dev/null || echo "")
  SUPABASE_KEY=$(aws ssm get-parameter --name "/storytailor-${ENVIRONMENT}/supabase-service-key" --with-decryption --query 'Parameter.Value' --output text 2>/dev/null || echo "")
  STRIPE_KEY=$(aws ssm get-parameter --name "/storytailor-${ENVIRONMENT}/stripe-secret-key" --with-decryption --query 'Parameter.Value' --output text 2>/dev/null || echo "")
  SENDGRID_KEY=$(aws ssm get-parameter --name "/storytailor-${ENVIRONMENT}/sendgrid-api-key" --with-decryption --query 'Parameter.Value' --output text 2>/dev/null || echo "")
  
  aws lambda create-function \
    --function-name "$LAMBDA_NAME" \
    --runtime nodejs22.x \
    --role "$LAMBDA_ROLE" \
    --handler "dist/lambda.handler" \
    --zip-file fileb://lambda-deployments/intelligence-curator-deployment.zip \
    --timeout 300 \
    --memory-size 512 \
    --environment "Variables={
      ENVIRONMENT=${ENVIRONMENT},
      SUPABASE_URL=${SUPABASE_URL},
      SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_KEY},
      STRIPE_SECRET_KEY=${STRIPE_KEY},
      SENDGRID_API_KEY=${SENDGRID_KEY},
      AWS_REGION=${AWS_REGION}
    }" \
    --region "$AWS_REGION" \
    --description "Intelligence Curator - Event-driven pipeline orchestration with veto authority" \
    > /dev/null
  
  echo -e "${GREEN}✅ Lambda function created${NC}"
fi

echo ""
echo -e "${MAGENTA}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${MAGENTA}║          🎉 INTELLIGENCE CURATOR DEPLOYED! 🎉                    ║${NC}"
echo -e "${MAGENTA}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${CYAN}Lambda Function: ${LAMBDA_NAME}${NC}"
echo -e "${CYAN}Region: ${AWS_REGION}${NC}"
echo -e "${CYAN}Handler: dist/lambda.handler${NC}"
echo ""
echo -e "${GREEN}✅ Intelligence Curator is ready to handle:${NC}"
echo -e "   • Daily consumption digests (8pm UTC)"
echo -e "   • Weekly insights (Sunday 6pm UTC)"
echo -e "   • Story effectiveness scoring (4am UTC)"
echo -e "   • Referral reward processing (1am UTC)"
echo -e "   • Organization health reports (first Monday)"
echo -e "   • Power user detection (12pm UTC)"
echo -e "   • Asset timeout monitoring (every 15 min)"
echo ""
echo -e "${YELLOW}⚠️  Next steps:${NC}"
echo -e "   1. Configure EventBridge rules: ./scripts/configure-pipeline-eventbridge.sh ${ENVIRONMENT}"
echo -e "   2. Apply database migration: supabase db push"
echo -e "   3. Test a job manually via EventBridge"
echo ""

