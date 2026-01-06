#!/bin/bash
# Cleanup us-east-2 Resources After Migration to us-east-1
# This script disables and deletes resources in us-east-2 after verification

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BLUE='\033[0;34m'
NC='\033[0m'

REGION_SOURCE="us-east-2"
REGION_TARGET="us-east-1"

echo -e "${CYAN}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║          Cleanup us-east-2 Resources After Migration            ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}⚠️  WARNING: This will delete resources in ${REGION_SOURCE}${NC}"
echo -e "${YELLOW}   Make sure all resources are verified in ${REGION_TARGET} first!${NC}"
echo ""

# Confirmation
read -p "Type 'yes' to confirm cleanup: " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
  echo -e "${RED}Cleanup cancelled${NC}"
  exit 1
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}Step 1: Disable EventBridge Rules in ${REGION_SOURCE}${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

RULES=(
  "storytailor-inactivity-check"
  "storytailor-deletion-processing"
  "storytailor-account-deletion-daily-trigger-production"
)

for rule in "${RULES[@]}"; do
  if aws events describe-rule --name "$rule" --region "${REGION_SOURCE}" >/dev/null 2>&1; then
    echo -e "${YELLOW}  Disabling: ${rule}${NC}"
    aws events disable-rule --name "$rule" --region "${REGION_SOURCE}" 2>&1 || echo -e "${YELLOW}    (may already be disabled)${NC}"
    echo -e "${GREEN}  ✓ Disabled${NC}"
  else
    echo -e "${CYAN}  ${rule}: Not found (may already be deleted)${NC}"
  fi
done

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}Step 2: Delete Processors from ${REGION_SOURCE}${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

PROCESSORS=(
  "storytailor-inactivity-processor-production"
  "storytailor-deletion-processor-production"
  "storytailor-account-deletion-processor-production"
)

for processor in "${PROCESSORS[@]}"; do
  if aws lambda get-function --function-name "$processor" --region "${REGION_SOURCE}" >/dev/null 2>&1; then
    echo -e "${YELLOW}  Deleting: ${processor}${NC}"
    aws lambda delete-function --function-name "$processor" --region "${REGION_SOURCE}" 2>&1
    echo -e "${GREEN}  ✓ Deleted${NC}"
  else
    echo -e "${CYAN}  ${processor}: Not found (may already be deleted)${NC}"
  fi
done

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}Step 3: Delete EventBridge Rules from ${REGION_SOURCE}${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

for rule in "${RULES[@]}"; do
  if aws events describe-rule --name "$rule" --region "${REGION_SOURCE}" >/dev/null 2>&1; then
    echo -e "${YELLOW}  Deleting: ${rule}${NC}"
    # Remove targets first
    aws events remove-targets --rule "$rule" --ids "1" --region "${REGION_SOURCE}" 2>&1 || true
    # Delete rule
    aws events delete-rule --name "$rule" --region "${REGION_SOURCE}" 2>&1
    echo -e "${GREEN}  ✓ Deleted${NC}"
  else
    echo -e "${CYAN}  ${rule}: Not found (may already be deleted)${NC}"
  fi
done

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}Step 4: Identify Duplicate Functions${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

echo -e "${YELLOW}  Getting function lists...${NC}"
TMP_DIR=$(mktemp -d)
FUNCTIONS_TARGET="${TMP_DIR}/functions_${REGION_TARGET}.txt"
FUNCTIONS_SOURCE="${TMP_DIR}/functions_${REGION_SOURCE}.txt"

aws lambda list-functions --region "${REGION_TARGET}" \
  --query 'Functions[?contains(FunctionName, `storytailor`) && contains(FunctionName, `production`)].FunctionName' \
  --output text 2>/dev/null | tr '\t' '\n' | sort > "${FUNCTIONS_TARGET}" || true

aws lambda list-functions --region "${REGION_SOURCE}" \
  --query 'Functions[?contains(FunctionName, `storytailor`) && contains(FunctionName, `production`)].FunctionName' \
  --output text 2>/dev/null | tr '\t' '\n' | sort > "${FUNCTIONS_SOURCE}" || true

DUPLICATES=$(comm -12 "${FUNCTIONS_TARGET}" "${FUNCTIONS_SOURCE}" || true)
DUPLICATE_COUNT=$(echo "$DUPLICATES" | grep -c . || echo "0")

echo -e "${CYAN}  Found ${DUPLICATE_COUNT} duplicate functions${NC}"

if [ "${DUPLICATE_COUNT}" -gt 0 ]; then
  echo ""
  echo -e "${YELLOW}⚠️  Duplicate Functions (exist in both regions):${NC}"
  echo "$DUPLICATES" | while IFS= read -r func; do
    echo -e "    • ${func}"
  done
  echo ""
  read -p "Delete duplicate functions from ${REGION_SOURCE}? (type 'yes'): " DELETE_DUP
  if [ "$DELETE_DUP" = "yes" ]; then
    echo "$DUPLICATES" | while IFS= read -r func; do
      if aws lambda get-function --function-name "$func" --region "${REGION_SOURCE}" >/dev/null 2>&1; then
        echo -e "${YELLOW}  Deleting duplicate: ${func}${NC}"
        aws lambda delete-function --function-name "$func" --region "${REGION_SOURCE}" 2>&1
        echo -e "${GREEN}  ✓ Deleted${NC}"
      fi
    done
  else
    echo -e "${YELLOW}  Skipping duplicate deletion${NC}"
  fi
fi

rm -rf "${TMP_DIR}"

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║              Cleanup Complete!                                  ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${CYAN}📝 Next Steps:${NC}"
echo -e "  1. Run inventory script to verify cleanup"
echo -e "  2. Monitor ${REGION_TARGET} resources for 24 hours"
echo -e "  3. Verify no errors in CloudWatch logs"
echo -e "  4. Update documentation"

