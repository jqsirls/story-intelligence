#!/bin/bash
# Final Cleanup of us-east-2 Resources
# Deletes staging Lambda functions and S3 bucket after verification
# 
# Usage:
#   ./scripts/cleanup-us-east-2-final.sh           # Interactive mode with confirmation
#   ./scripts/cleanup-us-east-2-final.sh --dry-run # Preview what would be deleted
#   ./scripts/cleanup-us-east-2-final.sh --yes     # Skip confirmation (use with caution)

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Configuration
REGION_SOURCE="us-east-2"
REGION_TARGET="us-east-1"
S3_BUCKET="storytailor-lambda-deploys-us-east-2"

# Flags
DRY_RUN=false
SKIP_CONFIRM=false

# Parse arguments
for arg in "$@"; do
  case $arg in
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --yes)
      SKIP_CONFIRM=true
      shift
      ;;
    *)
      echo -e "${RED}Unknown option: $arg${NC}"
      echo "Usage: $0 [--dry-run] [--yes]"
      exit 1
      ;;
  esac
done

# Counters
DELETED_FUNCTIONS=0
DELETED_BUCKETS=0
FAILED_DELETIONS=0
WARNINGS=0

echo -e "${PURPLE}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${PURPLE}║          Final Cleanup of us-east-2 Resources                  ║${NC}"
echo -e "${PURPLE}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo ""

if [ "$DRY_RUN" = true ]; then
  echo -e "${YELLOW}🔍 DRY-RUN MODE: No resources will be deleted${NC}"
  echo ""
fi

# Step 1: Pre-Cleanup Verification
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}Step 1: Pre-Cleanup Verification${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Verify staging functions exist in us-east-1
echo -e "${CYAN}  Verifying staging functions exist in ${REGION_TARGET}...${NC}"
STAGING_COUNT_TARGET=$(aws lambda list-functions --region "${REGION_TARGET}" \
  --query 'Functions[?contains(FunctionName, `storytailor-`) && contains(FunctionName, `staging`)].FunctionName' \
  --output text 2>/dev/null | wc -w | tr -d ' ' || echo "0")

if [ "$STAGING_COUNT_TARGET" -eq 0 ]; then
  echo -e "${RED}  ❌ ERROR: No staging functions found in ${REGION_TARGET}${NC}"
  echo -e "${RED}     Cannot proceed - staging functions may not be migrated${NC}"
  exit 1
fi

echo -e "${GREEN}  ✅ Found ${STAGING_COUNT_TARGET} staging functions in ${REGION_TARGET}${NC}"

# Count us-east-2 staging functions
STAGING_COUNT_SOURCE=$(aws lambda list-functions --region "${REGION_SOURCE}" \
  --query 'Functions[?contains(FunctionName, `storytailor-`) && contains(FunctionName, `staging`)].FunctionName' \
  --output text 2>/dev/null | wc -w | tr -d ' ' || echo "0")

echo -e "${CYAN}  Found ${STAGING_COUNT_SOURCE} staging functions in ${REGION_SOURCE} (duplicates)${NC}"
echo ""

# Step 2: Resource Inventory
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}Step 2: Resource Inventory${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# List Lambda functions
echo -e "${CYAN}  Lambda Functions in ${REGION_SOURCE}:${NC}"
FUNCTIONS=$(aws lambda list-functions --region "${REGION_SOURCE}" \
  --query 'Functions[?starts_with(FunctionName, `storytailor-`)].FunctionName' \
  --output text 2>/dev/null || echo "")

if [ -z "$FUNCTIONS" ] || [ "$FUNCTIONS" = "None" ]; then
  echo -e "${GREEN}    ✅ No Lambda functions found${NC}"
  FUNCTION_COUNT=0
else
  FUNCTION_COUNT=$(echo "$FUNCTIONS" | tr '\t' '\n' | wc -l | tr -d ' ')
  echo "$FUNCTIONS" | tr '\t' '\n' | while IFS= read -r func; do
    if [ -n "$func" ]; then
      echo -e "    • ${func}"
    fi
  done
fi
echo ""

# Check S3 bucket
echo -e "${CYAN}  S3 Buckets in ${REGION_SOURCE}:${NC}"
BUCKET_EXISTS=false
if aws s3api head-bucket --bucket "${S3_BUCKET}" 2>/dev/null; then
  BUCKET_SIZE=$(aws s3 ls s3://"${S3_BUCKET}" --recursive --summarize 2>/dev/null | grep "Total Size" | awk '{print $3, $4}' || echo "unknown")
  echo -e "    • ${S3_BUCKET} (Size: ${BUCKET_SIZE})"
  BUCKET_EXISTS=true
else
  # Try alternative check
  if aws s3 ls "s3://${S3_BUCKET}" 2>/dev/null | head -1 >/dev/null 2>&1; then
    BUCKET_SIZE=$(aws s3 ls s3://"${S3_BUCKET}" --recursive --summarize 2>/dev/null | grep "Total Size" | awk '{print $3, $4}' || echo "unknown")
    echo -e "    • ${S3_BUCKET} (Size: ${BUCKET_SIZE})"
    BUCKET_EXISTS=true
  else
    echo -e "${GREEN}    ✅ ${S3_BUCKET} not found (may already be deleted)${NC}"
    BUCKET_EXISTS=false
  fi
fi
echo ""

# Check EventBridge rules
echo -e "${CYAN}  EventBridge Rules in ${REGION_SOURCE}:${NC}"
RULES=$(aws events list-rules --region "${REGION_SOURCE}" \
  --query 'Rules[?starts_with(Name, `storytailor-`)].Name' \
  --output text 2>/dev/null || echo "")

if [ -z "$RULES" ] || [ "$RULES" = "None" ]; then
  echo -e "${GREEN}    ✅ No EventBridge rules found${NC}"
else
  RULE_COUNT=$(echo "$RULES" | tr '\t' '\n' | wc -l | tr -d ' ')
  echo "$RULES" | tr '\t' '\n' | while IFS= read -r rule; do
    if [ -n "$rule" ]; then
      echo -e "    ⚠️  ${rule} (unexpected - should be 0)"
    fi
  done
fi
echo ""

# Summary
echo -e "${YELLOW}  Summary:${NC}"
echo -e "    Lambda Functions: ${FUNCTION_COUNT}"
echo -e "    S3 Buckets: $([ "$BUCKET_EXISTS" = true ] && echo "1" || echo "0")"
echo -e "    EventBridge Rules: $([ -n "$RULES" ] && [ "$RULES" != "None" ] && echo "$(echo "$RULES" | tr '\t' '\n' | wc -l | tr -d ' ')" || echo "0")"
echo ""

# Confirmation
if [ "$DRY_RUN" = false ] && [ "$SKIP_CONFIRM" = false ]; then
  echo -e "${RED}⚠️  WARNING: This will DELETE the following resources in ${REGION_SOURCE}:${NC}"
  echo -e "${RED}   - ${FUNCTION_COUNT} Lambda functions${NC}"
  if [ "$BUCKET_EXISTS" = true ]; then
    echo -e "${RED}   - 1 S3 bucket (${S3_BUCKET})${NC}"
  fi
  echo ""
  echo -e "${YELLOW}   This action cannot be undone!${NC}"
  echo ""
  read -p "Type 'yes' to confirm deletion: " CONFIRM
  if [ "$CONFIRM" != "yes" ]; then
    echo -e "${YELLOW}Cleanup cancelled${NC}"
    exit 0
  fi
  echo ""
fi

# Step 3: S3 Bucket Cleanup
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}Step 3: S3 Bucket Cleanup${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if [ "$BUCKET_EXISTS" = true ]; then
  if [ "$DRY_RUN" = true ]; then
    echo -e "${YELLOW}  [DRY-RUN] Would delete: ${S3_BUCKET}${NC}"
  else
    echo -e "${YELLOW}  Deleting S3 bucket: ${S3_BUCKET}${NC}"
    if aws s3 rb "s3://${S3_BUCKET}" --force --region "${REGION_SOURCE}" 2>/dev/null; then
      echo -e "${GREEN}  ✅ S3 bucket deleted successfully${NC}"
      DELETED_BUCKETS=$((DELETED_BUCKETS + 1))
    else
      ERROR_MSG=$(aws s3 rb "s3://${S3_BUCKET}" --force --region "${REGION_SOURCE}" 2>&1)
      if echo "$ERROR_MSG" | grep -q "NoSuchBucket"; then
        echo -e "${YELLOW}  ⚠️  Bucket already deleted${NC}"
        WARNINGS=$((WARNINGS + 1))
      else
        echo -e "${RED}  ❌ Failed to delete bucket: ${ERROR_MSG}${NC}"
        FAILED_DELETIONS=$((FAILED_DELETIONS + 1))
      fi
    fi
  fi
else
  echo -e "${GREEN}  ✅ S3 bucket not found (already deleted or never existed)${NC}"
fi
echo ""

# Step 4: Lambda Function Cleanup
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}Step 4: Lambda Function Cleanup${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if [ "$FUNCTION_COUNT" -eq 0 ]; then
  echo -e "${GREEN}  ✅ No Lambda functions to delete${NC}"
else
  if [ "$DRY_RUN" = true ]; then
    echo -e "${YELLOW}  [DRY-RUN] Would delete ${FUNCTION_COUNT} Lambda functions:${NC}"
    echo "$FUNCTIONS" | tr '\t' '\n' | while IFS= read -r func; do
      if [ -n "$func" ]; then
        echo -e "    • ${func}"
      fi
    done
  else
    echo -e "${CYAN}  Deleting ${FUNCTION_COUNT} Lambda functions...${NC}"
    echo ""
    CURRENT=0
    # Use process substitution to avoid subshell issues with counters
    while IFS= read -r func; do
      if [ -n "$func" ]; then
        CURRENT=$((CURRENT + 1))
        echo -e "${CYAN}  [${CURRENT}/${FUNCTION_COUNT}] Deleting: ${func}${NC}"
        if aws lambda delete-function --function-name "$func" --region "${REGION_SOURCE}" 2>/dev/null; then
          echo -e "${GREEN}    ✅ Deleted${NC}"
          DELETED_FUNCTIONS=$((DELETED_FUNCTIONS + 1))
        else
          ERROR_MSG=$(aws lambda delete-function --function-name "$func" --region "${REGION_SOURCE}" 2>&1)
          if echo "$ERROR_MSG" | grep -q "ResourceNotFoundException"; then
            echo -e "${YELLOW}    ⚠️  Already deleted${NC}"
            WARNINGS=$((WARNINGS + 1))
          else
            echo -e "${RED}    ❌ Failed: ${ERROR_MSG}${NC}"
            FAILED_DELETIONS=$((FAILED_DELETIONS + 1))
          fi
        fi
      fi
    done < <(echo "$FUNCTIONS" | tr '\t' '\n')
  fi
fi
echo ""

# Step 5: Post-Cleanup Verification
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}Step 5: Post-Cleanup Verification${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Verify Lambda functions
REMAINING_FUNCTIONS=$(aws lambda list-functions --region "${REGION_SOURCE}" \
  --query 'Functions[?starts_with(FunctionName, `storytailor-`)].FunctionName' \
  --output text 2>/dev/null || echo "")

if [ -z "$REMAINING_FUNCTIONS" ] || [ "$REMAINING_FUNCTIONS" = "None" ]; then
  echo -e "${GREEN}  ✅ No storytailor Lambda functions remaining in ${REGION_SOURCE}${NC}"
else
  REMAINING_COUNT=$(echo "$REMAINING_FUNCTIONS" | tr '\t' '\n' | wc -l | tr -d ' ')
  echo -e "${YELLOW}  ⚠️  ${REMAINING_COUNT} function(s) still remain:${NC}"
  echo "$REMAINING_FUNCTIONS" | tr '\t' '\n' | while IFS= read -r func; do
    if [ -n "$func" ]; then
      echo -e "    • ${func}"
    fi
  done
fi

# Verify S3 bucket
if aws s3api head-bucket --bucket "${S3_BUCKET}" 2>/dev/null || aws s3 ls "s3://${S3_BUCKET}" 2>/dev/null | head -1 >/dev/null 2>&1; then
  echo -e "${YELLOW}  ⚠️  S3 bucket ${S3_BUCKET} still exists${NC}"
else
  echo -e "${GREEN}  ✅ S3 bucket ${S3_BUCKET} deleted${NC}"
fi

# Verify EventBridge rules
REMAINING_RULES=$(aws events list-rules --region "${REGION_SOURCE}" \
  --query 'Rules[?starts_with(Name, `storytailor-`)].Name' \
  --output text 2>/dev/null || echo "")

if [ -z "$REMAINING_RULES" ] || [ "$REMAINING_RULES" = "None" ]; then
  echo -e "${GREEN}  ✅ No storytailor EventBridge rules remaining in ${REGION_SOURCE}${NC}"
else
  REMAINING_RULE_COUNT=$(echo "$REMAINING_RULES" | tr '\t' '\n' | wc -l | tr -d ' ')
  echo -e "${YELLOW}  ⚠️  ${REMAINING_RULE_COUNT} EventBridge rule(s) still remain${NC}"
fi
echo ""

# Step 6: Reporting
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}Step 6: Cleanup Report${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if [ "$DRY_RUN" = true ]; then
  echo -e "${YELLOW}  [DRY-RUN MODE]${NC}"
  echo -e "${CYAN}  Would delete:${NC}"
  echo -e "    • ${FUNCTION_COUNT} Lambda functions"
  if [ "$BUCKET_EXISTS" = true ]; then
    echo -e "    • 1 S3 bucket"
  fi
  echo ""
  echo -e "${CYAN}  Estimated monthly savings: ~\$$((FUNCTION_COUNT + 1))-8${NC}"
else
  echo -e "${CYAN}  Cleanup Summary:${NC}"
  echo -e "    Lambda Functions Deleted: ${DELETED_FUNCTIONS}"
  echo -e "    S3 Buckets Deleted: ${DELETED_BUCKETS}"
  echo -e "    Warnings: ${WARNINGS}"
  echo -e "    Failures: ${FAILED_DELETIONS}"
  echo ""
  
  if [ "$FAILED_DELETIONS" -eq 0 ]; then
    echo -e "${GREEN}  ✅ All deletions successful!${NC}"
  else
    echo -e "${YELLOW}  ⚠️  Some deletions failed (see details above)${NC}"
  fi
  
  echo ""
  echo -e "${CYAN}  Estimated Monthly Savings:${NC}"
  ESTIMATED_SAVINGS=$((DELETED_FUNCTIONS + DELETED_BUCKETS))
  echo -e "    • Lambda costs: ~\$$((DELETED_FUNCTIONS * 0))-5/month"
  echo -e "    • S3 storage: ~\$0.72/month"
  echo -e "    • CloudWatch logs: ~\$0-2/month"
  echo -e "    • Total: ~\$${ESTIMATED_SAVINGS}-8/month"
fi

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════════════╗${NC}"
if [ "$DRY_RUN" = true ]; then
  echo -e "${GREEN}║              Dry-Run Complete - No Changes Made               ║${NC}"
else
  echo -e "${GREEN}║                  Cleanup Complete!                             ║${NC}"
fi
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo ""

if [ "$DRY_RUN" = false ]; then
  echo -e "${CYAN}📝 Next Steps:${NC}"
  echo -e "  1. Monitor ${REGION_TARGET} resources for 24 hours"
  echo -e "  2. Verify no errors in CloudWatch logs"
  echo -e "  3. Update documentation if needed"
  echo ""
fi

# Exit with appropriate status
if [ "$FAILED_DELETIONS" -gt 0 ]; then
  exit 1
else
  exit 0
fi

