#!/bin/bash
#
# Generate API Key for Storytailor Widget
# Creates a new API key and stores it in Supabase
#

set -e

# Color output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}🔑 Generating Widget API Key${NC}\n"

# Generate secure API key
API_KEY="sk_widget_$(openssl rand -hex 32)"
echo -e "${YELLOW}Generated API Key:${NC}"
echo -e "${GREEN}$API_KEY${NC}"

# Create hash of the key for storage
KEY_HASH=$(echo -n "$API_KEY" | openssl dgst -sha256 -binary | base64)

echo -e "\n${YELLOW}Key Hash (for database):${NC}"
echo -e "$KEY_HASH"

# Get Supabase credentials from SSM
SUPABASE_URL=$(aws ssm get-parameter --name "/storytailor-production/supabase/url" --query 'Parameter.Value' --output text 2>/dev/null)
SUPABASE_KEY=$(aws ssm get-parameter --name "/storytailor-production/supabase/service-key" --with-decryption --query 'Parameter.Value' --output text 2>/dev/null)

if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_KEY" ]; then
    echo -e "\n${YELLOW}⚠️  Supabase credentials not found in SSM${NC}"
    echo -e "${YELLOW}Manual steps to store API key:${NC}"
    echo -e "1. Log into Supabase: ${SUPABASE_URL}"
    echo -e "2. Go to Table Editor → api_keys"
    echo -e "3. Insert new row:"
    echo -e "   - name: 'Widget API Key'"
    echo -e "   - key_hash: '$KEY_HASH'"
    echo -e "   - permissions: '[\"conversations\", \"stories\", \"voice\"]'"
    echo -e "   - created_at: now()"
    exit 0
fi

echo -e "\n${YELLOW}Storing in Supabase...${NC}"

# Store in Supabase using curl (REST API)
curl -X POST "${SUPABASE_URL}/rest/v1/api_keys" \
  -H "apikey: ${SUPABASE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=minimal" \
  -d "{
    \"name\": \"Widget API Key - $(date +%Y-%m-%d)\",
    \"key_hash\": \"${KEY_HASH}\",
    \"permissions\": [\"conversations\", \"stories\", \"voice\", \"characters\"],
    \"created_at\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"
  }" 2>&1

if [ $? -eq 0 ]; then
    echo -e "\n${GREEN}✅ API Key stored in database${NC}"
else
    echo -e "\n${YELLOW}⚠️  Could not auto-store in database${NC}"
    echo -e "${YELLOW}Manual steps above if needed${NC}"
fi

# Save to file for safekeeping
mkdir -p ~/.storytailor
echo "$API_KEY" > ~/.storytailor/widget-api-key.txt
chmod 600 ~/.storytailor/widget-api-key.txt

echo -e "\n${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Widget API Key Generated${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "\n${YELLOW}Your API Key:${NC}"
echo -e "${GREEN}$API_KEY${NC}"
echo -e "\n${YELLOW}Also saved to:${NC} ~/.storytailor/widget-api-key.txt"
echo -e "\n${YELLOW}Use this in your Webflow embed:${NC}"
echo -e "${GREEN}apiKey: '$API_KEY'${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

