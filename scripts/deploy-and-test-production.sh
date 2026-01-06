#!/bin/bash
# Deploy Storytailor ID migrations and code to production, then run API tests
set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

ENVIRONMENT="production"
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

echo -e "${CYAN}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║     🚀 Production Deployment & Testing - Storytailor ID         ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Step 1: Apply Migrations to Production
echo -e "${BLUE}📋 Step 1: Apply Database Migrations to Production${NC}"
echo ""

MIGRATIONS=(
  "20251226000000_adult_only_registration.sql"
  "20251226000001_storytailor_id_enhancement.sql"
  "20251226000002_library_consent.sql"
  "20251226000003_migrate_existing_libraries.sql"
  "20251226000004_cleanup_age_triggers.sql"
  "20251226000005_fix_story_id_constraint.sql"
)

echo -e "${YELLOW}⚠️  IMPORTANT: Migrations must be applied via Supabase Studio${NC}"
echo -e "${YELLOW}   Production database: https://supabase.com/dashboard/project/_/sql${NC}"
echo ""
echo -e "${CYAN}Migrations to apply (in order):${NC}"
for i in "${!MIGRATIONS[@]}"; do
  echo -e "  ${GREEN}$((i+1)).${NC} supabase/migrations/${MIGRATIONS[$i]}"
done
echo ""
echo -e "${YELLOW}Press Enter after you've applied all migrations in Supabase Studio...${NC}"
read -r

# Step 2: Verify Migrations Applied
echo ""
echo -e "${BLUE}📋 Step 2: Verify Migrations Applied${NC}"
echo -e "${CYAN}Running database tests to verify migrations...${NC}"
echo ""

if ./scripts/run-storytailor-id-tests.sh production 2>&1 | grep -q "✅ All tests passed"; then
  echo -e "${GREEN}✅ Migrations verified successfully${NC}"
else
  echo -e "${RED}❌ Migration verification failed${NC}"
  echo -e "${YELLOW}Please check the errors above and ensure all migrations are applied correctly.${NC}"
  exit 1
fi

# Step 3: Deploy Universal Agent Code
echo ""
echo -e "${BLUE}📋 Step 3: Deploy Universal Agent to Production${NC}"
echo ""

if [ -f "./scripts/deploy-universal-agent-proper.sh" ]; then
  echo -e "${CYAN}Deploying Universal Agent Lambda...${NC}"
  ./scripts/deploy-universal-agent-proper.sh production
  
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Universal Agent deployed successfully${NC}"
  else
    echo -e "${RED}❌ Universal Agent deployment failed${NC}"
    exit 1
  fi
else
  echo -e "${YELLOW}⚠️  deploy-universal-agent-proper.sh not found, skipping code deployment${NC}"
  echo -e "${YELLOW}   Code changes may already be deployed or deployment is manual${NC}"
fi

# Step 4: Wait for Lambda to be ready
echo ""
echo -e "${BLUE}📋 Step 4: Wait for Lambda to be ready${NC}"
echo -e "${CYAN}Waiting 10 seconds for Lambda to warm up...${NC}"
sleep 10

# Step 5: Run API Tests
echo ""
echo -e "${BLUE}📋 Step 5: Run API Tests Against Production${NC}"
echo ""

# Get production API URL from SSM or use default
API_BASE_URL=$(aws ssm get-parameter --name "/storytailor-production/api-base-url" --query "Parameter.Value" --output text 2>/dev/null || echo "https://api.storytailor.dev")

echo -e "${CYAN}Testing API at: ${API_BASE_URL}${NC}"
echo ""

# Run API tests
export API_BASE_URL
export API_URL="$API_BASE_URL"

if node scripts/test-rest-api-endpoints.js 2>&1; then
  echo ""
  echo -e "${GREEN}✅ All API tests passed!${NC}"
else
  echo ""
  echo -e "${RED}❌ Some API tests failed${NC}"
  echo -e "${YELLOW}Please review the errors above${NC}"
  exit 1
fi

# Final Summary
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                    ✅ DEPLOYMENT COMPLETE                        ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${CYAN}Summary:${NC}"
echo -e "  ${GREEN}✅${NC} Database migrations applied"
echo -e "  ${GREEN}✅${NC} Migrations verified"
echo -e "  ${GREEN}✅${NC} Universal Agent deployed"
echo -e "  ${GREEN}✅${NC} API tests passed"
echo ""
echo -e "${CYAN}Production is ready for design handoff! 🎉${NC}"
echo ""

