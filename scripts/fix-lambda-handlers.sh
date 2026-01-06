#!/bin/bash
# Fix Lambda handler configuration for all agents
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

ENVIRONMENT=${1:-staging}

echo -e "${PURPLE}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${PURPLE}║          🔧 FIXING LAMBDA HANDLER CONFIGURATION 🔧                ║${NC}"
echo -e "${PURPLE}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# List of all agents that need handler fix
AGENTS=(
    "storytailor-auth-agent-${ENVIRONMENT}"
    "storytailor-child-safety-agent-${ENVIRONMENT}"
    "storytailor-library-agent-${ENVIRONMENT}"
    "storytailor-commerce-agent-${ENVIRONMENT}"
    "storytailor-educational-agent-${ENVIRONMENT}"
    "storytailor-therapeutic-agent-${ENVIRONMENT}"
    "storytailor-accessibility-agent-${ENVIRONMENT}"
    "storytailor-localization-agent-${ENVIRONMENT}"
)

# Fix handler for each Lambda function
for AGENT in "${AGENTS[@]}"; do
    echo -e "${YELLOW}Fixing handler for ${AGENT}...${NC}"
    
    # Update handler configuration from index.js.handler to index.handler
    aws lambda update-function-configuration \
        --function-name "$AGENT" \
        --handler "index.handler" \
        --output text > /dev/null
    
    echo -e "${GREEN}✅ ${AGENT} handler fixed${NC}"
    
    # Wait a bit to avoid rate limiting
    sleep 1
done

echo ""
echo -e "${BLUE}🧪 Testing fixed agents...${NC}"

SUCCESS_COUNT=0
TOTAL_COUNT=${#AGENTS[@]}

for AGENT in "${AGENTS[@]}"; do
    echo -e "${YELLOW}Testing ${AGENT}...${NC}"
    
    # Wait for configuration update to complete
    aws lambda wait function-updated --function-name "$AGENT" 2>/dev/null || true
    
    # Test with health check
    TEST_RESULT=$(aws lambda invoke \
        --function-name "$AGENT" \
        --payload '{"action":"health"}' \
        --cli-binary-format raw-in-base64-out \
        /tmp/test-output.json 2>&1)
    
    if [ $? -eq 0 ]; then
        # Check if response contains healthy status
        if grep -q "healthy" /tmp/test-output.json 2>/dev/null; then
            echo -e "${GREEN}✅ ${AGENT} is healthy${NC}"
            ((SUCCESS_COUNT++))
        else
            echo -e "${YELLOW}⚠️  ${AGENT} returned response but may need initialization${NC}"
            cat /tmp/test-output.json | jq '.' 2>/dev/null || cat /tmp/test-output.json
        fi
    else
        echo -e "${RED}❌ ${AGENT} invocation failed${NC}"
    fi
    echo ""
done

# Cleanup
rm -f /tmp/test-output.json

# Summary
echo -e "${PURPLE}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${PURPLE}║                      🎯 HANDLER FIX SUMMARY 🎯                     ║${NC}"
echo -e "${PURPLE}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${CYAN}Total Agents Fixed: ${TOTAL_COUNT}${NC}"
echo -e "${GREEN}Successfully Working: ${SUCCESS_COUNT}/${TOTAL_COUNT}${NC}"
echo ""

if [ $SUCCESS_COUNT -eq $TOTAL_COUNT ]; then
    echo -e "${GREEN}🎉 All agents are now properly configured and working!${NC}"
else
    echo -e "${YELLOW}⚠️  Some agents may need additional configuration or have initialization errors.${NC}"
    echo -e "${YELLOW}This is normal if Supabase tables don't exist yet.${NC}"
fi
echo ""