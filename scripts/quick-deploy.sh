#!/bin/bash

# Quick Infrastructure Deployment Script
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

ENVIRONMENT=${1:-staging}

echo -e "${BLUE}🚀 Quick Storytailor Infrastructure Deployment${NC}"
echo -e "${BLUE}Environment: ${ENVIRONMENT}${NC}"

# Check if we have AWS credentials
check_aws() {
    echo -e "${YELLOW}🔍 Checking AWS credentials...${NC}"
    
    if ! aws sts get-caller-identity &> /dev/null; then
        echo -e "${RED}❌ AWS credentials not configured${NC}"
        echo -e "${YELLOW}Please run: aws configure${NC}"
        echo -e "${YELLOW}Or set environment variables:${NC}"
        echo -e "${YELLOW}  export AWS_ACCESS_KEY_ID=your-key${NC}"
        echo -e "${YELLOW}  export AWS_SECRET_ACCESS_KEY=your-secret${NC}"
        echo -e "${YELLOW}  export AWS_DEFAULT_REGION=us-east-1${NC}"
        exit 1
    fi
    
    local account_id=$(aws sts get-caller-identity --query Account --output text)
    echo -e "${GREEN}✅ AWS credentials configured (Account: ${account_id})${NC}"
}

# Create minimal terraform variables
create_terraform_vars() {
    echo -e "${YELLOW}📝 Creating Terraform variables...${NC}"
    
    local vars_file="infrastructure/terraform/terraform.tfvars"
    
    cat > "$vars_file" << EOF
# Basic Configuration
environment = "${ENVIRONMENT}"
aws_region  = "us-east-1"

# Supabase Configuration (placeholder - update with real values)
supabase_url         = "https://placeholder.supabase.co"
supabase_anon_key    = "placeholder-anon-key"
supabase_service_key = "placeholder-service-key"

# API Keys (placeholder - will be stored in AWS SSM)
openai_api_key     = "placeholder-openai-key"
elevenlabs_api_key = "placeholder-elevenlabs-key"
stability_api_key  = "placeholder-stability-key"
stripe_secret_key  = "placeholder-stripe-key"
amazon_api_key     = "placeholder-amazon-key"
jwt_secret         = "$(openssl rand -base64 32)"
alexa_skill_id     = "placeholder-skill-id"

# Alert Configuration
alert_email_addresses = []
EOF
    
    echo -e "${GREEN}✅ Terraform variables created${NC}"
    echo -e "${YELLOW}⚠️  Update ${vars_file} with real API keys before production use${NC}"
}

# Initialize and plan Terraform
terraform_init_and_plan() {
    echo -e "${YELLOW}🏗️  Initializing Terraform...${NC}"
    
    cd infrastructure/terraform
    
    # Initialize Terraform
    terraform init
    
    # Validate configuration
    terraform validate
    
    # Create plan
    terraform plan -var-file="terraform.tfvars" -out="terraform.plan"
    
    echo -e "${GREEN}✅ Terraform plan created${NC}"
    cd - > /dev/null
}

# Deploy infrastructure
deploy_infrastructure() {
    echo -e "${YELLOW}🚀 Deploying infrastructure...${NC}"
    
    cd infrastructure/terraform
    
    # Apply the plan
    terraform apply terraform.plan
    
    # Save outputs
    terraform output -json > "outputs.json"
    
    echo -e "${GREEN}✅ Infrastructure deployed${NC}"
    cd - > /dev/null
}

# Show deployment summary
show_summary() {
    echo -e "${BLUE}📊 Deployment Summary${NC}"
    
    if [ -f "infrastructure/terraform/outputs.json" ]; then
        local api_url=$(cat infrastructure/terraform/outputs.json | jq -r '.api_gateway_url.value' 2>/dev/null || echo "N/A")
        local s3_bucket=$(cat infrastructure/terraform/outputs.json | jq -r '.s3_assets_bucket.value' 2>/dev/null || echo "N/A")
        local cloudfront_domain=$(cat infrastructure/terraform/outputs.json | jq -r '.cloudfront_domain.value' 2>/dev/null || echo "N/A")
        
        echo -e "${BLUE}API Gateway URL: ${api_url}${NC}"
        echo -e "${BLUE}S3 Assets Bucket: ${s3_bucket}${NC}"
        echo -e "${BLUE}CloudFront Domain: ${cloudfront_domain}${NC}"
    fi
    
    echo -e "${GREEN}🎉 Infrastructure deployment completed!${NC}"
    echo -e "${BLUE}Next steps:${NC}"
    echo -e "${BLUE}1. Update terraform.tfvars with real API keys${NC}"
    echo -e "${BLUE}2. Store secrets in AWS SSM${NC}"
    echo -e "${BLUE}3. Deploy Lambda functions${NC}"
    echo -e "${BLUE}4. Run validation tests${NC}"
}

# Main execution
main() {
    check_aws
    create_terraform_vars
    
    echo -e "${YELLOW}⚠️  About to deploy infrastructure to ${ENVIRONMENT}${NC}"
    echo -e "${YELLOW}This will create AWS resources that may incur costs.${NC}"
    read -p "Continue? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}Deployment cancelled${NC}"
        exit 0
    fi
    
    terraform_init_and_plan
    deploy_infrastructure
    show_summary
}

# Handle script arguments
case "${1}" in
    "staging"|"prod"|"dev")
        main
        ;;
    "destroy")
        echo -e "${RED}⚠️  Destroying infrastructure for ${ENVIRONMENT}${NC}"
        read -p "Are you sure? This cannot be undone! (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            cd infrastructure/terraform
            terraform destroy -var-file="terraform.tfvars"
            cd - > /dev/null
        fi
        ;;
    *)
        echo "Usage: $0 {staging|prod|dev|destroy}"
        echo "Examples:"
        echo "  $0 staging   # Deploy to staging"
        echo "  $0 destroy   # Destroy infrastructure"
        exit 1
        ;;
esac