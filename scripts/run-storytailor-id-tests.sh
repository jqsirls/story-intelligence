#!/bin/bash

# Run Storytailor ID Tests with Automatic Credential Fetching
# 
# This script:
# 1. Fetches Supabase credentials from AWS SSM (if available)
# 2. Runs database tests
# 3. Optionally runs REST API tests
#
# Usage:
#   ./scripts/run-storytailor-id-tests.sh [environment] [--api]
#
# Examples:
#   ./scripts/run-storytailor-id-tests.sh staging
#   ./scripts/run-storytailor-id-tests.sh production --api

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

ENVIRONMENT=${1:-staging}
RUN_API_TESTS=false

if [[ "$*" == *"--api"* ]]; then
  RUN_API_TESTS=true
fi

PREFIX="/storytailor-${ENVIRONMENT}"

echo -e "${CYAN}🚀 Running Storytailor ID Tests${NC}"
echo -e "${BLUE}Environment: ${ENVIRONMENT}${NC}"
echo ""

# Function to get parameter from SSM
get_ssm_parameter() {
  local param_name="$1"
  aws ssm get-parameter --name "$param_name" --with-decryption --query 'Parameter.Value' --output text 2>/dev/null || echo ""
}

# Try to fetch credentials from SSM
echo -e "${YELLOW}📋 Fetching credentials from AWS SSM...${NC}"

SUPABASE_URL=$(get_ssm_parameter "${PREFIX}/supabase/url" || get_ssm_parameter "${PREFIX}/supabase-url")
SUPABASE_SERVICE_KEY=$(get_ssm_parameter "${PREFIX}/supabase/service-key" || \
                       get_ssm_parameter "${PREFIX}/supabase-service-key" || \
                       get_ssm_parameter "${PREFIX}/supabase-service-role-key")

# If not found in SSM, check environment variables
if [ -z "$SUPABASE_URL" ]; then
  SUPABASE_URL="$SUPABASE_URL"
fi

if [ -z "$SUPABASE_SERVICE_KEY" ]; then
  SUPABASE_SERVICE_KEY="$SUPABASE_SERVICE_KEY"
fi

# If still not found, check for SUPABASE_SERVICE_ROLE_KEY
if [ -z "$SUPABASE_SERVICE_KEY" ]; then
  SUPABASE_SERVICE_KEY="$SUPABASE_SERVICE_ROLE_KEY"
fi

# Final check - if still missing, prompt user
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_KEY" ]; then
  echo -e "${RED}❌ Supabase credentials not found${NC}"
  echo ""
  echo -e "${YELLOW}Please provide credentials in one of these ways:${NC}"
  echo ""
  echo -e "${BLUE}Option 1: Set environment variables${NC}"
  echo "  export SUPABASE_URL=https://xxx.supabase.co"
  echo "  export SUPABASE_SERVICE_KEY=xxx"
  echo "  ./scripts/run-storytailor-id-tests.sh ${ENVIRONMENT}"
  echo ""
  echo -e "${BLUE}Option 2: Pass as arguments${NC}"
  echo "  SUPABASE_URL=https://xxx.supabase.co SUPABASE_SERVICE_KEY=xxx ./scripts/run-storytailor-id-tests.sh ${ENVIRONMENT}"
  echo ""
  echo -e "${BLUE}Option 3: Ensure AWS SSM parameters exist${NC}"
  echo "  - ${PREFIX}/supabase/url"
  echo "  - ${PREFIX}/supabase/service-key"
  echo ""
  exit 1
fi

echo -e "${GREEN}✅ Credentials loaded${NC}"
echo -e "${BLUE}   URL: ${SUPABASE_URL}${NC}"
echo ""

# Export for test scripts
export SUPABASE_URL
export SUPABASE_SERVICE_KEY

# Run database tests
echo -e "${CYAN}📊 Running Database Tests...${NC}"
echo ""

if node scripts/test-storytailor-id-real-db.js; then
  echo ""
  echo -e "${GREEN}✅ Database tests passed!${NC}"
else
  echo ""
  echo -e "${RED}❌ Database tests failed${NC}"
  exit 1
fi

# Optionally run API tests
if [ "$RUN_API_TESTS" = true ]; then
  echo ""
  echo -e "${CYAN}🌐 Running REST API Tests...${NC}"
  echo ""
  
  # Try to get API URL from SSM or use default
  API_BASE_URL=$(get_ssm_parameter "${PREFIX}/api-base-url" || \
                 get_ssm_parameter "${PREFIX}/api-url" || \
                 echo "${API_BASE_URL:-https://api.storytailor.dev}")
  
  export API_BASE_URL
  
  if node scripts/test-rest-api-endpoints.js; then
    echo ""
    echo -e "${GREEN}✅ API tests passed!${NC}"
  else
    echo ""
    echo -e "${RED}❌ API tests failed${NC}"
    exit 1
  fi
else
  echo ""
  echo -e "${YELLOW}💡 To run API tests, add --api flag:${NC}"
  echo "   ./scripts/run-storytailor-id-tests.sh ${ENVIRONMENT} --api"
fi

echo ""
echo -e "${GREEN}✅ All tests completed!${NC}"

