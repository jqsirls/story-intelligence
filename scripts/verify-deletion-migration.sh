#!/bin/bash
# Verify Deletion System Migration Applied
# Checks that all required tables, functions, and policies exist

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║        Verify Deletion System Migration                          ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if Supabase CLI is available
if ! command -v supabase &> /dev/null; then
  echo -e "${YELLOW}⚠ Supabase CLI not found. Using direct database connection.${NC}"
  echo ""
  
  # Check for database connection string
  if [ -z "$DATABASE_URL" ] && [ -z "$SUPABASE_DB_URL" ]; then
    echo -e "${RED}❌ DATABASE_URL or SUPABASE_DB_URL environment variable required${NC}"
    echo -e "${YELLOW}Set one of these to your Supabase database connection string${NC}"
    exit 1
  fi
  
  DB_URL="${DATABASE_URL:-$SUPABASE_DB_URL}"
  echo -e "${CYAN}Using database connection...${NC}"
else
  echo -e "${GREEN}✓ Supabase CLI found${NC}"
  echo ""
  echo -e "${YELLOW}Note: This script verifies tables exist.${NC}"
  echo -e "${YELLOW}For full verification, connect to your Supabase database directly.${NC}"
  echo ""
fi

# SQL query to check all required components
VERIFY_SQL=$(cat <<'EOF'
-- Check tables
SELECT 
  CASE 
    WHEN COUNT(*) = 5 THEN 'PASS'
    ELSE 'FAIL'
  END as tables_check,
  COUNT(*) as tables_found
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('user_tiers', 'deletion_requests', 'deletion_audit_log', 'email_engagement_tracking', 'hibernated_accounts');

-- Check function
SELECT 
  CASE 
    WHEN COUNT(*) = 1 THEN 'PASS'
    ELSE 'FAIL'
  END as function_check,
  COUNT(*) as functions_found
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname = 'log_deletion_audit';

-- Check indexes
SELECT 
  CASE 
    WHEN COUNT(*) >= 3 THEN 'PASS'
    ELSE 'FAIL'
  END as indexes_check,
  COUNT(*) as indexes_found
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND indexname LIKE 'idx_deletion_%' OR indexname LIKE 'idx_email_%';

-- Check RLS enabled
SELECT 
  CASE 
    WHEN COUNT(*) = 5 THEN 'PASS'
    ELSE 'FAIL'
  END as rls_check,
  COUNT(*) as rls_enabled
FROM pg_tables t
JOIN pg_class c ON c.relname = t.tablename
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND t.tablename IN ('user_tiers', 'deletion_requests', 'deletion_audit_log', 'email_engagement_tracking', 'hibernated_accounts')
  AND c.relrowsecurity = true;
EOF
)

# Run verification
if command -v supabase &> /dev/null; then
  echo -e "${CYAN}Running verification queries...${NC}"
  echo ""
  
  # Try to use Supabase CLI to query
  if supabase db remote --help &> /dev/null; then
    echo -e "${YELLOW}Using Supabase CLI to verify...${NC}"
    # This would require project linking - for now, provide manual instructions
    echo -e "${YELLOW}Manual verification required.${NC}"
    echo ""
    echo -e "${CYAN}To verify manually:${NC}"
    echo "1. Go to Supabase Dashboard"
    echo "2. Navigate to SQL Editor"
    echo "3. Run the following queries:"
    echo ""
    echo "$VERIFY_SQL"
  else
    echo -e "${YELLOW}Supabase CLI remote commands not available.${NC}"
    echo -e "${CYAN}Please verify manually using the SQL queries below:${NC}"
    echo ""
    echo "$VERIFY_SQL"
  fi
else
  # Try direct psql connection
  if command -v psql &> /dev/null; then
    echo -e "${CYAN}Using psql to verify...${NC}"
    echo ""
    
    # Extract connection details from URL if needed
    psql "$DB_URL" -c "$VERIFY_SQL" 2>&1 || {
      echo -e "${YELLOW}Direct connection failed. Please verify manually.${NC}"
      echo ""
      echo -e "${CYAN}Manual verification SQL:${NC}"
      echo "$VERIFY_SQL"
    }
  else
    echo -e "${YELLOW}psql not found. Please verify manually.${NC}"
    echo ""
    echo -e "${CYAN}Manual verification SQL:${NC}"
    echo "$VERIFY_SQL"
  fi
fi

echo ""
echo -e "${CYAN}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║                    Verification Checklist                        ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${CYAN}Required Tables:${NC}"
echo "  ✓ user_tiers"
echo "  ✓ deletion_requests"
echo "  ✓ deletion_audit_log"
echo "  ✓ email_engagement_tracking"
echo "  ✓ hibernated_accounts"
echo ""
echo -e "${CYAN}Required Function:${NC}"
echo "  ✓ log_deletion_audit"
echo ""
echo -e "${CYAN}Required Indexes:${NC}"
echo "  ✓ idx_deletion_requests_user_id"
echo "  ✓ idx_deletion_requests_status"
echo "  ✓ idx_deletion_requests_scheduled_at"
echo "  ✓ idx_email_tracking_user_id"
echo ""
echo -e "${CYAN}RLS Policies:${NC}"
echo "  ✓ All tables should have RLS enabled"
echo "  ✓ Policies should be created for user_tiers, deletion_requests, etc."
echo ""
echo -e "${GREEN}If all items above exist, the migration was applied successfully!${NC}"
echo ""

