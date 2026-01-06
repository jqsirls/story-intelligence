#!/bin/bash
# Verify connectivity to critical services

# ANSI color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo "=== System Connectivity Verification ==="

# 1. Load Environment
if [ -f .env.production ]; then
  source .env.production
  echo -e "${GREEN}✓ .env.production loaded${NC}"
else
  echo -e "${RED}✗ .env.production not found${NC}"
fi

# 2. Check Supabase
if [ -z "$SUPABASE_URL" ]; then
  echo -e "${RED}✗ SUPABASE_URL not set${NC}"
else
  HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$SUPABASE_URL/rest/v1/")
  if [[ "$HTTP_STATUS" =~ ^(200|401|404|403)$ ]]; then
    echo -e "${GREEN}✓ Supabase reachable ($SUPABASE_URL) - Status: $HTTP_STATUS${NC}"
  else
    echo -e "${RED}✗ Supabase unreachable ($SUPABASE_URL) - Status: $HTTP_STATUS${NC}"
  fi
fi

# 3. Check AWS API Gateway
if [ -z "$API_GATEWAY_URL" ]; then
  echo -e "${RED}✗ API_GATEWAY_URL not set${NC}"
else
  # Remove placeholders if present
  if [[ "$API_GATEWAY_URL" == *"your_production"* ]]; then
     echo -e "${RED}✗ API_GATEWAY_URL contains placeholder${NC}"
  else
     HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API_GATEWAY_URL/health")
     if [[ "$HTTP_STATUS" =~ ^(200|401|403|404)$ ]]; then
       echo -e "${GREEN}✓ API Gateway reachable ($API_GATEWAY_URL) - Status: $HTTP_STATUS${NC}"
     else
       echo -e "${RED}✗ API Gateway unreachable ($API_GATEWAY_URL) - Status: $HTTP_STATUS${NC}"
     fi
  fi
fi

# 4. Check Stripe Key Format
if [ -z "$STRIPE_SECRET_KEY" ]; then
   echo -e "${RED}✗ STRIPE_SECRET_KEY not set${NC}"
else
   if [[ "$STRIPE_SECRET_KEY" == sk_* ]]; then
      echo -e "${GREEN}✓ Stripe key format valid${NC}"
   else
      echo -e "${RED}✗ Stripe key invalid format${NC}"
   fi
fi

echo "=== Verification Complete ==="
