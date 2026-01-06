#!/bin/bash

# Storytailor Infrastructure Deployment Script
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${1:-staging}
AWS_REGION=${2:-us-east-1}
TERRAFORM_DIR="infrastructure/terraform"

echo -e "${BLUE}🚀 Starting Storytailor Infrastructure Deployment${NC}"
echo -e "${BLUE}Environment: ${ENVIRONMENT}${NC}"
echo -e "${BLUE}Region: ${AWS_REGION}${NC}"

# Check prerequisites
check_prerequisites() {
    echo -e "${YELLOW}📋 Checking prerequisites...${NC}"
    
    # Check if AWS CLI is installed and configured
    if ! command -v aws &> /dev/null; then
        echo -e "${RED}❌ AWS CLI is not installed${NC}"
        exit 1
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        echo -e "${RED}❌ AWS credentials not configured${NC}"
        exit 1
    fi
    
    # Check if Terraform is installed
    if ! command -v terraform &> /dev/null; then
        echo -e "${RED}❌ Terraform is not installed${NC}"
        exit 1
    fi
    
    # Check if Supabase CLI is installed
    if ! command -v supabase &> /dev/null; then
        echo -e "${YELLOW}⚠️  Supabase CLI not found. Installing...${NC}"
        npm install -g supabase
    fi
    
    echo -e "${GREEN}✅ Prerequisites check passed${NC}"
}

# Setup Terraform backend
setup_terraform_backend() {
    echo -e "${YELLOW}🏗️  Setting up Terraform backend...${NC}"
    
    local bucket_name="storytailor-terraform-state-$(date +%s)"
    local dynamodb_table="storytailor-terraform-locks"
    
    # Create S3 bucket for Terraform state
    aws s3 mb "s3://${bucket_name}" --region "${AWS_REGION}" || true
    
    # Enable versioning
    aws s3api put-bucket-versioning \
        --bucket "${bucket_name}" \
        --versioning-configuration Status=Enabled
    
    # Enable encryption
    aws s3api put-bucket-encryption \
        --bucket "${bucket_name}" \
        --server-side-encryption-configuration '{
            "Rules": [{
                "ApplyServerSideEncryptionByDefault": {
                    "SSEAlgorithm": "AES256"
                }
            }]
        }'
    
    # Create DynamoDB table for state locking
    aws dynamodb create-table \
        --table-name "${dynamodb_table}" \
        --attribute-definitions AttributeName=LockID,AttributeType=S \
        --key-schema AttributeName=LockID,KeyType=HASH \
        --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
        --region "${AWS_REGION}" || true
    
    # Update backend configuration
    cat > "${TERRAFORM_DIR}/backend.tf" << EOF
terraform {
  backend "s3" {
    bucket         = "${bucket_name}"
    key            = "storytailor-${ENVIRONMENT}/terraform.tfstate"
    region         = "${AWS_REGION}"
    dynamodb_table = "${dynamodb_table}"
    encrypt        = true
  }
}
EOF
    
    echo -e "${GREEN}✅ Terraform backend configured${NC}"
}

# Generate secrets
generate_secrets() {
    echo -e "${YELLOW}🔐 Generating secrets...${NC}"
    
    # Generate JWT secret if not provided
    if [ -z "${JWT_SECRET}" ]; then
        export JWT_SECRET=$(openssl rand -base64 32)
        echo -e "${GREEN}Generated JWT secret${NC}"
    fi
    
    echo -e "${GREEN}✅ Secrets generated${NC}"
}

# Validate Terraform configuration
validate_terraform() {
    echo -e "${YELLOW}🔍 Validating Terraform configuration...${NC}"
    
    cd "${TERRAFORM_DIR}"
    
    # Initialize Terraform
    terraform init
    
    # Validate configuration
    terraform validate
    
    # Format configuration
    terraform fmt -recursive
    
    echo -e "${GREEN}✅ Terraform configuration validated${NC}"
    cd - > /dev/null
}

# Plan infrastructure changes
plan_infrastructure() {
    echo -e "${YELLOW}📋 Planning infrastructure changes...${NC}"
    
    cd "${TERRAFORM_DIR}"
    
    # Create plan
    terraform plan \
        -var-file="${ENVIRONMENT}.tfvars" \
        -out="terraform-${ENVIRONMENT}.plan"
    
    echo -e "${GREEN}✅ Infrastructure plan created${NC}"
    cd - > /dev/null
}

# Deploy infrastructure
deploy_infrastructure() {
    echo -e "${YELLOW}🚀 Deploying infrastructure...${NC}"
    
    cd "${TERRAFORM_DIR}"
    
    # Apply the plan
    terraform apply "terraform-${ENVIRONMENT}.plan"
    
    # Save outputs
    terraform output -json > "outputs-${ENVIRONMENT}.json"
    
    echo -e "${GREEN}✅ Infrastructure deployed successfully${NC}"
    cd - > /dev/null
}

# Setup Supabase
setup_supabase() {
    echo -e "${YELLOW}🗄️  Setting up Supabase...${NC}"
    
    # Check if supabase is initialized
    if [ ! -f "supabase/config.toml" ]; then
        echo -e "${YELLOW}Initializing Supabase project...${NC}"
        supabase init
    fi
    
    # Start local Supabase (for development)
    if [ "${ENVIRONMENT}" = "dev" ]; then
        supabase start
    fi
    
    # Run migrations
    if [ -n "${SUPABASE_URL}" ] && [ -n "${SUPABASE_SERVICE_KEY}" ]; then
        echo -e "${YELLOW}Running database migrations...${NC}"
        supabase db push --db-url "${SUPABASE_URL}" --password "${SUPABASE_SERVICE_KEY}"
    else
        echo -e "${YELLOW}⚠️  Supabase credentials not provided, skipping migrations${NC}"
    fi
    
    echo -e "${GREEN}✅ Supabase setup completed${NC}"
}

# Store secrets in AWS SSM
store_secrets() {
    echo -e "${YELLOW}🔐 Storing secrets in AWS SSM...${NC}"
    
    local prefix="/storytailor/${ENVIRONMENT}"
    
    # Store secrets if provided
    [ -n "${OPENAI_API_KEY}" ] && aws ssm put-parameter \
        --name "${prefix}/openai/api-key" \
        --value "${OPENAI_API_KEY}" \
        --type "SecureString" \
        --overwrite || true
    
    [ -n "${ELEVENLABS_API_KEY}" ] && aws ssm put-parameter \
        --name "${prefix}/elevenlabs/api-key" \
        --value "${ELEVENLABS_API_KEY}" \
        --type "SecureString" \
        --overwrite || true
    
    [ -n "${STRIPE_SECRET_KEY}" ] && aws ssm put-parameter \
        --name "${prefix}/stripe/secret-key" \
        --value "${STRIPE_SECRET_KEY}" \
        --type "SecureString" \
        --overwrite || true
    
    [ -n "${JWT_SECRET}" ] && aws ssm put-parameter \
        --name "${prefix}/jwt/secret" \
        --value "${JWT_SECRET}" \
        --type "SecureString" \
        --overwrite || true
    
    echo -e "${GREEN}✅ Secrets stored in AWS SSM${NC}"
}

# Validate deployment
validate_deployment() {
    echo -e "${YELLOW}🔍 Validating deployment...${NC}"
    
    cd "${TERRAFORM_DIR}"
    
    # Get outputs
    local api_url=$(terraform output -raw api_gateway_url 2>/dev/null || echo "")
    local redis_endpoint=$(terraform output -raw redis_endpoint 2>/dev/null || echo "")
    local s3_bucket=$(terraform output -raw s3_assets_bucket 2>/dev/null || echo "")
    
    echo -e "${BLUE}📊 Deployment Summary:${NC}"
    echo -e "${BLUE}API Gateway URL: ${api_url}${NC}"
    echo -e "${BLUE}Redis Endpoint: ${redis_endpoint}${NC}"
    echo -e "${BLUE}S3 Assets Bucket: ${s3_bucket}${NC}"
    
    # Test API Gateway health
    if [ -n "${api_url}" ]; then
        echo -e "${YELLOW}Testing API Gateway...${NC}"
        if curl -f "${api_url}/health" > /dev/null 2>&1; then
            echo -e "${GREEN}✅ API Gateway is responding${NC}"
        else
            echo -e "${YELLOW}⚠️  API Gateway not responding (expected until Lambda functions are deployed)${NC}"
        fi
    fi
    
    cd - > /dev/null
    echo -e "${GREEN}✅ Deployment validation completed${NC}"
}

# Main execution
main() {
    echo -e "${BLUE}Starting deployment process...${NC}"
    
    check_prerequisites
    setup_terraform_backend
    generate_secrets
    validate_terraform
    plan_infrastructure
    
    # Ask for confirmation before deploying
    echo -e "${YELLOW}⚠️  About to deploy infrastructure to ${ENVIRONMENT}${NC}"
    read -p "Continue? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}Deployment cancelled${NC}"
        exit 0
    fi
    
    deploy_infrastructure
    setup_supabase
    store_secrets
    validate_deployment
    
    echo -e "${GREEN}🎉 Infrastructure deployment completed successfully!${NC}"
    echo -e "${BLUE}Next steps:${NC}"
    echo -e "${BLUE}1. Deploy Lambda functions using CI/CD pipeline${NC}"
    echo -e "${BLUE}2. Configure external API keys in AWS SSM${NC}"
    echo -e "${BLUE}3. Run integration tests${NC}"
}

# Handle script arguments
case "${1}" in
    "staging"|"prod"|"dev")
        main
        ;;
    "destroy")
        echo -e "${RED}⚠️  Destroying infrastructure for ${2:-staging}${NC}"
        read -p "Are you sure? This cannot be undone! (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            cd "${TERRAFORM_DIR}"
            terraform destroy -var-file="${2:-staging}.tfvars"
            cd - > /dev/null
        fi
        ;;
    "plan")
        check_prerequisites
        validate_terraform
        plan_infrastructure
        ;;
    *)
        echo "Usage: $0 {staging|prod|dev|destroy|plan} [environment]"
        echo "Examples:"
        echo "  $0 staging          # Deploy to staging"
        echo "  $0 prod             # Deploy to production"
        echo "  $0 destroy staging  # Destroy staging environment"
        echo "  $0 plan             # Plan changes only"
        exit 1
        ;;
esac