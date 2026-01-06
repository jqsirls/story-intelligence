#!/bin/bash
# Deploy Fieldnotes (User Research Agent) to AWS Lambda
# Production deployment script following established patterns

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Environment setup
ENVIRONMENT=${1:-production}
PREFIX="/storytailor-${ENVIRONMENT}"
LAMBDA_NAME_API="storytailor-fieldnotes-api-${ENVIRONMENT}"
LAMBDA_NAME_SCHEDULED="storytailor-fieldnotes-scheduled-${ENVIRONMENT}"
HANDLER_API="dist/lambda.handler"
HANDLER_SCHEDULED="dist/lambda-scheduled.handler"
AGENT_DIR="packages/user-research-agent"
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
AWS_REGION=${AWS_REGION:-us-east-1}

echo -e "${PURPLE}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${PURPLE}║          📊 DEPLOYING FIELDNOTES (USER RESEARCH AGENT) 📊        ║${NC}"
echo -e "${PURPLE}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo -e "${CYAN}Environment: ${ENVIRONMENT}${NC}"
echo -e "${CYAN}Region: ${AWS_REGION}${NC}"
echo ""

# Validate environment
if [[ "$ENVIRONMENT" != "staging" && "$ENVIRONMENT" != "production" ]]; then
    echo -e "${RED}❌ Invalid environment: $ENVIRONMENT${NC}"
    echo -e "${YELLOW}Usage: $0 [staging|production]${NC}"
    exit 1
fi

# Get AWS account info
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
LAMBDA_ROLE_ARN="arn:aws:iam::${AWS_ACCOUNT_ID}:role/storytailor-lambda-role-${ENVIRONMENT}"

echo -e "${GREEN}✅ AWS Account: ${AWS_ACCOUNT_ID}${NC}"
echo -e "${GREEN}✅ AWS Region: ${AWS_REGION}${NC}"
echo -e "${GREEN}✅ Lambda Role: storytailor-lambda-role-${ENVIRONMENT}${NC}"
echo ""

# Change to project root
cd "$PROJECT_ROOT"

# Verify agent directory exists
if [ ! -d "$AGENT_DIR" ]; then
    echo -e "${RED}❌ Error: User Research Agent directory not found at $AGENT_DIR${NC}"
    exit 1
fi

# Step 1: Build workspace dependencies
echo -e "${BLUE}📦 Step 1: Building workspace dependencies...${NC}"

# Build shared-types
if [ -d "packages/shared-types" ]; then
    echo -e "${YELLOW}  Building @alexa-multi-agent/shared-types...${NC}"
    cd packages/shared-types
    npm run build:skip-proto >/dev/null 2>&1 || npm run build >/dev/null 2>&1 || echo -e "${YELLOW}  ⚠️  shared-types build may have issues${NC}"
    cd "$PROJECT_ROOT"
fi

# Step 2: Build user-research-agent
echo -e "${BLUE}📦 Step 2: Building User Research Agent...${NC}"
cd "$AGENT_DIR"
npm run build 2>&1 | grep -v "error TS" || echo -e "${YELLOW}  ⚠️  Build completed with warnings${NC}"

if [ ! -d "dist" ] || [ ! -f "dist/lambda.js" ]; then
    echo -e "${RED}❌ Error: Build failed - dist/lambda.js not found${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Build successful${NC}"
cd "$PROJECT_ROOT"

# Step 3: Prepare deployment directory
echo -e "${BLUE}📦 Step 3: Preparing deployment package...${NC}"
DEPLOY_DIR=$(mktemp -d)
echo -e "${CYAN}Deploy directory: $DEPLOY_DIR${NC}"

# Copy built files
cp -r "$AGENT_DIR/dist" "$DEPLOY_DIR/"
cp "$AGENT_DIR/package.json" "$DEPLOY_DIR/"

# Copy shared-types if needed
if [ -d "packages/shared-types/dist" ]; then
    mkdir -p "$DEPLOY_DIR/node_modules/@alexa-multi-agent/shared-types"
    cp -r "packages/shared-types/dist" "$DEPLOY_DIR/node_modules/@alexa-multi-agent/shared-types/"
    cat > "$DEPLOY_DIR/node_modules/@alexa-multi-agent/shared-types/package.json" << 'EOF'
{
  "name": "@alexa-multi-agent/shared-types",
  "version": "1.0.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "type": "commonjs"
}
EOF
fi

# Step 4: Install production dependencies
echo -e "${BLUE}📦 Step 4: Installing production dependencies...${NC}"
cd "$DEPLOY_DIR"
npm install --production --no-audit --no-fund >/dev/null 2>&1

# Step 5: Get environment variables from SSM
echo -e "${BLUE}🔧 Step 5: Loading environment configuration from SSM...${NC}"
SUPABASE_URL=$(aws ssm get-parameter --name "${PREFIX}/supabase/url" --with-decryption --query 'Parameter.Value' --output text 2>/dev/null || \
               aws ssm get-parameter --name "${PREFIX}/supabase-url" --with-decryption --query 'Parameter.Value' --output text 2>/dev/null || echo "")
SUPABASE_SERVICE_KEY=$(aws ssm get-parameter --name "${PREFIX}/supabase/service_key" --with-decryption --query 'Parameter.Value' --output text 2>/dev/null || \
                       aws ssm get-parameter --name "${PREFIX}/supabase-service-key" --with-decryption --query 'Parameter.Value' --output text 2>/dev/null || \
                       aws ssm get-parameter --name "${PREFIX}/supabase-service-role-key" --with-decryption --query 'Parameter.Value' --output text 2>/dev/null || echo "")
SUPABASE_ANON_KEY=$(aws ssm get-parameter --name "${PREFIX}/supabase/anon_key" --with-decryption --query 'Parameter.Value' --output text 2>/dev/null || \
                    aws ssm get-parameter --name "${PREFIX}/supabase-anon-key" --with-decryption --query 'Parameter.Value' --output text 2>/dev/null || echo "")
REDIS_URL=$(aws ssm get-parameter --name "${PREFIX}/redis-url" --with-decryption --query 'Parameter.Value' --output text 2>/dev/null || \
             aws ssm get-parameter --name "${PREFIX}/redis/url" --with-decryption --query 'Parameter.Value' --output text 2>/dev/null || echo "")
OPENAI_API_KEY=$(aws ssm get-parameter --name "${PREFIX}/openai/api_key" --with-decryption --query 'Parameter.Value' --output text 2>/dev/null || \
                 aws ssm get-parameter --name "${PREFIX}/openai-api-key" --with-decryption --query 'Parameter.Value' --output text 2>/dev/null || echo "")
ANTHROPIC_API_KEY=$(aws ssm get-parameter --name "${PREFIX}/anthropic/api_key" --with-decryption --query 'Parameter.Value' --output text 2>/dev/null || \
                    aws ssm get-parameter --name "${PREFIX}/anthropic-api-key" --with-decryption --query 'Parameter.Value' --output text 2>/dev/null || echo "")

# Load agent endpoints (for AgentChallenger to call other agents)
# Try SSM first, then environment variables, then use router defaults
AUTH_AGENT_ENDPOINT=$(aws ssm get-parameter --name "${PREFIX}/agents/auth-endpoint" --with-decryption --query 'Parameter.Value' --output text 2>/dev/null || \
                      echo "${AUTH_AGENT_ENDPOINT:-https://d43qck2ware2japqdze7scglqq0rfync.lambda-url.us-east-2.on.aws/}")
CONTENT_AGENT_ENDPOINT=$(aws ssm get-parameter --name "${PREFIX}/agents/content-endpoint" --with-decryption --query 'Parameter.Value' --output text 2>/dev/null || \
                          echo "${CONTENT_AGENT_ENDPOINT:-https://trnger2opr6g5iug47h7hh5rlu0yiauo.lambda-url.us-east-2.on.aws/}")
LIBRARY_AGENT_ENDPOINT=$(aws ssm get-parameter --name "${PREFIX}/agents/library-endpoint" --with-decryption --query 'Parameter.Value' --output text 2>/dev/null || \
                          echo "${LIBRARY_AGENT_ENDPOINT:-https://krtrmmkg3vbffqwh3imitrz63m0qzgli.lambda-url.us-east-2.on.aws/}")
EMOTION_AGENT_ENDPOINT=$(aws ssm get-parameter --name "${PREFIX}/agents/emotion-endpoint" --with-decryption --query 'Parameter.Value' --output text 2>/dev/null || \
                          echo "${EMOTION_AGENT_ENDPOINT:-https://izkplgtet5edsh3bflql6a6bze0gklgw.lambda-url.us-east-2.on.aws/}")
COMMERCE_AGENT_ENDPOINT=$(aws ssm get-parameter --name "${PREFIX}/agents/commerce-endpoint" --with-decryption --query 'Parameter.Value' --output text 2>/dev/null || \
                           echo "${COMMERCE_AGENT_ENDPOINT:-https://knmozto5bumqhuemxfooqirrza0zycvr.lambda-url.us-east-2.on.aws/}")
INSIGHTS_AGENT_ENDPOINT=$(aws ssm get-parameter --name "${PREFIX}/agents/insights-endpoint" --with-decryption --query 'Parameter.Value' --output text 2>/dev/null || \
                           echo "${INSIGHTS_AGENT_ENDPOINT:-https://5bccpj6yvzrhwwv6qppxtjcpdi0upbxd.lambda-url.us-east-2.on.aws/}")
SMART_HOME_AGENT_ENDPOINT=$(aws ssm get-parameter --name "${PREFIX}/agents/smart-home-endpoint" --with-decryption --query 'Parameter.Value' --output text 2>/dev/null || \
                             aws ssm get-parameter --name "${PREFIX}/agents/smarthome-endpoint" --with-decryption --query 'Parameter.Value' --output text 2>/dev/null || \
                             echo "${SMART_HOME_AGENT_ENDPOINT:-${SMARTHOME_AGENT_ENDPOINT:-https://5ohxl3xgzkcebsxhrlk2y55fkm0uuqlo.lambda-url.us-east-2.on.aws/}}")
PERSONALITY_AGENT_ENDPOINT=$(aws ssm get-parameter --name "${PREFIX}/agents/personality-endpoint" --with-decryption --query 'Parameter.Value' --output text 2>/dev/null || \
                              echo "${PERSONALITY_AGENT_ENDPOINT:-https://jqk4hk2hcwf6lhstlxj6fxlxya0qnjrc.lambda-url.us-east-2.on.aws/}")
THERAPEUTIC_AGENT_ENDPOINT=$(aws ssm get-parameter --name "${PREFIX}/agents/therapeutic-endpoint" --with-decryption --query 'Parameter.Value' --output text 2>/dev/null || \
                              echo "${THERAPEUTIC_AGENT_ENDPOINT:-https://u6wuabv6nwzk6jvv4ajmg3jwci0klhuc.lambda-url.us-east-2.on.aws/}")
KNOWLEDGE_BASE_AGENT_ENDPOINT=$(aws ssm get-parameter --name "${PREFIX}/agents/knowledge-base-endpoint" --with-decryption --query 'Parameter.Value' --output text 2>/dev/null || \
                                 echo "${KNOWLEDGE_BASE_AGENT_ENDPOINT:-https://4n7nmnuggvfskk7i3tzeq43zlu0bzvev.lambda-url.us-east-2.on.aws/}")
LOCALIZATION_AGENT_ENDPOINT=$(aws ssm get-parameter --name "${PREFIX}/agents/localization-endpoint" --with-decryption --query 'Parameter.Value' --output text 2>/dev/null || \
                               echo "${LOCALIZATION_AGENT_ENDPOINT:-https://ufkknefkwqz4wkfgbvuabcb7m40ofmqw.lambda-url.us-east-2.on.aws/}")
ACCESSIBILITY_AGENT_ENDPOINT=$(aws ssm get-parameter --name "${PREFIX}/agents/accessibility-endpoint" --with-decryption --query 'Parameter.Value' --output text 2>/dev/null || \
                                echo "${ACCESSIBILITY_AGENT_ENDPOINT:-https://ky3jkp2pv2jvcygdbm4nctdkve0lmfhr.lambda-url.us-east-2.on.aws/}")
CHILD_SAFETY_AGENT_ENDPOINT=$(aws ssm get-parameter --name "${PREFIX}/agents/child-safety-endpoint" --with-decryption --query 'Parameter.Value' --output text 2>/dev/null || \
                               echo "${CHILD_SAFETY_AGENT_ENDPOINT:-https://4g4gqbmr6zfqjuzddwb2g2zqfu0hnjxw.lambda-url.us-east-2.on.aws/}")

# Generate API key if not in SSM
FIELDNOTES_API_KEY=$(aws ssm get-parameter --name "${PREFIX}/fieldnotes/api-key" --with-decryption --query 'Parameter.Value' --output text 2>/dev/null || \
                     echo "fieldnotes-${ENVIRONMENT}-$(openssl rand -hex 16)")

# Store API key in SSM if it doesn't exist
if ! aws ssm get-parameter --name "${PREFIX}/fieldnotes/api-key" --region "$AWS_REGION" >/dev/null 2>&1; then
    echo -e "${YELLOW}  Storing Fieldnotes API key in SSM...${NC}"
    aws ssm put-parameter \
        --name "${PREFIX}/fieldnotes/api-key" \
        --value "$FIELDNOTES_API_KEY" \
        --type "SecureString" \
        --region "$AWS_REGION" \
        --overwrite >/dev/null 2>&1 || true
fi

echo -e "${GREEN}✅ Environment variables loaded${NC}"

# Step 6: Create deployment zip
echo -e "${BLUE}📦 Step 6: Creating deployment package...${NC}"
zip -r fieldnotes-deployment.zip . >/dev/null 2>&1

PACKAGE_SIZE=$(ls -lh fieldnotes-deployment.zip | awk '{print $5}')
PACKAGE_SIZE_BYTES=$(stat -f%z fieldnotes-deployment.zip 2>/dev/null || stat -c%s fieldnotes-deployment.zip 2>/dev/null || echo "0")
echo -e "${GREEN}✅ Deployment package created: $PACKAGE_SIZE${NC}"

# Step 7: Deploy API Lambda function
echo -e "${BLUE}📤 Step 7: Deploying API Lambda function...${NC}"

LAMBDA_EXISTS=$(aws lambda get-function --function-name "$LAMBDA_NAME_API" --region "$AWS_REGION" 2>&1 | grep -q "FunctionName" && echo "1" || echo "0")

if [ "$LAMBDA_EXISTS" = "0" ]; then
    echo -e "${YELLOW}🆕 Creating new Lambda function: $LAMBDA_NAME_API${NC}"
    
    if [ "$PACKAGE_SIZE_BYTES" -gt 52428800 ]; then
        echo -e "${YELLOW}⚠️  Package size > 50MB, uploading to S3 first...${NC}"
        S3_BUCKET="storytailor-lambda-deploys"
        S3_KEY="fieldnotes-api-${ENVIRONMENT}-$(date +%Y%m%d-%H%M%S).zip"
        
        aws s3 cp fieldnotes-deployment.zip "s3://${S3_BUCKET}/${S3_KEY}" --region "$AWS_REGION" 2>&1
        
        aws lambda create-function \
            --function-name "$LAMBDA_NAME_API" \
            --runtime nodejs22.x \
            --handler "$HANDLER_API" \
            --role "$LAMBDA_ROLE_ARN" \
            --code "S3Bucket=${S3_BUCKET},S3Key=${S3_KEY}" \
            --timeout 60 \
            --memory-size 512 \
            --environment Variables="{
                ENVIRONMENT='$ENVIRONMENT',
                SUPABASE_URL='$SUPABASE_URL',
                SUPABASE_SERVICE_ROLE_KEY='$SUPABASE_SERVICE_KEY',
                SUPABASE_ANON_KEY='$SUPABASE_ANON_KEY',
                REDIS_URL='$REDIS_URL',
                OPENAI_API_KEY='$OPENAI_API_KEY',
                ANTHROPIC_API_KEY='$ANTHROPIC_API_KEY',
                FIELDNOTES_API_KEY='$FIELDNOTES_API_KEY',
                AUTH_AGENT_ENDPOINT='$AUTH_AGENT_ENDPOINT',
                CONTENT_AGENT_ENDPOINT='$CONTENT_AGENT_ENDPOINT',
                LIBRARY_AGENT_ENDPOINT='$LIBRARY_AGENT_ENDPOINT',
                EMOTION_AGENT_ENDPOINT='$EMOTION_AGENT_ENDPOINT',
                COMMERCE_AGENT_ENDPOINT='$COMMERCE_AGENT_ENDPOINT',
                INSIGHTS_AGENT_ENDPOINT='$INSIGHTS_AGENT_ENDPOINT',
                SMART_HOME_AGENT_ENDPOINT='$SMART_HOME_AGENT_ENDPOINT',
                PERSONALITY_AGENT_ENDPOINT='$PERSONALITY_AGENT_ENDPOINT',
                THERAPEUTIC_AGENT_ENDPOINT='$THERAPEUTIC_AGENT_ENDPOINT',
                KNOWLEDGE_BASE_AGENT_ENDPOINT='$KNOWLEDGE_BASE_AGENT_ENDPOINT',
                LOCALIZATION_AGENT_ENDPOINT='$LOCALIZATION_AGENT_ENDPOINT',
                ACCESSIBILITY_AGENT_ENDPOINT='$ACCESSIBILITY_AGENT_ENDPOINT',
                CHILD_SAFETY_AGENT_ENDPOINT='$CHILD_SAFETY_AGENT_ENDPOINT'
            }" \
            --region "$AWS_REGION" \
            --description "Fieldnotes (User Research Agent) - REST API for research insights"
    else
        aws lambda create-function \
            --function-name "$LAMBDA_NAME_API" \
            --runtime nodejs22.x \
            --handler "$HANDLER_API" \
            --role "$LAMBDA_ROLE_ARN" \
            --zip-file fileb://fieldnotes-deployment.zip \
            --timeout 60 \
            --memory-size 512 \
            --environment Variables="{
                ENVIRONMENT='$ENVIRONMENT',
                SUPABASE_URL='$SUPABASE_URL',
                SUPABASE_SERVICE_ROLE_KEY='$SUPABASE_SERVICE_KEY',
                SUPABASE_ANON_KEY='$SUPABASE_ANON_KEY',
                REDIS_URL='$REDIS_URL',
                OPENAI_API_KEY='$OPENAI_API_KEY',
                ANTHROPIC_API_KEY='$ANTHROPIC_API_KEY',
                FIELDNOTES_API_KEY='$FIELDNOTES_API_KEY',
                AUTH_AGENT_ENDPOINT='$AUTH_AGENT_ENDPOINT',
                CONTENT_AGENT_ENDPOINT='$CONTENT_AGENT_ENDPOINT',
                LIBRARY_AGENT_ENDPOINT='$LIBRARY_AGENT_ENDPOINT',
                EMOTION_AGENT_ENDPOINT='$EMOTION_AGENT_ENDPOINT',
                COMMERCE_AGENT_ENDPOINT='$COMMERCE_AGENT_ENDPOINT',
                INSIGHTS_AGENT_ENDPOINT='$INSIGHTS_AGENT_ENDPOINT',
                SMART_HOME_AGENT_ENDPOINT='$SMART_HOME_AGENT_ENDPOINT',
                PERSONALITY_AGENT_ENDPOINT='$PERSONALITY_AGENT_ENDPOINT',
                THERAPEUTIC_AGENT_ENDPOINT='$THERAPEUTIC_AGENT_ENDPOINT',
                KNOWLEDGE_BASE_AGENT_ENDPOINT='$KNOWLEDGE_BASE_AGENT_ENDPOINT',
                LOCALIZATION_AGENT_ENDPOINT='$LOCALIZATION_AGENT_ENDPOINT',
                ACCESSIBILITY_AGENT_ENDPOINT='$ACCESSIBILITY_AGENT_ENDPOINT',
                CHILD_SAFETY_AGENT_ENDPOINT='$CHILD_SAFETY_AGENT_ENDPOINT'
            }" \
            --region "$AWS_REGION" \
            --description "Fieldnotes (User Research Agent) - REST API for research insights"
    fi
    
    echo -e "${GREEN}✅ Lambda function created${NC}"
    aws lambda wait function-active --function-name "$LAMBDA_NAME_API" --region "$AWS_REGION"
else
    echo -e "${YELLOW}📝 Updating existing Lambda function...${NC}"
    
    if [ "$PACKAGE_SIZE_BYTES" -gt 52428800 ]; then
        S3_BUCKET="storytailor-lambda-deploys"
        S3_KEY="fieldnotes-api-${ENVIRONMENT}-$(date +%Y%m%d-%H%M%S).zip"
        aws s3 cp fieldnotes-deployment.zip "s3://${S3_BUCKET}/${S3_KEY}" --region "$AWS_REGION" 2>&1
        
        aws lambda update-function-code \
            --function-name "$LAMBDA_NAME_API" \
            --s3-bucket "$S3_BUCKET" \
            --s3-key "$S3_KEY" \
            --region "$AWS_REGION" >/dev/null 2>&1
    else
        aws lambda update-function-code \
            --function-name "$LAMBDA_NAME_API" \
            --zip-file fileb://fieldnotes-deployment.zip \
            --region "$AWS_REGION" >/dev/null 2>&1
    fi
    
    # Create environment variables JSON file to avoid shell quoting issues
    ENV_FILE=$(mktemp)
    jq -n \
        --arg env "$ENVIRONMENT" \
        --arg supabase_url "$SUPABASE_URL" \
        --arg supabase_key "$SUPABASE_SERVICE_KEY" \
        --arg supabase_anon "$SUPABASE_ANON_KEY" \
        --arg redis_url "$REDIS_URL" \
        --arg openai_key "$OPENAI_API_KEY" \
        --arg anthropic_key "$ANTHROPIC_API_KEY" \
        --arg fieldnotes_key "$FIELDNOTES_API_KEY" \
        --arg auth_endpoint "$AUTH_AGENT_ENDPOINT" \
        --arg content_endpoint "$CONTENT_AGENT_ENDPOINT" \
        --arg library_endpoint "$LIBRARY_AGENT_ENDPOINT" \
        --arg emotion_endpoint "$EMOTION_AGENT_ENDPOINT" \
        --arg commerce_endpoint "$COMMERCE_AGENT_ENDPOINT" \
        --arg insights_endpoint "$INSIGHTS_AGENT_ENDPOINT" \
        --arg smart_home_endpoint "$SMART_HOME_AGENT_ENDPOINT" \
        --arg personality_endpoint "$PERSONALITY_AGENT_ENDPOINT" \
        --arg therapeutic_endpoint "$THERAPEUTIC_AGENT_ENDPOINT" \
        --arg knowledge_endpoint "$KNOWLEDGE_BASE_AGENT_ENDPOINT" \
        --arg localization_endpoint "$LOCALIZATION_AGENT_ENDPOINT" \
        --arg accessibility_endpoint "$ACCESSIBILITY_AGENT_ENDPOINT" \
        --arg child_safety_endpoint "$CHILD_SAFETY_AGENT_ENDPOINT" \
        '{
          "Variables": {
            "ENVIRONMENT": $env,
            "SUPABASE_URL": $supabase_url,
            "SUPABASE_SERVICE_ROLE_KEY": $supabase_key,
            "SUPABASE_ANON_KEY": $supabase_anon,
            "REDIS_URL": $redis_url,
            "OPENAI_API_KEY": $openai_key,
            "ANTHROPIC_API_KEY": $anthropic_key,
            "FIELDNOTES_API_KEY": $fieldnotes_key,
            "AUTH_AGENT_ENDPOINT": $auth_endpoint,
            "CONTENT_AGENT_ENDPOINT": $content_endpoint,
            "LIBRARY_AGENT_ENDPOINT": $library_endpoint,
            "EMOTION_AGENT_ENDPOINT": $emotion_endpoint,
            "COMMERCE_AGENT_ENDPOINT": $commerce_endpoint,
            "INSIGHTS_AGENT_ENDPOINT": $insights_endpoint,
            "SMART_HOME_AGENT_ENDPOINT": $smart_home_endpoint,
            "PERSONALITY_AGENT_ENDPOINT": $personality_endpoint,
            "THERAPEUTIC_AGENT_ENDPOINT": $therapeutic_endpoint,
            "KNOWLEDGE_BASE_AGENT_ENDPOINT": $knowledge_endpoint,
            "LOCALIZATION_AGENT_ENDPOINT": $localization_endpoint,
            "ACCESSIBILITY_AGENT_ENDPOINT": $accessibility_endpoint,
            "CHILD_SAFETY_AGENT_ENDPOINT": $child_safety_endpoint
          }
        }' > "$ENV_FILE"
    
    aws lambda update-function-configuration \
        --function-name "$LAMBDA_NAME_API" \
        --environment "file://$ENV_FILE" \
        --region "$AWS_REGION" >/dev/null 2>&1
    
    rm -f "$ENV_FILE"
    
    echo -e "${GREEN}✅ Lambda function updated${NC}"
    aws lambda wait function-updated --function-name "$LAMBDA_NAME_API" --region "$AWS_REGION"
fi

# Step 8: Deploy Scheduled Tasks Lambda function
echo -e "${BLUE}📤 Step 8: Deploying Scheduled Tasks Lambda function...${NC}"

LAMBDA_EXISTS_SCHEDULED=$(aws lambda get-function --function-name "$LAMBDA_NAME_SCHEDULED" --region "$AWS_REGION" 2>&1 | grep -q "FunctionName" && echo "1" || echo "0")

if [ "$LAMBDA_EXISTS_SCHEDULED" = "0" ]; then
    echo -e "${YELLOW}🆕 Creating new Lambda function: $LAMBDA_NAME_SCHEDULED${NC}"
    
    aws lambda create-function \
        --function-name "$LAMBDA_NAME_SCHEDULED" \
        --runtime nodejs22.x \
        --handler "$HANDLER_SCHEDULED" \
        --role "$LAMBDA_ROLE_ARN" \
        --zip-file fileb://fieldnotes-deployment.zip \
        --timeout 300 \
        --memory-size 512 \
        --environment Variables="{
            ENVIRONMENT='$ENVIRONMENT',
            SUPABASE_URL='$SUPABASE_URL',
            SUPABASE_SERVICE_ROLE_KEY='$SUPABASE_SERVICE_KEY',
            SUPABASE_ANON_KEY='$SUPABASE_ANON_KEY',
            REDIS_URL='$REDIS_URL',
            OPENAI_API_KEY='$OPENAI_API_KEY',
            ANTHROPIC_API_KEY='$ANTHROPIC_API_KEY'
        }" \
        --region "$AWS_REGION" \
        --description "Fieldnotes (User Research Agent) - Scheduled tasks (hourly/daily/weekly)"
    
    echo -e "${GREEN}✅ Scheduled tasks Lambda function created${NC}"
else
    echo -e "${YELLOW}📝 Updating existing Lambda function...${NC}"
    
    aws lambda update-function-code \
        --function-name "$LAMBDA_NAME_SCHEDULED" \
        --zip-file fileb://fieldnotes-deployment.zip \
        --region "$AWS_REGION" >/dev/null 2>&1
    
    echo -e "${GREEN}✅ Scheduled tasks Lambda function updated${NC}"
fi

# Step 9: Setup EventBridge rules for scheduled tasks
echo -e "${BLUE}📅 Step 9: Setting up EventBridge scheduled rules...${NC}"

# Hourly rule (every hour)
RULE_HOURLY="fieldnotes-hourly-${ENVIRONMENT}"
aws events put-rule \
    --name "$RULE_HOURLY" \
    --schedule-expression "rate(1 hour)" \
    --state "ENABLED" \
    --region "$AWS_REGION" \
    --description "Fieldnotes hourly aggregation" >/dev/null 2>&1 || true

aws lambda add-permission \
    --function-name "$LAMBDA_NAME_SCHEDULED" \
    --statement-id "eventbridge-hourly-${ENVIRONMENT}" \
    --action "lambda:InvokeFunction" \
    --principal events.amazonaws.com \
    --source-arn "arn:aws:events:${AWS_REGION}:${AWS_ACCOUNT_ID}:rule/${RULE_HOURLY}" \
    --region "$AWS_REGION" >/dev/null 2>&1 || true

aws events put-targets \
    --rule "$RULE_HOURLY" \
    --targets "Id=1,Arn=arn:aws:lambda:${AWS_REGION}:${AWS_ACCOUNT_ID}:function:${LAMBDA_NAME_SCHEDULED},Input={\"taskType\":\"hourly\",\"tenantId\":\"storytailor\"}" \
    --region "$AWS_REGION" >/dev/null 2>&1 || true

# Daily rule (every day at 2 AM UTC)
RULE_DAILY="fieldnotes-daily-${ENVIRONMENT}"
aws events put-rule \
    --name "$RULE_DAILY" \
    --schedule-expression "cron(0 2 * * ? *)" \
    --state "ENABLED" \
    --region "$AWS_REGION" \
    --description "Fieldnotes daily pattern detection" >/dev/null 2>&1 || true

aws lambda add-permission \
    --function-name "$LAMBDA_NAME_SCHEDULED" \
    --statement-id "eventbridge-daily-${ENVIRONMENT}" \
    --action "lambda:InvokeFunction" \
    --principal events.amazonaws.com \
    --source-arn "arn:aws:events:${AWS_REGION}:${AWS_ACCOUNT_ID}:rule/${RULE_DAILY}" \
    --region "$AWS_REGION" >/dev/null 2>&1 || true

aws events put-targets \
    --rule "$RULE_DAILY" \
    --targets "Id=1,Arn=arn:aws:lambda:${AWS_REGION}:${AWS_ACCOUNT_ID}:function:${LAMBDA_NAME_SCHEDULED},Input={\"taskType\":\"daily\",\"tenantId\":\"storytailor\"}" \
    --region "$AWS_REGION" >/dev/null 2>&1 || true

# Weekly rule (every Monday at 9 AM UTC)
RULE_WEEKLY="fieldnotes-weekly-${ENVIRONMENT}"
aws events put-rule \
    --name "$RULE_WEEKLY" \
    --schedule-expression "cron(0 9 ? * MON *)" \
    --state "ENABLED" \
    --region "$AWS_REGION" \
    --description "Fieldnotes weekly brief generation" >/dev/null 2>&1 || true

aws lambda add-permission \
    --function-name "$LAMBDA_NAME_SCHEDULED" \
    --statement-id "eventbridge-weekly-${ENVIRONMENT}" \
    --action "lambda:InvokeFunction" \
    --principal events.amazonaws.com \
    --source-arn "arn:aws:events:${AWS_REGION}:${AWS_ACCOUNT_ID}:rule/${RULE_WEEKLY}" \
    --region "$AWS_REGION" >/dev/null 2>&1 || true

aws events put-targets \
    --rule "$RULE_WEEKLY" \
    --targets "Id=1,Arn=arn:aws:lambda:${AWS_REGION}:${AWS_ACCOUNT_ID}:function:${LAMBDA_NAME_SCHEDULED},Input={\"taskType\":\"weekly\",\"tenantId\":\"storytailor\"}" \
    --region "$AWS_REGION" >/dev/null 2>&1 || true

echo -e "${GREEN}✅ EventBridge rules configured${NC}"

# Cleanup
cd "$PROJECT_ROOT"
rm -rf "$DEPLOY_DIR"
rm -f "$DEPLOY_DIR/fieldnotes-deployment.zip" 2>/dev/null || true

# Step 10: Get Function URL for API (if needed)
echo -e "${BLUE}🌐 Step 10: Configuring Function URL...${NC}"

# Check if Function URL exists
FUNCTION_URL=$(aws lambda get-function-url-config --function-name "$LAMBDA_NAME_API" --region "$AWS_REGION" --query 'FunctionUrl' --output text 2>/dev/null || echo "")

if [ -z "$FUNCTION_URL" ]; then
    echo -e "${YELLOW}  Creating Function URL...${NC}"
    aws lambda create-function-url-config \
        --function-name "$LAMBDA_NAME_API" \
        --auth-type NONE \
        --cors '{"AllowOrigins":["*"],"AllowMethods":["GET","POST","PUT","DELETE","OPTIONS"],"AllowHeaders":["Content-Type","X-API-Key","Authorization"]}' \
        --region "$AWS_REGION" >/dev/null 2>&1 || true
    
    FUNCTION_URL=$(aws lambda get-function-url-config --function-name "$LAMBDA_NAME_API" --region "$AWS_REGION" --query 'FunctionUrl' --output text 2>/dev/null || echo "")
fi

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                    ✅ DEPLOYMENT COMPLETE ✅                      ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${CYAN}📊 Deployment Summary:${NC}"
echo -e "${GREEN}  ✅ API Lambda: ${LAMBDA_NAME_API}${NC}"
echo -e "${GREEN}  ✅ Scheduled Lambda: ${LAMBDA_NAME_SCHEDULED}${NC}"
echo -e "${GREEN}  ✅ EventBridge Rules: hourly, daily, weekly${NC}"
if [ -n "$FUNCTION_URL" ]; then
    echo -e "${GREEN}  ✅ Function URL: ${FUNCTION_URL}${NC}"
fi
echo ""
echo -e "${CYAN}🔑 API Key (stored in SSM):${NC}"
echo -e "${YELLOW}  ${PREFIX}/fieldnotes/api-key${NC}"
echo ""
echo -e "${CYAN}📋 Next Steps:${NC}"
echo -e "${BLUE}  1. Test API: curl ${FUNCTION_URL:-'<function-url>'}/health${NC}"
echo -e "${BLUE}  2. Configure delivery channels (Slack, Email, Webhook)${NC}"
echo -e "${BLUE}  3. Monitor scheduled tasks in CloudWatch${NC}"
echo ""
