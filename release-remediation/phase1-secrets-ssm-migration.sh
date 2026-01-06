#!/bin/bash
# Phase 1: Secrets and Dependencies - SSM Migration
# Move all secrets to AWS SSM with stage-scoped namespaces

set -e

echo "🔐 PHASE 1.1: AWS SSM SECRETS MIGRATION"
echo "======================================="

# Define stage-scoped namespaces
STAGES=("dev" "staging" "prod")
SECRETS=(
    "openai/api-key"
    "elevenlabs/api-key" 
    "jwt/signing-key"
    "jwt/refresh-key"
    "database/password"
    "redis/password"
    "stripe/secret-key"
    "stripe/webhook-secret"
    "philips-hue/client-id"
    "philips-hue/client-secret"
    "webhook/github-secret"
    "webhook/slack-secret"
)

# Generate new secrets for each stage
echo "Generating new secrets for all stages..."
for stage in "${STAGES[@]}"; do
    echo "  Processing stage: $stage"
    
    for secret in "${SECRETS[@]}"; do
        secret_path="/storytailor/$stage/$secret"
        
        case $secret in
            "openai/api-key")
                # Generate placeholder - requires manual OpenAI key generation
                secret_value="MANUAL_GENERATION_REQUIRED_${stage^^}"
                ;;
            "elevenlabs/api-key")
                # Generate placeholder - requires manual ElevenLabs key generation
                secret_value="MANUAL_GENERATION_REQUIRED_${stage^^}"
                ;;
            "jwt/signing-key")
                secret_value=$(openssl rand -base64 64)
                ;;
            "jwt/refresh-key")
                secret_value=$(openssl rand -base64 64)
                ;;
            "database/password")
                secret_value=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
                ;;
            "redis/password")
                secret_value=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
                ;;
            "stripe/secret-key")
                secret_value="sk_test_$(openssl rand -hex 32)_${stage}"
                ;;
            "stripe/webhook-secret")
                secret_value="whsec_$(openssl rand -base64 32 | tr -d "=+/")"
                ;;
            "philips-hue/client-id")
                secret_value="storytailor-${stage}-$(openssl rand -hex 16)"
                ;;
            "philips-hue/client-secret")
                secret_value=$(openssl rand -base64 48 | tr -d "=+/")
                ;;
            "webhook/github-secret")
                secret_value=$(openssl rand -hex 32)
                ;;
            "webhook/slack-secret")
                secret_value=$(openssl rand -hex 32)
                ;;
        esac
        
        echo "    Storing: $secret_path"
        aws ssm put-parameter \
            --name "$secret_path" \
            --value "$secret_value" \
            --type "SecureString" \
            --description "Storytailor $stage environment - $secret" \
            --overwrite \
            --tags "Key=Environment,Value=$stage" "Key=Service,Value=storytailor" "Key=Rotation,Value=90days"
    done
done

# Create SSM access utility
echo "Creating SSM access utility..."
cat > packages/shared-utils/src/secrets/SSMSecretManager.ts << 'EOF'
import { SSMClient, GetParameterCommand, GetParametersCommand } from '@aws-sdk/client-ssm';

export interface SecretConfig {
  region?: string;
  stage?: string;
}

export class SSMSecretManager {
  private client: SSMClient;
  private stage: string;
  private cache: Map<string, { value: string; expiry: number }> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(config: SecretConfig = {}) {
    this.client = new SSMClient({ 
      region: config.region || process.env.AWS_REGION || 'us-east-1' 
    });
    this.stage = config.stage || process.env.STAGE || 'dev';
  }

  async getSecret(secretName: string): Promise<string> {
    const parameterName = `/storytailor/${this.stage}/${secretName}`;
    
    // Check cache first
    const cached = this.cache.get(parameterName);
    if (cached && Date.now() < cached.expiry) {
      return cached.value;
    }

    try {
      const command = new GetParameterCommand({
        Name: parameterName,
        WithDecryption: true
      });
      
      const response = await this.client.send(command);
      
      if (!response.Parameter?.Value) {
        throw new Error(`Secret not found: ${parameterName}`);
      }

      // Cache the result
      this.cache.set(parameterName, {
        value: response.Parameter.Value,
        expiry: Date.now() + this.CACHE_TTL
      });

      return response.Parameter.Value;
    } catch (error) {
      console.error(`Failed to retrieve secret ${parameterName}:`, error);
      throw new Error(`Secret retrieval failed: ${secretName}`);
    }
  }

  async getSecrets(secretNames: string[]): Promise<Record<string, string>> {
    const parameterNames = secretNames.map(name => `/storytailor/${this.stage}/${name}`);
    
    try {
      const command = new GetParametersCommand({
        Names: parameterNames,
        WithDecryption: true
      });
      
      const response = await this.client.send(command);
      const result: Record<string, string> = {};
      
      response.Parameters?.forEach(param => {
        if (param.Name && param.Value) {
          const secretName = param.Name.replace(`/storytailor/${this.stage}/`, '');
          result[secretName] = param.Value;
          
          // Cache the result
          this.cache.set(param.Name, {
            value: param.Value,
            expiry: Date.now() + this.CACHE_TTL
          });
        }
      });
      
      // Check for missing parameters
      const invalidParameters = response.InvalidParameters || [];
      if (invalidParameters.length > 0) {
        console.warn('Invalid parameters:', invalidParameters);
      }
      
      return result;
    } catch (error) {
      console.error('Failed to retrieve secrets:', error);
      throw new Error('Bulk secret retrieval failed');
    }
  }

  async refreshCache(): Promise<void> {
    this.cache.clear();
  }

  // Graceful fallback for missing secrets
  async getSecretWithFallback(secretName: string, fallback?: string): Promise<string> {
    try {
      return await this.getSecret(secretName);
    } catch (error) {
      if (fallback !== undefined) {
        console.warn(`Using fallback for secret ${secretName}:`, error);
        return fallback;
      }
      throw error;
    }
  }
}

// Singleton instance
export const secretManager = new SSMSecretManager();
EOF

# Update all Lambda functions to use SSM
echo "Updating Lambda functions to use SSM..."
find packages -name "*.ts" -not -path "*/node_modules/*" | while read file; do
    if grep -q "process\.env\." "$file"; then
        echo "  Updating: $file"
        
        # Replace common environment variable patterns
        sed -i 's/process\.env\.OPENAI_API_KEY/await secretManager.getSecret("openai\/api-key")/g' "$file"
        sed -i 's/process\.env\.ELEVENLABS_API_KEY/await secretManager.getSecret("elevenlabs\/api-key")/g' "$file"
        sed -i 's/process\.env\.JWT_SECRET/await secretManager.getSecret("jwt\/signing-key")/g' "$file"
        sed -i 's/process\.env\.DATABASE_PASSWORD/await secretManager.getSecret("database\/password")/g' "$file"
        sed -i 's/process\.env\.REDIS_PASSWORD/await secretManager.getSecret("redis\/password")/g' "$file"
        
        # Add import if secret manager is used
        if grep -q "secretManager\.getSecret" "$file" && ! grep -q "import.*secretManager" "$file"; then
            sed -i '1i import { secretManager } from "@storytailor/shared-utils/secrets/SSMSecretManager";' "$file"
        fi
    fi
done

# Update Terraform to use SSM parameters
echo "Updating Terraform configuration..."
cat > infrastructure/terraform/ssm-parameters.tf << 'EOF'
# SSM Parameters for Storytailor secrets
# All secrets are now managed through AWS SSM Parameter Store

# Data sources for existing SSM parameters
data "aws_ssm_parameter" "openai_api_key" {
  name = "/storytailor/${var.environment}/openai/api-key"
}

data "aws_ssm_parameter" "elevenlabs_api_key" {
  name = "/storytailor/${var.environment}/elevenlabs/api-key"
}

data "aws_ssm_parameter" "jwt_signing_key" {
  name = "/storytailor/${var.environment}/jwt/signing-key"
}

data "aws_ssm_parameter" "database_password" {
  name = "/storytailor/${var.environment}/database/password"
}

data "aws_ssm_parameter" "redis_password" {
  name = "/storytailor/${var.environment}/redis/password"
}

# Lambda environment variables now reference SSM parameters
locals {
  lambda_environment_variables = {
    STAGE = var.environment
    AWS_REGION = var.aws_region
    # Remove all hardcoded secrets - they're now retrieved via SSM
  }
}

# IAM policy for Lambda functions to access SSM parameters
resource "aws_iam_policy" "lambda_ssm_access" {
  name        = "storytailor-lambda-ssm-access-${var.environment}"
  description = "Allow Lambda functions to access SSM parameters"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ssm:GetParameter",
          "ssm:GetParameters",
          "ssm:GetParametersByPath"
        ]
        Resource = [
          "arn:aws:ssm:${var.aws_region}:${data.aws_caller_identity.current.account_id}:parameter/storytailor/${var.environment}/*"
        ]
      }
    ]
  })
}

# Attach SSM policy to Lambda execution role
resource "aws_iam_role_policy_attachment" "lambda_ssm_access" {
  role       = aws_iam_role.lambda_execution_role.name
  policy_arn = aws_iam_policy.lambda_ssm_access.arn
}
EOF

# Clean up hardcoded secrets from repository
echo "Cleaning up hardcoded secrets from repository..."
find . -name "*.ts" -o -name "*.js" -o -name "*.tf" -o -name "*.yml" -o -name "*.yaml" | while read file; do
    # Skip node_modules and .git directories
    if [[ "$file" == *"node_modules"* ]] || [[ "$file" == *".git"* ]]; then
        continue
    fi
    
    # Remove hardcoded API keys (replace with placeholders)
    sed -i 's/sk-[a-zA-Z0-9]\{48\}/RETRIEVED_FROM_SSM/g' "$file"
    sed -i 's/AKIA[0-9A-Z]\{16\}/RETRIEVED_FROM_SSM/g' "$file"
    sed -i 's/your-super-secret-jwt-key-here/RETRIEVED_FROM_SSM/g' "$file"
done

# Update .env.example files
echo "Updating .env.example files..."
cat > .env.example << 'EOF'
# Storytailor Environment Configuration
# All secrets are now retrieved from AWS SSM Parameter Store

# Environment
STAGE=dev
AWS_REGION=us-east-1

# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=storytailor_dev

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# External Services (keys retrieved from SSM)
# /storytailor/{stage}/openai/api-key
# /storytailor/{stage}/elevenlabs/api-key
# /storytailor/{stage}/stripe/secret-key
# /storytailor/{stage}/philips-hue/client-id
# /storytailor/{stage}/philips-hue/client-secret

# Application
LOG_LEVEL=info
NODE_ENV=development

# Note: All sensitive values are now retrieved from AWS SSM Parameter Store
# Use the SSMSecretManager utility to access secrets in your code
EOF

# Create manual action checklist
echo "Creating manual action checklist..."
cat > release-remediation/MANUAL_ACTIONS_REQUIRED.md << 'EOF'
# Manual Actions Required for SSM Migration

## Critical: API Key Generation Required

### 1. OpenAI API Keys
**Action Required:** Generate new OpenAI API keys for each environment

**Steps:**
1. Log into OpenAI Platform (platform.openai.com)
2. Navigate to API Keys section
3. Generate new keys for each environment:
   - Development: `storytailor-dev-$(date +%Y%m%d)`
   - Staging: `storytailor-staging-$(date +%Y%m%d)`
   - Production: `storytailor-prod-$(date +%Y%m%d)`

**Update SSM Parameters:**
```bash
aws ssm put-parameter --name "/storytailor/dev/openai/api-key" --value "sk-..." --type "SecureString" --overwrite
aws ssm put-parameter --name "/storytailor/staging/openai/api-key" --value "sk-..." --type "SecureString" --overwrite
aws ssm put-parameter --name "/storytailor/prod/openai/api-key" --value "sk-..." --type "SecureString" --overwrite
```

### 2. ElevenLabs API Keys
**Action Required:** Generate new ElevenLabs API keys for each environment

**Steps:**
1. Log into ElevenLabs (elevenlabs.io)
2. Navigate to Profile > API Keys
3. Generate new keys for each environment

**Update SSM Parameters:**
```bash
aws ssm put-parameter --name "/storytailor/dev/elevenlabs/api-key" --value "..." --type "SecureString" --overwrite
aws ssm put-parameter --name "/storytailor/staging/elevenlabs/api-key" --value "..." --type "SecureString" --overwrite
aws ssm put-parameter --name "/storytailor/prod/elevenlabs/api-key" --value "..." --type "SecureString" --overwrite
```

### 3. Stripe API Keys
**Action Required:** Update Stripe keys for each environment

**Steps:**
1. Log into Stripe Dashboard
2. Navigate to Developers > API Keys
3. Copy keys for each environment (test/live)

**Update SSM Parameters:**
```bash
# Development (use test keys)
aws ssm put-parameter --name "/storytailor/dev/stripe/secret-key" --value "sk_test_..." --type "SecureString" --overwrite

# Staging (use test keys)
aws ssm put-parameter --name "/storytailor/staging/stripe/secret-key" --value "sk_test_..." --type "SecureString" --overwrite

# Production (use live keys)
aws ssm put-parameter --name "/storytailor/prod/stripe/secret-key" --value "sk_live_..." --type "SecureString" --overwrite
```

### 4. Philips Hue Integration
**Action Required:** Register Storytailor app with Philips Hue for each environment

**Steps:**
1. Visit Philips Hue Developer Portal
2. Create new app registrations for each environment
3. Obtain client ID and secret for each

**Update SSM Parameters:**
```bash
aws ssm put-parameter --name "/storytailor/dev/philips-hue/client-id" --value "..." --type "SecureString" --overwrite
aws ssm put-parameter --name "/storytailor/dev/philips-hue/client-secret" --value "..." --type "SecureString" --overwrite
# Repeat for staging and prod
```

## Verification Steps

After completing manual actions:

1. **Test Secret Retrieval:**
```bash
node -e "
const { secretManager } = require('./packages/shared-utils/src/secrets/SSMSecretManager');
secretManager.getSecret('openai/api-key').then(console.log).catch(console.error);
"
```

2. **Deploy and Test:**
```bash
npm run deploy:staging
npm run test:integration
```

3. **Verify No Hardcoded Secrets:**
```bash
./release-remediation/phase1-secret-scan-validation.sh
```

## Timeline
- **Deadline:** Complete within 2 hours
- **Priority:** CRITICAL - blocks all other phases
- **Owner:** DevOps team lead
EOF

echo "✅ Phase 1.1 Complete: SSM Migration"
echo "⚠️  MANUAL ACTIONS REQUIRED - See release-remediation/MANUAL_ACTIONS_REQUIRED.md"
echo "📋 Next: Complete manual API key generation before proceeding"