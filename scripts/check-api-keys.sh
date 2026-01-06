#!/bin/bash
# Check API Keys Status in AWS SSM Parameter Store
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

ENVIRONMENT=${1:-staging}
PREFIX="/storytailor-${ENVIRONMENT}"

echo -e "${BLUE}🔍 Checking API Keys Status in AWS SSM${NC}"
echo -e "${BLUE}Environment: ${ENVIRONMENT}${NC}"

# Check if parameter contains placeholder value
check_parameter() {
    local param_name="$1"
    local param_type="$2"
    local description="$3"
    
    if aws ssm get-parameter --name "$param_name" &> /dev/null; then
        if [ "$param_type" = "String" ]; then
            local value=$(aws ssm get-parameter --name "$param_name" --query 'Parameter.Value' --output text)
            if [[ "$value" == *"placeholder"* ]] || [[ "$value" == *"your-"* ]]; then
                echo -e "${YELLOW}⚠️  ${param_name}: NEEDS UPDATE (contains placeholder)${NC}"
                return 1
            else
                echo -e "${GREEN}✅ ${param_name}: OK${NC}"
                return 0
            fi
        else
            # For SecureString, we can't check the value, so we assume it needs checking
            echo -e "${BLUE}🔐 ${param_name}: SecureString (manual verification needed)${NC}"
            return 0
        fi
    else
        echo -e "${RED}❌ ${param_name}: NOT FOUND${NC}"
        return 1
    fi
}

echo -e "${YELLOW}📋 Parameter Status Check:${NC}"
echo ""

# Track status
needs_update=0

# Check each parameter
echo -e "${BLUE}=== SUPABASE CONFIGURATION ===${NC}"
check_parameter "${PREFIX}/supabase/url" "String" "Supabase URL" || needs_update=1
check_parameter "${PREFIX}/supabase/anon_key" "SecureString" "Supabase anon key" || needs_update=1
check_parameter "${PREFIX}/supabase/service_key" "SecureString" "Supabase service key" || needs_update=1

echo ""
echo -e "${BLUE}=== AI SERVICE API KEYS ===${NC}"
check_parameter "${PREFIX}/openai/api_key" "SecureString" "OpenAI API key" || needs_update=1
check_parameter "${PREFIX}/elevenlabs/api_key" "SecureString" "ElevenLabs API key" || needs_update=1

echo ""
echo -e "${BLUE}=== PAYMENT PROCESSING ===${NC}"
check_parameter "${PREFIX}/stripe/secret_key" "SecureString" "Stripe secret key" || needs_update=1

echo ""
echo -e "${BLUE}=== SECURITY ===${NC}"
check_parameter "${PREFIX}/jwt/secret" "SecureString" "JWT secret" || needs_update=1

echo ""
if [ $needs_update -eq 1 ]; then
    echo -e "${YELLOW}⚠️  Some parameters need to be updated with real API keys.${NC}"
    echo -e "${BLUE}Run: ./scripts/update-api-keys.sh ${ENVIRONMENT}${NC}"
else
    echo -e "${GREEN}✅ All parameters appear to be configured!${NC}"
fi

echo ""
echo -e "${BLUE}📊 All parameters for ${ENVIRONMENT}:${NC}"
aws ssm describe-parameters --filters "Key=Name,Values=${PREFIX}/" --query 'Parameters[].[Name,Type,LastModifiedDate]' --output table