#!/bin/bash
# Update API Keys in AWS SSM Parameter Store
# This script helps you securely update API keys in AWS SSM
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

ENVIRONMENT=${1:-staging}
PREFIX="/storytailor-${ENVIRONMENT}"

echo -e "${BLUE}🔐 Updating API Keys in AWS SSM Parameter Store${NC}"
echo -e "${BLUE}Environment: ${ENVIRONMENT}${NC}"
echo -e "${BLUE}Parameter Prefix: ${PREFIX}${NC}"

# Check AWS credentials
check_aws_credentials() {
    echo -e "${YELLOW}🔍 Checking AWS credentials...${NC}"
    if ! aws sts get-caller-identity &> /dev/null; then
        echo -e "${RED}❌ AWS credentials not configured${NC}"
        echo -e "${YELLOW}Please run: aws configure${NC}"
        exit 1
    fi
    local account_id=$(aws sts get-caller-identity --query Account --output text)
    echo -e "${GREEN}✅ AWS credentials configured (Account: ${account_id})${NC}"
}

# Function to update a parameter
update_parameter() {
    local param_name="$1"
    local param_type="$2"
    local description="$3"
    local current_value
    
    echo -e "${BLUE}📝 Updating: ${param_name}${NC}"
    echo -e "${YELLOW}Description: ${description}${NC}"
    
    # Get current value (for non-secure parameters only)
    if [ "$param_type" = "String" ]; then
        current_value=$(aws ssm get-parameter --name "$param_name" --query 'Parameter.Value' --output text 2>/dev/null || echo "Not found")
        echo -e "${YELLOW}Current value: ${current_value}${NC}"
    else
        echo -e "${YELLOW}Current value: [HIDDEN - SecureString]${NC}"
    fi
    
    echo -e "${YELLOW}Enter new value (or press Enter to skip):${NC}"
    read -r new_value
    
    if [ -n "$new_value" ]; then
        aws ssm put-parameter \
            --name "$param_name" \
            --value "$new_value" \
            --type "$param_type" \
            --overwrite \
            --description "$description"
        echo -e "${GREEN}✅ Updated: ${param_name}${NC}"
    else
        echo -e "${YELLOW}⏭️  Skipped: ${param_name}${NC}"
    fi
    echo ""
}

# Function to update secure parameter with hidden input
update_secure_parameter() {
    local param_name="$1"
    local description="$2"
    
    echo -e "${BLUE}🔐 Updating Secure Parameter: ${param_name}${NC}"
    echo -e "${YELLOW}Description: ${description}${NC}"
    echo -e "${YELLOW}Enter new value (input will be hidden, or press Enter to skip):${NC}"
    read -s new_value
    echo ""
    
    if [ -n "$new_value" ]; then
        aws ssm put-parameter \
            --name "$param_name" \
            --value "$new_value" \
            --type "SecureString" \
            --overwrite \
            --description "$description"
        echo -e "${GREEN}✅ Updated: ${param_name}${NC}"
    else
        echo -e "${YELLOW}⏭️  Skipped: ${param_name}${NC}"
    fi
    echo ""
}

# Main update process
main() {
    check_aws_credentials
    
    echo -e "${YELLOW}🚀 Starting API key update process...${NC}"
    echo -e "${YELLOW}You can skip any parameter by pressing Enter without typing a value.${NC}"
    echo ""
    
    # Supabase Configuration
    echo -e "${BLUE}=== SUPABASE CONFIGURATION ===${NC}"
    update_parameter "${PREFIX}/supabase/url" "String" "Supabase project URL"
    update_secure_parameter "${PREFIX}/supabase/anon_key" "Supabase anonymous key for client-side access"
    update_secure_parameter "${PREFIX}/supabase/service_key" "Supabase service role key for server-side access"
    
    # AI Service API Keys
    echo -e "${BLUE}=== AI SERVICE API KEYS ===${NC}"
    update_secure_parameter "${PREFIX}/openai/api_key" "OpenAI API key for story generation"
    update_secure_parameter "${PREFIX}/elevenlabs/api_key" "ElevenLabs API key for voice synthesis"
    
    # Payment Processing
    echo -e "${BLUE}=== PAYMENT PROCESSING ===${NC}"
    update_secure_parameter "${PREFIX}/stripe/secret_key" "Stripe secret key for payment processing"
    
    # Security
    echo -e "${BLUE}=== SECURITY CONFIGURATION ===${NC}"
    update_secure_parameter "${PREFIX}/jwt/secret" "JWT signing secret for authentication"
    
    echo -e "${GREEN}🎉 API key update process completed!${NC}"
    
    # Verify parameters
    echo -e "${BLUE}📋 Verifying updated parameters...${NC}"
    aws ssm describe-parameters --filters "Key=Name,Values=${PREFIX}/" --query 'Parameters[].Name' --output table
}

# Show help
show_help() {
    echo "Usage: $0 [environment]"
    echo ""
    echo "Update API keys in AWS SSM Parameter Store"
    echo ""
    echo "Arguments:"
    echo "  environment    Environment name (staging, prod) [default: staging]"
    echo ""
    echo "Examples:"
    echo "  $0 staging     # Update staging environment"
    echo "  $0 prod        # Update production environment"
    echo ""
    echo "Required API Keys:"
    echo "  - Supabase URL and keys (from https://app.supabase.com)"
    echo "  - OpenAI API key (from https://platform.openai.com/api-keys)"
    echo "  - ElevenLabs API key (from https://elevenlabs.io/app/settings/api-keys)"
    echo "  - Stripe secret key (from https://dashboard.stripe.com/apikeys)"
}

# Handle script arguments
case "${1}" in
    "help"|"-h"|"--help")
        show_help
        ;;
    "list")
        echo -e "${BLUE}📋 Current SSM parameters for ${2:-staging}:${NC}"
        aws ssm describe-parameters --filters "Key=Name,Values=/storytailor-${2:-staging}/" --query 'Parameters[].[Name,Type,Description]' --output table
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