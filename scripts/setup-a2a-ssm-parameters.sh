#!/bin/bash
# Setup A2A SSM Parameters
# Configures API keys and optional OAuth settings for A2A protocol

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Environment setup
ENVIRONMENT=${1:-production}
PREFIX="/storytailor-${ENVIRONMENT}"
AWS_REGION=${AWS_REGION:-us-east-1}

echo -e "${BLUE}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║            🔐 A2A SSM Parameters Setup 🔐                      ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo -e "${CYAN}Environment: ${ENVIRONMENT}${NC}"
echo -e "${CYAN}SSM Prefix: ${PREFIX}${NC}"
echo ""

# Validate environment
if [[ "$ENVIRONMENT" != "staging" && "$ENVIRONMENT" != "production" ]]; then
    echo -e "${RED}❌ Invalid environment: $ENVIRONMENT${NC}"
    echo -e "${YELLOW}Usage: $0 [staging|production]${NC}"
    exit 1
fi

# Check if API keys parameter already exists
API_KEYS_PARAM="${PREFIX}/a2a/api-keys"
EXISTING_KEYS=$(aws ssm get-parameter --name "$API_KEYS_PARAM" --region "$AWS_REGION" --with-decryption --query 'Parameter.Value' --output text 2>/dev/null || echo "")

if [ -n "$EXISTING_KEYS" ]; then
    echo -e "${YELLOW}⚠️  API keys parameter already exists${NC}"
    echo -e "${CYAN}Current API keys:${NC}"
    echo "$EXISTING_KEYS" | jq '.' 2>/dev/null || echo "$EXISTING_KEYS"
    echo ""
    read -p "Do you want to overwrite? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}Skipping API keys configuration${NC}"
        SKIP_API_KEYS=true
    fi
fi

# Setup API Keys
if [ -z "$SKIP_API_KEYS" ]; then
    echo -e "${BLUE}📝 Setting up A2A API Keys...${NC}"
    echo -e "${YELLOW}Enter API keys in JSON format (or press Enter to use example):${NC}"
    echo -e "${CYAN}Example format:${NC}"
    cat << 'EOF'
{
  "partner-agent-1-key": {
    "agentId": "partner-agent-1",
    "scopes": ["library.read", "library.write", "storytelling"]
  },
  "partner-agent-2-key": {
    "agentId": "partner-agent-2",
    "scopes": ["library.read"]
  }
}
EOF
    echo ""
    read -p "Paste API keys JSON (or press Enter for example): " API_KEYS_JSON
    
    if [ -z "$API_KEYS_JSON" ]; then
        # Use example API keys
        API_KEYS_JSON='{
  "example-partner-key": {
    "agentId": "example-partner",
    "scopes": ["library.read", "storytelling"]
  }
}'
        echo -e "${YELLOW}Using example API keys (update with real keys in production)${NC}"
    fi
    
    # Validate JSON
    if ! echo "$API_KEYS_JSON" | jq . >/dev/null 2>&1; then
        echo -e "${RED}❌ Invalid JSON format${NC}"
        exit 1
    fi
    
    # Store in SSM
    aws ssm put-parameter \
        --name "$API_KEYS_PARAM" \
        --type "SecureString" \
        --value "$API_KEYS_JSON" \
        --region "$AWS_REGION" \
        --overwrite \
        --description "A2A API keys for partner agent authentication" >/dev/null
    
    echo -e "${GREEN}✅ API keys stored in SSM: ${API_KEYS_PARAM}${NC}"
fi

# Setup JWKS URL (optional)
echo ""
echo -e "${BLUE}📝 Setting up OAuth JWKS URL (optional)...${NC}"
read -p "Enter JWKS URL for OAuth token verification (or press Enter to skip): " JWKS_URL

if [ -n "$JWKS_URL" ]; then
    JWKS_PARAM="${PREFIX}/a2a/jwks-url"
    aws ssm put-parameter \
        --name "$JWKS_PARAM" \
        --type "String" \
        --value "$JWKS_URL" \
        --region "$AWS_REGION" \
        --overwrite \
        --description "JWKS URL for A2A OAuth token verification" >/dev/null
    
    echo -e "${GREEN}✅ JWKS URL stored in SSM: ${JWKS_PARAM}${NC}"
    
    # Also ask for token issuer and audience
    echo ""
    read -p "Enter Token Issuer (optional): " TOKEN_ISSUER
    if [ -n "$TOKEN_ISSUER" ]; then
        ISSUER_PARAM="${PREFIX}/a2a/token-issuer"
        aws ssm put-parameter \
            --name "$ISSUER_PARAM" \
            --type "String" \
            --value "$TOKEN_ISSUER" \
            --region "$AWS_REGION" \
            --overwrite \
            --description "Token issuer for A2A OAuth" >/dev/null
        echo -e "${GREEN}✅ Token Issuer stored: ${ISSUER_PARAM}${NC}"
    fi
    
    read -p "Enter Token Audience (optional): " TOKEN_AUDIENCE
    if [ -n "$TOKEN_AUDIENCE" ]; then
        AUDIENCE_PARAM="${PREFIX}/a2a/token-audience"
        aws ssm put-parameter \
            --name "$AUDIENCE_PARAM" \
            --type "String" \
            --value "$TOKEN_AUDIENCE" \
            --region "$AWS_REGION" \
            --overwrite \
            --description "Token audience for A2A OAuth" >/dev/null
        echo -e "${GREEN}✅ Token Audience stored: ${AUDIENCE_PARAM}${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Skipping OAuth configuration${NC}"
fi

# Summary
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                    ✅ Setup Complete! ✅                         ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${CYAN}Next steps:${NC}"
echo -e "1. Re-deploy Universal Agent to load new parameters:"
echo -e "   ${YELLOW}./scripts/deploy-universal-agent-proper.sh ${ENVIRONMENT}${NC}"
echo ""
echo -e "2. Test A2A endpoints with API key:"
echo -e "   ${YELLOW}curl -X POST https://p6zhldb6jyuy5bgygjhf35zqru0liddz.lambda-url.us-east-1.on.aws/a2a/message \\${NC}"
echo -e "   ${YELLOW}  -H \"Content-Type: application/json\" \\${NC}"
echo -e "   ${YELLOW}  -H \"X-API-Key: your-api-key\" \\${NC}"
echo -e "   ${YELLOW}  -d '{\"jsonrpc\":\"2.0\",\"id\":\"1\",\"method\":\"library.list\",\"params\":{}}'${NC}"
echo ""
