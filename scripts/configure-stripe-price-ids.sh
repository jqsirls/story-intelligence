#!/bin/bash

# Stripe Price IDs Configuration Script
# Helps configure all 9 required Stripe price IDs in SSM Parameter Store

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Check if AWS CLI is available
if ! command -v aws &> /dev/null; then
  echo -e "${RED}❌ AWS CLI not found. Install: https://aws.amazon.com/cli/${NC}"
  exit 1
fi

# Check if Stripe CLI is available
if ! command -v stripe &> /dev/null; then
  echo -e "${YELLOW}⚠️  Stripe CLI not found. Install: https://stripe.com/docs/stripe-cli${NC}"
  echo -e "${YELLOW}   You can still configure price IDs manually.${NC}"
fi

# Get environment (default to production)
ENVIRONMENT=${1:-production}
SSM_PREFIX="/storytailor-${ENVIRONMENT}/stripe"

echo -e "${CYAN}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║         Stripe Price IDs Configuration Helper                  ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}Environment: ${ENVIRONMENT}${NC}"
echo -e "${BLUE}SSM Prefix: ${SSM_PREFIX}${NC}"
echo ""

# Function to check if parameter exists
check_param() {
  local param_name=$1
  local value=$(aws ssm get-parameter --name "${SSM_PREFIX}/${param_name}" --query 'Parameter.Value' --output text 2>/dev/null || echo "")
  if [ -n "$value" ] && [ "$value" != "None" ]; then
    echo -e "${GREEN}✅ ${param_name}: ${value}${NC}"
    return 0
  else
    echo -e "${RED}❌ ${param_name}: Not configured${NC}"
    return 1
  fi
}

# Function to set parameter
set_param() {
  local param_name=$1
  local description=$2
  local value=$3
  
  if [ -z "$value" ]; then
    echo -e "${YELLOW}⚠️  Skipping ${param_name} (no value provided)${NC}"
    return 1
  fi
  
  echo -e "${CYAN}Setting ${param_name}...${NC}"
  aws ssm put-parameter \
    --name "${SSM_PREFIX}/${param_name}" \
    --value "$value" \
    --type "String" \
    --description "$description" \
    --overwrite > /dev/null 2>&1
  
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ ${param_name} configured${NC}"
    return 0
  else
    echo -e "${RED}❌ Failed to set ${param_name}${NC}"
    return 1
  fi
}

# Function to prompt for price ID
prompt_price_id() {
  local name=$1
  local description=$2
  local current_value=$3
  
  if [ -n "$current_value" ] && [ "$current_value" != "None" ]; then
    echo -e "${GREEN}Current: ${current_value}${NC}"
    read -p "Update? (y/N): " update
    if [ "$update" != "y" ] && [ "$update" != "Y" ]; then
      echo "$current_value"
      return
    fi
  fi
  
  read -p "Enter Stripe Price ID for ${name} (or press Enter to skip): " price_id
  echo "$price_id"
}

echo -e "${CYAN}📋 Checking existing configuration...${NC}"
echo ""

# Check subscription plans
echo -e "${BLUE}Subscription Plans:${NC}"
INDIVIDUAL_PRICE=$(aws ssm get-parameter --name "${SSM_PREFIX}/pro-individual-price-id" --query 'Parameter.Value' --output text 2>/dev/null || echo "")
ORGANIZATION_PRICE=$(aws ssm get-parameter --name "${SSM_PREFIX}/pro-organization-price-id" --query 'Parameter.Value' --output text 2>/dev/null || echo "")

check_param "pro-individual-price-id" || true
check_param "pro-organization-price-id" || true

# Check story packs
echo ""
echo -e "${BLUE}Story Packs:${NC}"
PACK_5_PRICE=$(aws ssm get-parameter --name "${SSM_PREFIX}/story-pack-5-price-id" --query 'Parameter.Value' --output text 2>/dev/null || echo "")
PACK_10_PRICE=$(aws ssm get-parameter --name "${SSM_PREFIX}/story-pack-10-price-id" --query 'Parameter.Value' --output text 2>/dev/null || echo "")
PACK_25_PRICE=$(aws ssm get-parameter --name "${SSM_PREFIX}/story-pack-25-price-id" --query 'Parameter.Value' --output text 2>/dev/null || echo "")

check_param "story-pack-5-price-id" || true
check_param "story-pack-10-price-id" || true
check_param "story-pack-25-price-id" || true

# Check gift cards
echo ""
echo -e "${BLUE}Gift Cards:${NC}"
GIFT_1M_PRICE=$(aws ssm get-parameter --name "${SSM_PREFIX}/gift-card-1-month-price-id" --query 'Parameter.Value' --output text 2>/dev/null || echo "")
GIFT_3M_PRICE=$(aws ssm get-parameter --name "${SSM_PREFIX}/gift-card-3-month-price-id" --query 'Parameter.Value' --output text 2>/dev/null || echo "")
GIFT_6M_PRICE=$(aws ssm get-parameter --name "${SSM_PREFIX}/gift-card-6-month-price-id" --query 'Parameter.Value' --output text 2>/dev/null || echo "")
GIFT_12M_PRICE=$(aws ssm get-parameter --name "${SSM_PREFIX}/gift-card-12-month-price-id" --query 'Parameter.Value' --output text 2>/dev/null || echo "")

check_param "gift-card-1-month-price-id" || true
check_param "gift-card-3-month-price-id" || true
check_param "gift-card-6-month-price-id" || true
check_param "gift-card-12-month-price-id" || true

echo ""
echo -e "${CYAN}═══════════════════════════════════════════════════════════════════${NC}"
echo ""

# Interactive mode
if [ "$2" != "--non-interactive" ]; then
  echo -e "${YELLOW}Would you like to configure missing price IDs? (y/N)${NC}"
  read -p "> " configure
  
  if [ "$configure" = "y" ] || [ "$configure" = "Y" ]; then
    echo ""
    echo -e "${CYAN}Enter Stripe Price IDs (format: price_xxxxx)${NC}"
    echo -e "${YELLOW}Press Enter to skip any parameter${NC}"
    echo ""
    
    # Subscription plans
    echo -e "${BLUE}Subscription Plans:${NC}"
    NEW_INDIVIDUAL=$(prompt_price_id "Pro Individual" "Monthly subscription for individual users" "$INDIVIDUAL_PRICE")
    if [ -n "$NEW_INDIVIDUAL" ]; then
      set_param "pro-individual-price-id" "Pro Individual subscription price ID" "$NEW_INDIVIDUAL"
    fi
    
    NEW_ORGANIZATION=$(prompt_price_id "Pro Organization" "Per-seat subscription for organizations" "$ORGANIZATION_PRICE")
    if [ -n "$NEW_ORGANIZATION" ]; then
      set_param "pro-organization-price-id" "Pro Organization subscription price ID" "$NEW_ORGANIZATION"
    fi
    
    # Story packs
    echo ""
    echo -e "${BLUE}Story Packs:${NC}"
    NEW_PACK_5=$(prompt_price_id "5-Story Pack" "One-time purchase for 5 story credits" "$PACK_5_PRICE")
    if [ -n "$NEW_PACK_5" ]; then
      set_param "story-pack-5-price-id" "5-story pack price ID" "$NEW_PACK_5"
    fi
    
    NEW_PACK_10=$(prompt_price_id "10-Story Pack" "One-time purchase for 10 story credits" "$PACK_10_PRICE")
    if [ -n "$NEW_PACK_10" ]; then
      set_param "story-pack-10-price-id" "10-story pack price ID" "$NEW_PACK_10"
    fi
    
    NEW_PACK_25=$(prompt_price_id "25-Story Pack" "One-time purchase for 25 story credits" "$PACK_25_PRICE")
    if [ -n "$NEW_PACK_25" ]; then
      set_param "story-pack-25-price-id" "25-story pack price ID" "$NEW_PACK_25"
    fi
    
    # Gift cards
    echo ""
    echo -e "${BLUE}Gift Cards:${NC}"
    NEW_GIFT_1M=$(prompt_price_id "1-Month Gift Card" "Gift card for 1 month subscription" "$GIFT_1M_PRICE")
    if [ -n "$NEW_GIFT_1M" ]; then
      set_param "gift-card-1-month-price-id" "1-month gift card price ID" "$NEW_GIFT_1M"
    fi
    
    NEW_GIFT_3M=$(prompt_price_id "3-Month Gift Card" "Gift card for 3 months subscription" "$GIFT_3M_PRICE")
    if [ -n "$NEW_GIFT_3M" ]; then
      set_param "gift-card-3-month-price-id" "3-month gift card price ID" "$NEW_GIFT_3M"
    fi
    
    NEW_GIFT_6M=$(prompt_price_id "6-Month Gift Card" "Gift card for 6 months subscription" "$GIFT_6M_PRICE")
    if [ -n "$NEW_GIFT_6M" ]; then
      set_param "gift-card-6-month-price-id" "6-month gift card price ID" "$NEW_GIFT_6M"
    fi
    
    NEW_GIFT_12M=$(prompt_price_id "12-Month Gift Card" "Gift card for 12 months subscription" "$GIFT_12M_PRICE")
    if [ -n "$NEW_GIFT_12M" ]; then
      set_param "gift-card-12-month-price-id" "12-month gift card price ID" "$NEW_GIFT_12M"
    fi
  fi
fi

echo ""
echo -e "${CYAN}═══════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ Configuration complete!${NC}"
echo ""
echo -e "${YELLOW}📝 Next steps:${NC}"
echo "  1. Verify all price IDs are set in SSM Parameter Store"
echo "  2. Redeploy Universal Agent Lambda to pick up new environment variables"
echo "  3. Test checkout endpoints"
echo ""
echo -e "${CYAN}To verify configuration:${NC}"
echo "  aws ssm get-parameters-by-path --path ${SSM_PREFIX} --recursive"
echo ""

