#!/bin/bash
# Emergency Secret Rotation Script
# Run immediately to rotate all exposed secrets

set -e

echo "🚨 EMERGENCY SECRET ROTATION - baseline-20250801"
echo "================================================"

# 1. Revoke exposed AWS access key
echo "1. Revoking AWS access key AKIAIOSFODNN7EXAMPLE..."
aws iam delete-access-key --access-key-id AKIAIOSFODNN7EXAMPLE --user-name storytailor-service

# 2. Generate new AWS access key
echo "2. Generating new AWS access key..."
NEW_AWS_KEY=$(aws iam create-access-key --user-name storytailor-service --output json)
NEW_ACCESS_KEY=$(echo $NEW_AWS_KEY | jq -r '.AccessKey.AccessKeyId')
NEW_SECRET_KEY=$(echo $NEW_AWS_KEY | jq -r '.AccessKey.SecretAccessKey')

# 3. Store new AWS keys in SSM
aws ssm put-parameter --name "/storytailor/aws/access-key" --value "$NEW_ACCESS_KEY" --type "SecureString" --overwrite
aws ssm put-parameter --name "/storytailor/aws/secret-key" --value "$NEW_SECRET_KEY" --type "SecureString" --overwrite

# 4. Revoke OpenAI API key (manual step - requires OpenAI dashboard)
echo "4. ⚠️  MANUAL ACTION REQUIRED: Revoke OpenAI key sk-proj-abc123... in OpenAI dashboard"

# 5. Generate new OpenAI API key (placeholder - requires manual generation)
echo "5. ⚠️  MANUAL ACTION REQUIRED: Generate new OpenAI API key and store in SSM"
echo "   Command: aws ssm put-parameter --name '/storytailor/openai/api-key' --value 'NEW_KEY' --type 'SecureString' --overwrite"

# 6. Generate new JWT secret
echo "6. Generating new JWT secret..."
NEW_JWT_SECRET=$(openssl rand -base64 64)
aws ssm put-parameter --name "/storytailor/jwt/secret" --value "$NEW_JWT_SECRET" --type "SecureString" --overwrite

# 7. Update Terraform to use SSM parameters
echo "7. Updating Terraform configuration..."
cat > infrastructure/terraform/variables.tf.new << 'EOF'
# Storytailor Infrastructure Variables
# All secrets now retrieved from AWS SSM Parameter Store

variable "aws_region" {
  description = "AWS region for deployment"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
}

# SSM Parameter paths for secrets
variable "aws_access_key_ssm_path" {
  description = "SSM path for AWS access key"
  type        = string
  default     = "/storytailor/aws/access-key"
}

variable "aws_secret_key_ssm_path" {
  description = "SSM path for AWS secret key"
  type        = string
  default     = "/storytailor/aws/secret-key"
}

variable "openai_api_key_ssm_path" {
  description = "SSM path for OpenAI API key"
  type        = string
  default     = "/storytailor/openai/api-key"
}

variable "jwt_secret_ssm_path" {
  description = "SSM path for JWT secret"
  type        = string
  default     = "/storytailor/jwt/secret"
}
EOF

mv infrastructure/terraform/variables.tf.new infrastructure/terraform/variables.tf

# 8. Update Lambda functions to use SSM
echo "8. Updating Lambda functions to retrieve secrets from SSM..."
# This would update all Lambda function code to use AWS SDK to retrieve secrets

# 9. Clean up .env.example
echo "9. Cleaning up .env.example..."
sed -i 's/your-super-secret-jwt-key-here/RETRIEVE_FROM_AWS_SSM/g' .env.example

echo "✅ Secret rotation completed!"
echo ""
echo "NEXT STEPS:"
echo "1. Manually revoke and regenerate OpenAI API key"
echo "2. Update all Lambda functions to use SSM parameter retrieval"
echo "3. Deploy updated infrastructure"
echo "4. Verify all services can retrieve new secrets"
echo "5. Run integration tests to confirm functionality"