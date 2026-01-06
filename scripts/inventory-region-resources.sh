#!/bin/bash
# Inventory AWS Resources in Both Regions
# Compares us-east-1 and us-east-2 to identify duplicates and resources to migrate

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BLUE='\033[0;34m'
NC='\033[0m'

REGION1="us-east-1"
REGION2="us-east-2"

echo -e "${CYAN}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║          AWS Resource Inventory: Region Comparison              ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Temporary files
TMP_DIR=$(mktemp -d)
FUNCTIONS_REGION1="${TMP_DIR}/functions_${REGION1}.txt"
FUNCTIONS_REGION2="${TMP_DIR}/functions_${REGION2}.txt"
RULES_REGION1="${TMP_DIR}/rules_${REGION1}.txt"
RULES_REGION2="${TMP_DIR}/rules_${REGION2}.txt"
DUPLICATES="${TMP_DIR}/duplicates.txt"

# Cleanup function
cleanup() {
  rm -rf "${TMP_DIR}"
}
trap cleanup EXIT

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}1. Inventory Lambda Functions${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Get production functions in us-east-1
echo -e "${YELLOW}  Scanning ${REGION1}...${NC}"
aws lambda list-functions --region "${REGION1}" \
  --query 'Functions[?contains(FunctionName, `storytailor`) && contains(FunctionName, `production`)].FunctionName' \
  --output text 2>/dev/null | tr '\t' '\n' | sort > "${FUNCTIONS_REGION1}" || true

COUNT1=$(wc -l < "${FUNCTIONS_REGION1}" | tr -d ' ')
echo -e "${GREEN}  ✓ Found ${COUNT1} production functions in ${REGION1}${NC}"

# Get production functions in us-east-2
echo -e "${YELLOW}  Scanning ${REGION2}...${NC}"
aws lambda list-functions --region "${REGION2}" \
  --query 'Functions[?contains(FunctionName, `storytailor`) && contains(FunctionName, `production`)].FunctionName' \
  --output text 2>/dev/null | tr '\t' '\n' | sort > "${FUNCTIONS_REGION2}" || true

COUNT2=$(wc -l < "${FUNCTIONS_REGION2}" | tr -d ' ')
echo -e "${GREEN}  ✓ Found ${COUNT2} production functions in ${REGION2}${NC}"

# Find duplicates
comm -12 "${FUNCTIONS_REGION1}" "${FUNCTIONS_REGION2}" > "${DUPLICATES}" || true
DUPLICATE_COUNT=$(wc -l < "${DUPLICATES}" | tr -d ' ')

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}2. Inventory EventBridge Rules${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Get EventBridge rules in us-east-1
echo -e "${YELLOW}  Scanning ${REGION1} EventBridge rules...${NC}"
aws events list-rules --region "${REGION1}" \
  --query 'Rules[?contains(Name, `storytailor`) || contains(Name, `inactivity`) || contains(Name, `deletion`)].Name' \
  --output text 2>/dev/null | tr '\t' '\n' | sort > "${RULES_REGION1}" || true

RULES_COUNT1=$(wc -l < "${RULES_REGION1}" | tr -d ' ')
echo -e "${GREEN}  ✓ Found ${RULES_COUNT1} EventBridge rules in ${REGION1}${NC}"

# Get EventBridge rules in us-east-2
echo -e "${YELLOW}  Scanning ${REGION2} EventBridge rules...${NC}"
aws events list-rules --region "${REGION2}" \
  --query 'Rules[?contains(Name, `storytailor`) || contains(Name, `inactivity`) || contains(Name, `deletion`)].Name' \
  --output text 2>/dev/null | tr '\t' '\n' | sort > "${RULES_REGION2}" || true

RULES_COUNT2=$(wc -l < "${RULES_REGION2}" | tr -d ' ')
echo -e "${GREEN}  ✓ Found ${RULES_COUNT2} EventBridge rules in ${REGION2}${NC}"

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}3. Summary Report${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo -e "${CYAN}Lambda Functions:${NC}"
echo -e "  ${REGION1}: ${GREEN}${COUNT1}${NC} functions"
echo -e "  ${REGION2}: ${YELLOW}${COUNT2}${NC} functions"
echo -e "  ${RED}Duplicates: ${DUPLICATE_COUNT}${NC} functions exist in both regions"
echo ""

echo -e "${CYAN}EventBridge Rules:${NC}"
echo -e "  ${REGION1}: ${GREEN}${RULES_COUNT1}${NC} rules"
echo -e "  ${REGION2}: ${YELLOW}${RULES_COUNT2}${NC} rules"
echo ""

if [ "${DUPLICATE_COUNT}" -gt 0 ]; then
  echo -e "${YELLOW}⚠️  Duplicate Functions (exist in both regions):${NC}"
  while IFS= read -r func; do
    echo -e "    • ${func}"
  done < "${DUPLICATES}"
  echo ""
fi

# Functions only in us-east-2 (need to migrate or are unique)
echo -e "${CYAN}Functions only in ${REGION2} (candidates for migration/deletion):${NC}"
comm -23 "${FUNCTIONS_REGION2}" "${FUNCTIONS_REGION1}" | while IFS= read -r func; do
  echo -e "    • ${YELLOW}${func}${NC}"
done
echo ""

# Functions only in us-east-1 (already correct)
echo -e "${CYAN}Functions only in ${REGION1} (already in correct region):${NC}"
comm -23 "${FUNCTIONS_REGION1}" "${FUNCTIONS_REGION2}" | head -10 | while IFS= read -r func; do
  echo -e "    • ${GREEN}${func}${NC}"
done
if [ "$(comm -23 "${FUNCTIONS_REGION1}" "${FUNCTIONS_REGION2}" | wc -l | tr -d ' ')" -gt 10 ]; then
  echo -e "    ${CYAN}... and $(($(comm -23 "${FUNCTIONS_REGION1}" "${FUNCTIONS_REGION2}" | wc -l | tr -d ' ') - 10)) more${NC}"
fi
echo ""

# EventBridge rules only in us-east-2
if [ "${RULES_COUNT2}" -gt 0 ]; then
  echo -e "${CYAN}EventBridge Rules only in ${REGION2} (need to migrate):${NC}"
  comm -23 "${RULES_REGION2}" "${RULES_REGION1}" | while IFS= read -r rule; do
    echo -e "    • ${YELLOW}${rule}${NC}"
  done
  echo ""
fi

# Critical processors check
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}4. Critical Processors Status${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

CRITICAL_FUNCTIONS=(
  "storytailor-inactivity-processor-production"
  "storytailor-deletion-processor-production"
  "storytailor-account-deletion-processor-production"
)

for func in "${CRITICAL_FUNCTIONS[@]}"; do
  IN_REGION1=$(grep -c "^${func}$" "${FUNCTIONS_REGION1}" || echo "0")
  IN_REGION2=$(grep -c "^${func}$" "${FUNCTIONS_REGION2}" || echo "0")
  
  if [ "${IN_REGION1}" -gt 0 ] && [ "${IN_REGION2}" -gt 0 ]; then
    echo -e "  ${func}: ${RED}DUPLICATE${NC} (exists in both regions)"
  elif [ "${IN_REGION1}" -gt 0 ]; then
    echo -e "  ${func}: ${GREEN}✓ in ${REGION1}${NC}"
  elif [ "${IN_REGION2}" -gt 0 ]; then
    echo -e "  ${func}: ${YELLOW}⚠️  in ${REGION2} (needs migration)${NC}"
  else
    echo -e "  ${func}: ${RED}NOT FOUND${NC}"
  fi
done

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}5. Recommendations${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if [ "${DUPLICATE_COUNT}" -gt 0 ]; then
  echo -e "${YELLOW}⚠️  Action Required:${NC}"
  echo -e "  • ${DUPLICATE_COUNT} duplicate functions found"
  echo -e "  • Verify ${REGION1} versions are active"
  echo -e "  • Delete ${REGION2} duplicates after verification"
  echo ""
fi

if [ "${RULES_COUNT2}" -gt 0 ]; then
  echo -e "${YELLOW}⚠️  Action Required:${NC}"
  echo -e "  • ${RULES_COUNT2} EventBridge rules in ${REGION2}"
  echo -e "  • Recreate in ${REGION1} before deleting from ${REGION2}"
  echo ""
fi

FUNCTIONS_TO_MIGRATE=$(comm -23 "${FUNCTIONS_REGION2}" "${FUNCTIONS_REGION1}" | wc -l | tr -d ' ')
if [ "${FUNCTIONS_TO_MIGRATE}" -gt 0 ]; then
  echo -e "${CYAN}Functions to Review:${NC}"
  echo -e "  • ${FUNCTIONS_TO_MIGRATE} functions exist only in ${REGION2}"
  echo -e "  • Determine if they should be migrated or deleted"
  echo ""
fi

echo -e "${GREEN}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                    Inventory Complete!                         ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════════╝${NC}"

# Save detailed report
REPORT_FILE="region-inventory-$(date +%Y%m%d-%H%M%S).txt"
{
  echo "Region Inventory Report - $(date)"
  echo "=================================="
  echo ""
  echo "Lambda Functions:"
  echo "  ${REGION1}: ${COUNT1}"
  echo "  ${REGION2}: ${COUNT2}"
  echo "  Duplicates: ${DUPLICATE_COUNT}"
  echo ""
  echo "EventBridge Rules:"
  echo "  ${REGION1}: ${RULES_COUNT1}"
  echo "  ${REGION2}: ${RULES_COUNT2}"
  echo ""
  if [ "${DUPLICATE_COUNT}" -gt 0 ]; then
    echo "Duplicate Functions:"
    cat "${DUPLICATES}"
    echo ""
  fi
  echo "Functions only in ${REGION2}:"
  comm -23 "${FUNCTIONS_REGION2}" "${FUNCTIONS_REGION1}"
  echo ""
} > "${REPORT_FILE}"

echo -e "${CYAN}📄 Detailed report saved to: ${REPORT_FILE}${NC}"

