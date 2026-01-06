#!/bin/bash

# Environment Setup Script for Storytailor
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

ENVIRONMENT=${1:-staging}

echo -e "${BLUE}🔧 Setting up Storytailor Environment: ${ENVIRONMENT}${NC}"

# Create environment file
create_env_file() {
    local env_file=".env.${ENVIRONMENT}"
    
    echo -e "${YELLOW}📝 Creating environment file: ${env_file}${NC}"
    
    # Check if file already exists
    if [ -f "$env_file" ]; then
        echo -e "${YELLOW}⚠️  Environment file already exists. Backing up...${NC}"
        cp "$env_file" "${env_file}.backup.$(date +%s)"
    fi
    
    cat > "$env_file" << 'EOF'
# Storytailor Environment Configuration
# Copy this file and fill in your actual values

# Basic Configuration
ENVIRONMENT=staging
AWS_REGION=us-east-1

# Supabase Configuration
# Get these from your Supabase project settings
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_KEY=your-service-key-here

# OpenAI Configuration
# Get from https://platform.openai.com/api-keys
OPENAI_API_KEY=sk-your-openai-key-here

# ElevenLabs Configuration
# Get from https://elevenlabs.io/app/settings/api-keys
ELEVENLABS_API_KEY=your-elevenlabs-key-here

# Stability AI Configuration
# Get from https://platform.stability.ai/account/keys
STABILITY_API_KEY=sk-your-stability-key-here

# Stripe Configuration
# Get from https://dashboard.stripe.com/apikeys
STRIPE_SECRET_KEY=sk_test_your-stripe-key-here
STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key_here

# Amazon Product Advertising API
# Get from https://webservices.amazon.com/paapi5/documentation/
AMAZON_API_KEY=your-amazon-api-key-here

# JWT Secret (will be auto-generated if not provided)
JWT_SECRET=your-jwt-secret-here

# Alexa Skill Configuration
# Get from Alexa Developer Console
ALEXA_SKILL_ID=amzn1.ask.skill.your-skill-id

# Monitoring Configuration (Optional)
DATADOG_API_KEY=your-datadog-api-key
DATADOG_APP_KEY=your-datadog-app-key
PAGERDUTY_SERVICE_KEY=your-pagerduty-key
SLACK_WEBHOOK_URL=https://hooks.slack.com/your-webhook

# Alert Configuration
ALERT_EMAIL=admin@yourdomain.com
COMPLIANCE_EMAIL=compliance@yourdomain.com
EOF
    
    echo -e "${GREEN}✅ Environment file created: ${env_file}${NC}"
    echo -e "${YELLOW}📝 Please edit ${env_file} and fill in your actual API keys${NC}"
}

# Check if required tools are installed
check_tools() {
    echo -e "${YELLOW}🔍 Checking required tools...${NC}"
    
    local tools=("aws" "terraform" "node" "npm" "curl" "jq")
    local missing_tools=()
    
    for tool in "${tools[@]}"; do
        if ! command -v "$tool" &> /dev/null; then
            missing_tools+=("$tool")
        else
            echo -e "${GREEN}✅ $tool is installed${NC}"
        fi
    done
    
    if [ ${#missing_tools[@]} -ne 0 ]; then
        echo -e "${RED}❌ Missing tools: ${missing_tools[*]}${NC}"
        echo -e "${YELLOW}Please install the missing tools and run this script again${NC}"
        
        # Provide installation instructions
        echo -e "${BLUE}Installation instructions:${NC}"
        for tool in "${missing_tools[@]}"; do
            case $tool in
                "aws")
                    echo -e "${BLUE}AWS CLI: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html${NC}"
                    ;;
                "terraform")
                    echo -e "${BLUE}Terraform: https://learn.hashicorp.com/tutorials/terraform/install-cli${NC}"
                    ;;
                "node"|"npm")
                    echo -e "${BLUE}Node.js: https://nodejs.org/en/download/${NC}"
                    ;;
                "jq")
                    echo -e "${BLUE}jq: brew install jq (macOS) or apt-get install jq (Ubuntu)${NC}"
                    ;;
            esac
        done
        exit 1
    fi
    
    echo -e "${GREEN}✅ All required tools are installed${NC}"
}

# Setup AWS credentials
setup_aws_credentials() {
    echo -e "${YELLOW}🔐 Checking AWS credentials...${NC}"
    
    if ! aws sts get-caller-identity &> /dev/null; then
        echo -e "${YELLOW}⚠️  AWS credentials not configured${NC}"
        echo -e "${BLUE}Please run: aws configure${NC}"
        echo -e "${BLUE}You'll need:${NC}"
        echo -e "${BLUE}- AWS Access Key ID${NC}"
        echo -e "${BLUE}- AWS Secret Access Key${NC}"
        echo -e "${BLUE}- Default region (e.g., us-east-1)${NC}"
        echo -e "${BLUE}- Default output format (json)${NC}"
        
        read -p "Would you like to configure AWS credentials now? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            aws configure
        else
            echo -e "${YELLOW}Please configure AWS credentials manually and run this script again${NC}"
            exit 1
        fi
    else
        local account_id=$(aws sts get-caller-identity --query Account --output text)
        local user_arn=$(aws sts get-caller-identity --query Arn --output text)
        echo -e "${GREEN}✅ AWS credentials configured${NC}"
        echo -e "${BLUE}Account ID: ${account_id}${NC}"
        echo -e "${BLUE}User/Role: ${user_arn}${NC}"
    fi
}

# Install Node.js dependencies
install_dependencies() {
    echo -e "${YELLOW}📦 Installing Node.js dependencies...${NC}"
    
    if [ -f "package.json" ]; then
        npm install
        echo -e "${GREEN}✅ Node.js dependencies installed${NC}"
    else
        echo -e "${YELLOW}⚠️  No package.json found, skipping npm install${NC}"
    fi
    
    # Install Supabase CLI if not present
    if ! command -v supabase &> /dev/null; then
        echo -e "${YELLOW}📦 Installing Supabase CLI...${NC}"
        npm install -g supabase
        echo -e "${GREEN}✅ Supabase CLI installed${NC}"
    fi
}

# Create necessary directories
create_directories() {
    echo -e "${YELLOW}📁 Creating necessary directories...${NC}"
    
    local dirs=(
        "logs"
        "tmp"
        "dist"
        "coverage"
        "reports"
    )
    
    for dir in "${dirs[@]}"; do
        if [ ! -d "$dir" ]; then
            mkdir -p "$dir"
            echo -e "${GREEN}✅ Created directory: $dir${NC}"
        fi
    done
}

# Setup Git hooks (optional)
setup_git_hooks() {
    echo -e "${YELLOW}🔗 Setting up Git hooks...${NC}"
    
    if [ -d ".git" ]; then
        # Create pre-commit hook
        cat > ".git/hooks/pre-commit" << 'EOF'
#!/bin/bash
# Pre-commit hook for Storytailor

echo "Running pre-commit checks..."

# Run linting
if command -v npm &> /dev/null && [ -f "package.json" ]; then
    npm run lint || exit 1
fi

# Run tests
if command -v npm &> /dev/null && [ -f "package.json" ]; then
    npm test || exit 1
fi

echo "Pre-commit checks passed!"
EOF
        
        chmod +x ".git/hooks/pre-commit"
        echo -e "${GREEN}✅ Git pre-commit hook installed${NC}"
    else
        echo -e "${YELLOW}⚠️  Not a Git repository, skipping Git hooks${NC}"
    fi
}

# Generate sample configuration files
generate_sample_configs() {
    echo -e "${YELLOW}📄 Generating sample configuration files...${NC}"
    
    # Create .gitignore if it doesn't exist
    if [ ! -f ".gitignore" ]; then
        cat > ".gitignore" << 'EOF'
# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Environment files
.env
.env.*
!.env.example

# Build outputs
dist/
build/
coverage/

# Logs
logs/
*.log

# Runtime data
pids/
*.pid
*.seed
*.pid.lock

# Temporary files
tmp/
temp/

# IDE files
.vscode/
.idea/
*.swp
*.swo

# OS files
.DS_Store
Thumbs.db

# Terraform
*.tfstate
*.tfstate.*
.terraform/
*.tfplan

# AWS
.aws/

# Supabase
supabase/.branches
supabase/.temp
EOF
        echo -e "${GREEN}✅ Created .gitignore${NC}"
    fi
    
    # Create README if it doesn't exist
    if [ ! -f "README.md" ]; then
        cat > "README.md" << 'EOF'
# Storytailor Multi-Agent System

An AI-powered storytelling platform for children with multi-agent architecture.

## Quick Start

1. Setup environment:
   ```bash
   ./scripts/setup-environment.sh staging
   ```

2. Configure your API keys in `.env.staging`

3. Deploy infrastructure:
   ```bash
   ./scripts/deploy-infrastructure.sh staging
   ```

4. Validate deployment:
   ```bash
   ./scripts/validate-system.sh staging
   ```

## Documentation

- [Architecture Overview](docs/architecture.md)
- [API Documentation](docs/api.md)
- [Deployment Guide](docs/deployment.md)

## Support

For support, please contact the development team.
EOF
        echo -e "${GREEN}✅ Created README.md${NC}"
    fi
}

# Main execution
main() {
    echo -e "${BLUE}Starting environment setup...${NC}"
    
    check_tools
    setup_aws_credentials
    create_env_file
    install_dependencies
    create_directories
    setup_git_hooks
    generate_sample_configs
    
    echo -e "${GREEN}🎉 Environment setup completed!${NC}"
    echo -e "${BLUE}Next steps:${NC}"
    echo -e "${BLUE}1. Edit .env.${ENVIRONMENT} with your API keys${NC}"
    echo -e "${BLUE}2. Run: ./scripts/deploy-infrastructure.sh ${ENVIRONMENT}${NC}"
    echo -e "${BLUE}3. Run: ./scripts/validate-system.sh ${ENVIRONMENT}${NC}"
}

# Run main function
main