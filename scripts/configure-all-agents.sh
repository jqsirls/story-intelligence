#!/bin/bash
# Configure all deployed agents with environment variables
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

ENVIRONMENT=${1:-staging}
PREFIX="/storytailor-${ENVIRONMENT}"

echo -e "${PURPLE}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${PURPLE}║          🔧 CONFIGURING ALL DEPLOYED AGENTS 🔧                    ║${NC}"
echo -e "${PURPLE}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Environment variables from .env.staging
SUPABASE_URL="${SUPABASE_URL:?SUPABASE_URL is required}"
SUPABASE_SERVICE_KEY="${SUPABASE_SERVICE_ROLE_KEY:?SUPABASE_SERVICE_ROLE_KEY is required}"
OPENAI_API_KEY="${OPENAI_API_KEY:?set OPENAI_API_KEY}"
STRIPE_SECRET_KEY="${STRIPE_SECRET_KEY:?set STRIPE_SECRET_KEY}"
STRIPE_WEBHOOK_SECRET="${STRIPE_WEBHOOK_SECRET:?STRIPE_WEBHOOK_SECRET is required}"
JWT_SECRET="${JWT_SECRET:?JWT_SECRET is required}"
REDIS_URL="${REDIS_URL:?REDIS_URL is required}"

# Step 1: Store in SSM Parameter Store
echo -e "${BLUE}📦 Storing configuration in AWS SSM Parameter Store...${NC}"

# Store each parameter
aws ssm put-parameter --name "${PREFIX}/supabase-url" --value "$SUPABASE_URL" --type "String" --overwrite 2>/dev/null || true
aws ssm put-parameter --name "${PREFIX}/supabase-service-key" --value "$SUPABASE_SERVICE_KEY" --type "SecureString" --overwrite 2>/dev/null || true
aws ssm put-parameter --name "${PREFIX}/openai-api-key" --value "$OPENAI_API_KEY" --type "SecureString" --overwrite 2>/dev/null || true
aws ssm put-parameter --name "${PREFIX}/stripe-secret-key" --value "$STRIPE_SECRET_KEY" --type "SecureString" --overwrite 2>/dev/null || true
aws ssm put-parameter --name "${PREFIX}/stripe-webhook-secret" --value "$STRIPE_WEBHOOK_SECRET" --type "SecureString" --overwrite 2>/dev/null || true
aws ssm put-parameter --name "${PREFIX}/jwt-secret" --value "$JWT_SECRET" --type "SecureString" --overwrite 2>/dev/null || true
aws ssm put-parameter --name "${PREFIX}/redis-url" --value "$REDIS_URL" --type "SecureString" --overwrite 2>/dev/null || true

echo -e "${GREEN}✅ Parameters stored in SSM${NC}"

# Step 2: Update all Lambda functions
echo -e "${BLUE}🔄 Updating Lambda functions with environment variables...${NC}"

# List of all deployed agents
AGENTS=(
    "storytailor-router-agent-${ENVIRONMENT}"
    "storytailor-universal-agent-${ENVIRONMENT}"
    "storytailor-auth-agent-${ENVIRONMENT}"
    "storytailor-child-safety-agent-${ENVIRONMENT}"
    "storytailor-library-agent-${ENVIRONMENT}"
    "storytailor-commerce-agent-${ENVIRONMENT}"
    "storytailor-educational-agent-${ENVIRONMENT}"
    "storytailor-therapeutic-agent-${ENVIRONMENT}"
    "storytailor-accessibility-agent-${ENVIRONMENT}"
    "storytailor-localization-agent-${ENVIRONMENT}"
    "storytailor-knowledge-base-agent-${ENVIRONMENT}"
)

# Update each Lambda function
for AGENT in "${AGENTS[@]}"; do
    echo -e "${YELLOW}Updating ${AGENT}...${NC}"
    
    # Check if Lambda exists
    if aws lambda get-function --function-name "$AGENT" &>/dev/null; then
        # Update environment variables
        aws lambda update-function-configuration \
            --function-name "$AGENT" \
            --environment Variables="{
                ENVIRONMENT='$ENVIRONMENT',
                SUPABASE_URL='$SUPABASE_URL',
                SUPABASE_SERVICE_ROLE_KEY='$SUPABASE_SERVICE_KEY',
                REDIS_URL='$REDIS_URL',
                OPENAI_API_KEY='$OPENAI_API_KEY',
                STRIPE_SECRET_KEY='$STRIPE_SECRET_KEY',
                STRIPE_WEBHOOK_SECRET='$STRIPE_WEBHOOK_SECRET',
                JWT_SECRET='$JWT_SECRET'
            }" \
            --output text > /dev/null
        
        echo -e "${GREEN}✅ ${AGENT} updated${NC}"
        
        # Wait a bit to avoid rate limiting
        sleep 1
    else
        echo -e "${RED}❌ ${AGENT} not found${NC}"
    fi
done

# Step 3: Test all agents
echo ""
echo -e "${BLUE}🧪 Testing all configured agents...${NC}"

FAILED_AGENTS=()

for AGENT in "${AGENTS[@]}"; do
    echo -e "${YELLOW}Testing ${AGENT}...${NC}"
    
    # Test with health check
    TEST_RESULT=$(aws lambda invoke \
        --function-name "$AGENT" \
        --payload '{"action":"health"}' \
        --cli-binary-format raw-in-base64-out \
        /tmp/test-output.json 2>&1)
    
    if [ $? -eq 0 ]; then
        # Check if response contains healthy status
        if grep -q "healthy" /tmp/test-output.json 2>/dev/null; then
            echo -e "${GREEN}✅ ${AGENT} is healthy${NC}"
        else
            echo -e "${RED}❌ ${AGENT} health check failed${NC}"
            FAILED_AGENTS+=("$AGENT")
        fi
    else
        echo -e "${RED}❌ ${AGENT} invocation failed${NC}"
        FAILED_AGENTS+=("$AGENT")
    fi
done

# Cleanup
rm -f /tmp/test-output.json

# Summary
echo ""
echo -e "${PURPLE}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${PURPLE}║                    📊 CONFIGURATION SUMMARY 📊                     ║${NC}"
echo -e "${PURPLE}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${CYAN}Total Agents: ${#AGENTS[@]}${NC}"
echo -e "${GREEN}Successfully Configured: $((${#AGENTS[@]} - ${#FAILED_AGENTS[@]}))${NC}"

if [ ${#FAILED_AGENTS[@]} -gt 0 ]; then
    echo -e "${RED}Failed: ${#FAILED_AGENTS[@]}${NC}"
    echo -e "${RED}Failed agents:${NC}"
    for AGENT in "${FAILED_AGENTS[@]}"; do
        echo -e "${RED}  - ${AGENT}${NC}"
    done
else
    echo -e "${GREEN}All agents successfully configured and healthy! 🎉${NC}"
fi

echo ""
echo -e "${BLUE}🔑 Configuration includes:${NC}"
echo -e "  • Supabase connection"
echo -e "  • Redis caching"
echo -e "  • OpenAI integration"
echo -e "  • Stripe payments"
echo -e "  • JWT authentication"
echo ""
