#!/bin/bash
# Configure JWKS URL for A2A OAuth Authentication
# Sets up JWKS URL, Token Issuer, and Token Audience in SSM

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
echo -e "${BLUE}║            🔐 JWKS URL Configuration for OAuth 🔐              ║${NC}"
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

# Check if JWKS URL already exists
JWKS_PARAM="${PREFIX}/a2a/jwks-url"
EXISTING_JWKS=$(aws ssm get-parameter --name "$JWKS_PARAM" --region "$AWS_REGION" --query 'Parameter.Value' --output text 2>/dev/null || echo "")

if [ -n "$EXISTING_JWKS" ]; then
    echo -e "${YELLOW}⚠️  JWKS URL already configured:${NC}"
    echo -e "${CYAN}  ${EXISTING_JWKS}${NC}"
    echo ""
    read -p "Do you want to update it? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}Skipping JWKS URL configuration${NC}"
        exit 0
    fi
fi

echo -e "${BLUE}📝 JWKS URL Configuration${NC}"
echo ""
echo -e "${CYAN}What is a JWKS URL?${NC}"
echo -e "  JWKS (JSON Web Key Set) URL is used to verify OAuth 2.0 JWT tokens."
echo -e "  It's typically found at: https://your-oauth-provider.com/.well-known/jwks.json"
echo ""
echo -e "${CYAN}Common OAuth Providers:${NC}"
echo -e "  • Auth0: https://YOUR_DOMAIN.auth0.com/.well-known/jwks.json"
echo -e "  • Okta: https://YOUR_DOMAIN.okta.com/oauth2/default/v1/keys"
echo -e "  • Google: https://www.googleapis.com/oauth2/v3/certs"
echo -e "  • Microsoft: https://login.microsoftonline.com/TENANT_ID/discovery/v2.0/keys"
echo -e "  • Custom: https://your-provider.com/.well-known/jwks.json"
echo ""

# Get JWKS URL
read -p "Enter JWKS URL: " JWKS_URL

if [ -z "$JWKS_URL" ]; then
    echo -e "${RED}❌ JWKS URL is required${NC}"
    exit 1
fi

# Validate URL format
if [[ ! "$JWKS_URL" =~ ^https?:// ]]; then
    echo -e "${RED}❌ Invalid URL format. Must start with http:// or https://${NC}"
    exit 1
fi

# Test JWKS URL accessibility
echo ""
echo -e "${BLUE}🌐 Testing JWKS URL accessibility...${NC}"
if curl -s --max-time 5 --head "$JWKS_URL" >/dev/null 2>&1; then
    echo -e "${GREEN}✅ JWKS URL is accessible${NC}"
    
    # Try to fetch and validate JWKS format
    JWKS_CONTENT=$(curl -s --max-time 5 "$JWKS_URL" 2>/dev/null || echo "")
    if [ -n "$JWKS_CONTENT" ]; then
        if echo "$JWKS_CONTENT" | jq '.keys' >/dev/null 2>&1; then
            KEY_COUNT=$(echo "$JWKS_CONTENT" | jq '.keys | length' 2>/dev/null || echo "0")
            echo -e "${GREEN}✅ Valid JWKS format (${KEY_COUNT} keys found)${NC}"
        else
            echo -e "${YELLOW}⚠️  JWKS URL accessible but may not be valid JWKS format${NC}"
        fi
    fi
else
    echo -e "${YELLOW}⚠️  JWKS URL may not be accessible from this machine (could be network/firewall)${NC}"
    echo -e "${YELLOW}   Proceeding anyway - Lambda may have different network access${NC}"
fi

# Store JWKS URL
echo ""
echo -e "${BLUE}💾 Storing JWKS URL in SSM...${NC}"
aws ssm put-parameter \
    --name "$JWKS_PARAM" \
    --type "String" \
    --value "$JWKS_URL" \
    --region "$AWS_REGION" \
    --overwrite \
    --description "JWKS URL for A2A OAuth token verification" >/dev/null

echo -e "${GREEN}✅ JWKS URL stored: ${JWKS_PARAM}${NC}"

# Get Token Issuer (optional but recommended)
echo ""
echo -e "${BLUE}📝 Token Issuer (Optional but Recommended)${NC}"
echo -e "${CYAN}  The 'iss' (issuer) claim in JWT tokens must match this value${NC}"
echo -e "${CYAN}  Example: https://your-oauth-provider.com${NC}"
read -p "Enter Token Issuer (or press Enter to skip): " TOKEN_ISSUER

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

# Get Token Audience (optional but recommended)
echo ""
echo -e "${BLUE}📝 Token Audience (Optional but Recommended)${NC}"
echo -e "${CYAN}  The 'aud' (audience) claim in JWT tokens must match this value${NC}"
echo -e "${CYAN}  Example: storytailor-a2a-api, api://storytailor-a2a${NC}"
read -p "Enter Token Audience (or press Enter to skip): " TOKEN_AUDIENCE

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

# Summary
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                  ✅ JWKS Configuration Complete! ✅            ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${CYAN}Configured Parameters:${NC}"
echo -e "  • JWKS URL: ${JWKS_URL}"
if [ -n "$TOKEN_ISSUER" ]; then
    echo -e "  • Token Issuer: ${TOKEN_ISSUER}"
fi
if [ -n "$TOKEN_AUDIENCE" ]; then
    echo -e "  • Token Audience: ${TOKEN_AUDIENCE}"
fi
echo ""
echo -e "${CYAN}Next Steps:${NC}"
echo -e "1. Re-deploy Universal Agent to load new configuration:"
echo -e "   ${YELLOW}./scripts/deploy-universal-agent-proper.sh ${ENVIRONMENT}${NC}"
echo ""
echo -e "2. Test OAuth authentication:"
echo -e "   ${YELLOW}curl -X POST https://d3su0gpyy6qhel.cloudfront.net/a2a/message \\${NC}"
echo -e "   ${YELLOW}  -H \"Content-Type: application/json\" \\${NC}"
echo -e "   ${YELLOW}  -H \"Authorization: Bearer YOUR_JWT_TOKEN\" \\${NC}"
echo -e "   ${YELLOW}  -d '{\"jsonrpc\":\"2.0\",\"id\":\"1\",\"method\":\"library.list\",\"params\":{}}'${NC}"
echo ""
echo -e "${CYAN}Verification:${NC}"
echo -e "  Check logs for: ${YELLOW}\"JWKS client initialized\"${NC}"
echo -e "  Should NOT see: ${YELLOW}\"JWT verification without signature check\"${NC}"
echo ""
