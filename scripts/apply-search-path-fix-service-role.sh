#!/bin/bash
# Apply search_path fix using service role credentials
# This script uses service role key for elevated permissions

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

ENVIRONMENT=${1:-production}
PREFIX="/storytailor-${ENVIRONMENT}"

echo -e "${BLUE}🔐 Applying search_path fix with SERVICE ROLE credentials${NC}"
echo -e "${BLUE}Environment: ${ENVIRONMENT}${NC}"
echo ""

# Get Supabase credentials from SSM
echo -e "${YELLOW}📋 Getting Supabase credentials...${NC}"
SUPABASE_URL=$(aws ssm get-parameter --name "${PREFIX}/supabase/url" --with-decryption --query 'Parameter.Value' --output text 2>/dev/null || \
               aws ssm get-parameter --name "${PREFIX}/supabase-url" --with-decryption --query 'Parameter.Value' --output text 2>/dev/null || echo "")
SUPABASE_SERVICE_KEY=$(aws ssm get-parameter --name "${PREFIX}/supabase/service-key" --with-decryption --query 'Parameter.Value' --output text 2>/dev/null || \
                       aws ssm get-parameter --name "${PREFIX}/supabase-service-key" --with-decryption --query 'Parameter.Value' --output text 2>/dev/null || \
                       aws ssm get-parameter --name "${PREFIX}/supabase-service-role-key" --with-decryption --query 'Parameter.Value' --output text 2>/dev/null || echo "")

if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_KEY" ]; then
    echo -e "${RED}❌ Supabase credentials not found in SSM${NC}"
    echo -e "${YELLOW}Please ensure these parameters exist:${NC}"
    echo "  - ${PREFIX}/supabase/url"
    echo "  - ${PREFIX}/supabase/service-key"
    exit 1
fi

echo -e "${GREEN}✅ Credentials loaded${NC}"
echo -e "${BLUE}   URL: ${SUPABASE_URL}${NC}"

# Extract project reference from URL
PROJECT_REF=$(echo "$SUPABASE_URL" | sed -E 's|https://([^.]+)\.supabase\.co.*|\1|')

if [ -z "$PROJECT_REF" ]; then
    echo -e "${RED}❌ Could not extract project reference from URL${NC}"
    exit 1
fi

echo -e "${BLUE}   Project: ${PROJECT_REF}${NC}"
echo ""

# Check if psql is available
if ! command -v psql &> /dev/null; then
    echo -e "${YELLOW}⚠️  psql not found. Installing...${NC}"
    echo -e "${YELLOW}Please install PostgreSQL client tools${NC}"
    exit 1
fi

# Construct connection string
# Format: postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres
# We need to extract password from service key (JWT) - this is complex
# Alternative: Use Supabase REST API to execute SQL

echo -e "${YELLOW}📝 Attempting to apply migration via REST API...${NC}"

# Read migration file
MIGRATION_FILE="supabase/migrations/20241216000004_fix_system_functions_with_service_role.sql"
if [ ! -f "$MIGRATION_FILE" ]; then
    echo -e "${RED}❌ Migration file not found: ${MIGRATION_FILE}${NC}"
    exit 1
fi

# Execute via REST API using service role
SQL_CONTENT=$(cat "$MIGRATION_FILE")

# Use Supabase REST API to execute SQL
RESPONSE=$(curl -s -w "\n%{http_code}" \
    -X POST \
    -H "apikey: ${SUPABASE_SERVICE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \
    -H "Content-Type: application/json" \
    -d "{\"query\": $(echo "$SQL_CONTENT" | jq -Rs .)}" \
    "${SUPABASE_URL}/rest/v1/rpc/exec_sql" 2>/dev/null || echo "000")

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | head -n -1)

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
    echo -e "${GREEN}✅ Migration executed successfully${NC}"
    echo "$BODY" | jq . 2>/dev/null || echo "$BODY"
else
    echo -e "${YELLOW}⚠️  REST API method may not be available${NC}"
    echo -e "${YELLOW}HTTP Code: ${HTTP_CODE}${NC}"
    echo ""
    echo -e "${BLUE}Alternative: Use Supabase Dashboard${NC}"
    echo -e "${BLUE}1. Go to: https://supabase.com/dashboard/project/${PROJECT_REF}/sql${NC}"
    echo -e "${BLUE}2. Copy contents of: ${MIGRATION_FILE}${NC}"
    echo -e "${BLUE}3. Paste and execute in SQL Editor${NC}"
    echo ""
    echo -e "${BLUE}Or use psql with direct connection:${NC}"
    echo -e "${BLUE}psql 'postgresql://postgres:[PASSWORD]@db.${PROJECT_REF}.supabase.co:5432/postgres' -f ${MIGRATION_FILE}${NC}"
fi
