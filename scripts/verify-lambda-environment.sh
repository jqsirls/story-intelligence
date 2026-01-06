#!/bin/bash
# Verify Lambda Environment Variables
# Checks that all required environment variables are set for deletion system Lambdas

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

AWS_REGION=${AWS_REGION:-us-east-1}

echo -e "${CYAN}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║        Verify Lambda Environment Variables                       ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Functions to check
FUNCTIONS=(
  "storytailor-inactivity-processor-production"
  "storytailor-deletion-processor-production"
  "storytailor-universal-agent-production"
)

# Required variables per function (using functions instead of associative arrays for compatibility)
get_required_vars() {
  case "$1" in
    storytailor-inactivity-processor-production)
      echo "SUPABASE_URL SUPABASE_SERVICE_ROLE_KEY LOG_LEVEL"
      ;;
    storytailor-deletion-processor-production)
      echo "SUPABASE_URL SUPABASE_SERVICE_ROLE_KEY LOG_LEVEL"
      ;;
    storytailor-universal-agent-production)
      echo "SUPABASE_URL SUPABASE_SERVICE_ROLE_KEY SUPABASE_ANON_KEY REDIS_URL JWT_SECRET APP_URL"
      ;;
    *)
      echo ""
      ;;
  esac
}

all_ok=true

for func in "${FUNCTIONS[@]}"; do
  echo -e "${CYAN}Checking: ${func}${NC}"
  
  # Get environment variables
  ENV_VARS=$(aws lambda get-function-configuration \
    --function-name "$func" \
    --region "$AWS_REGION" \
    --query 'Environment.Variables' \
    --output json 2>/dev/null || echo "{}")
  
  if [ "$ENV_VARS" = "{}" ] || [ -z "$ENV_VARS" ]; then
    echo -e "${RED}  ❌ Failed to retrieve environment variables${NC}"
    all_ok=false
    continue
  fi
  
  # Check required variables
  REQUIRED=$(get_required_vars "$func")
  MISSING=()
  
  for var in $REQUIRED; do
    VALUE=$(echo "$ENV_VARS" | jq -r ".[\"$var\"] // empty")
    if [ -z "$VALUE" ] || [ "$VALUE" = "null" ]; then
      MISSING+=("$var")
    fi
  done
  
  if [ ${#MISSING[@]} -eq 0 ]; then
    echo -e "${GREEN}  ✅ All required variables set${NC}"
    # Show values (masked)
    echo "$ENV_VARS" | jq -r 'to_entries[] | "    \(.key): \(if .value == "" then "[EMPTY]" else "[SET]" end)"'
  else
    echo -e "${RED}  ❌ Missing required variables:${NC}"
    for var in "${MISSING[@]}"; do
      echo -e "${RED}    - $var${NC}"
    done
    all_ok=false
  fi
  
  echo ""
done

echo -e "${CYAN}╔══════════════════════════════════════════════════════════════════╗${NC}"
if [ "$all_ok" = true ]; then
  echo -e "${GREEN}✅ All Lambda functions have required environment variables${NC}"
else
  echo -e "${YELLOW}⚠️  Some Lambda functions are missing required environment variables${NC}"
  echo ""
  echo -e "${CYAN}To set environment variables:${NC}"
  echo "  aws lambda update-function-configuration \\"
  echo "    --function-name <function-name> \\"
  echo "    --region $AWS_REGION \\"
  echo "    --environment Variables={KEY1=value1,KEY2=value2}"
  echo ""
  echo -e "${CYAN}Or use AWS Console:${NC}"
  echo "  1. Go to Lambda Console"
  echo "  2. Select function"
  echo "  3. Configuration → Environment variables"
  echo "  4. Edit and add missing variables"
fi
echo -e "${CYAN}╚══════════════════════════════════════════════════════════════════╝${NC}"

exit $([ "$all_ok" = true ] && echo 0 || echo 1)

