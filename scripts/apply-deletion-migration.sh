#!/bin/bash
# Apply Deletion System Migration to Supabase
# This script can be used if Supabase CLI is not available

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

MIGRATION_FILE="supabase/migrations/20250101000001_deletion_system.sql"

echo -e "${CYAN}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║          Apply Deletion System Migration                          ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo ""

if [ ! -f "${MIGRATION_FILE}" ]; then
  echo -e "${RED}❌ Migration file not found: ${MIGRATION_FILE}${NC}"
  exit 1
fi

echo -e "${YELLOW}📝 Migration file: ${MIGRATION_FILE}${NC}"
echo ""
echo -e "${CYAN}To apply this migration, you have two options:${NC}"
echo ""
echo -e "${YELLOW}Option 1: Using Supabase CLI (if installed)${NC}"
echo -e "  supabase migration up"
echo ""
echo -e "${YELLOW}Option 2: Using Supabase Dashboard${NC}"
echo -e "  1. Go to your Supabase project dashboard"
echo -e "  2. Navigate to SQL Editor"
echo -e "  3. Copy and paste the contents of ${MIGRATION_FILE}"
echo -e "  4. Run the SQL script"
echo ""
echo -e "${YELLOW}Option 3: Using psql (if you have direct database access)${NC}"
echo -e "  psql \$DATABASE_URL -f ${MIGRATION_FILE}"
echo ""

# Check if Supabase CLI is available
if command -v supabase &> /dev/null; then
  echo -e "${GREEN}✓ Supabase CLI found${NC}"
  read -p "Apply migration now? (y/n) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Applying migration...${NC}"
    supabase migration up
    echo -e "${GREEN}✓ Migration applied${NC}"
  else
    echo -e "${YELLOW}Migration not applied. Please apply manually.${NC}"
  fi
else
  echo -e "${YELLOW}⚠ Supabase CLI not found. Please apply migration manually using one of the options above.${NC}"
fi

echo ""
echo -e "${CYAN}Migration file contents preview:${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
head -n 30 "${MIGRATION_FILE}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${YELLOW}Full migration file: ${MIGRATION_FILE}${NC}"
