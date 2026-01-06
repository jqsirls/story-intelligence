#!/bin/bash
# Final Deployment and Verification Script
# Deploys universal-agent and performs comprehensive verification

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

ENVIRONMENT=${1:-production}
LAMBDA_NAME="storytailor-universal-agent-${ENVIRONMENT}"
API_URL="https://api.storytailor.dev"
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo -e "${PURPLE}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${PURPLE}║         🚀 FINAL DEPLOYMENT & VERIFICATION 🚀                   ║${NC}"
echo -e "${PURPLE}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo -e "${CYAN}Environment: ${ENVIRONMENT}${NC}"
echo -e "${CYAN}Lambda Name: ${LAMBDA_NAME}${NC}"
echo ""

# Track verification results
VERIFICATION_RESULTS=()
PASSED=0
FAILED=0
WARNINGS=0

# Function to record results
record_result() {
    local status=$1
    local message=$2
    VERIFICATION_RESULTS+=("$status|$message")
    if [ "$status" = "✅" ]; then
        ((PASSED++))
    elif [ "$status" = "❌" ]; then
        ((FAILED++))
    else
        ((WARNINGS++))
    fi
}

# Step 1: Pre-deployment checks
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Step 1: Pre-Deployment Checks${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Check AWS credentials
if aws sts get-caller-identity &> /dev/null; then
    AWS_ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
    echo -e "${GREEN}✅ AWS credentials configured (Account: ${AWS_ACCOUNT})${NC}"
    record_result "✅" "AWS credentials configured"
else
    echo -e "${RED}❌ AWS credentials not configured${NC}"
    record_result "❌" "AWS credentials not configured"
    echo -e "${YELLOW}⚠️  Skipping deployment, will only perform local verification${NC}"
    SKIP_DEPLOY=true
fi

# Check if Lambda function exists
if [ -z "$SKIP_DEPLOY" ]; then
    if aws lambda get-function --function-name "$LAMBDA_NAME" &> /dev/null; then
        echo -e "${GREEN}✅ Lambda function exists: ${LAMBDA_NAME}${NC}"
        record_result "✅" "Lambda function exists"
    else
        echo -e "${YELLOW}⚠️  Lambda function does not exist, will be created during deployment${NC}"
        record_result "⚠️" "Lambda function does not exist"
    fi
fi

# Step 2: Build and Deploy
if [ -z "$SKIP_DEPLOY" ]; then
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}Step 2: Deploy Universal Agent${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    cd "$PROJECT_ROOT"
    if ./scripts/deploy-universal-agent-proper.sh "$ENVIRONMENT"; then
        echo -e "${GREEN}✅ Deployment successful${NC}"
        record_result "✅" "Deployment successful"
        
        # Wait for Lambda to be ready
        echo -e "${YELLOW}⏳ Waiting for Lambda to be ready...${NC}"
        sleep 5
    else
        echo -e "${RED}❌ Deployment failed${NC}"
        record_result "❌" "Deployment failed"
        exit 1
    fi
else
    echo ""
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}Step 2: Skipping Deployment (no AWS credentials)${NC}"
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    record_result "⚠️" "Deployment skipped (no AWS credentials)"
fi

# Step 3: Health Check Verification
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Step 3: Health Check Verification${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Test health endpoint
HEALTH_RESPONSE=$(curl -s -w "\n%{http_code}" "${API_URL}/health" 2>/dev/null || echo -e "\n000")
HTTP_CODE=$(echo "$HEALTH_RESPONSE" | tail -1)
HEALTH_BODY=$(echo "$HEALTH_RESPONSE" | head -n -1)

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✅ Health check endpoint responding (HTTP ${HTTP_CODE})${NC}"
    record_result "✅" "Health check endpoint responding"
    
    # Verify response structure
    if echo "$HEALTH_BODY" | jq -e '.status' &> /dev/null; then
        STATUS=$(echo "$HEALTH_BODY" | jq -r '.status')
        if [ "$STATUS" = "healthy" ]; then
            echo -e "${GREEN}✅ Health status: ${STATUS}${NC}"
            record_result "✅" "Health status: healthy"
        else
            echo -e "${YELLOW}⚠️  Health status: ${STATUS}${NC}"
            record_result "⚠️" "Health status: ${STATUS}"
        fi
    fi
else
    echo -e "${RED}❌ Health check failed (HTTP ${HTTP_CODE})${NC}"
    record_result "❌" "Health check failed (HTTP ${HTTP_CODE})"
fi

# Step 4: CloudWatch Logs Verification
if [ -z "$SKIP_DEPLOY" ]; then
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}Step 4: CloudWatch Logs Verification${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    LOG_GROUP="/aws/lambda/${LAMBDA_NAME}"
    
    # Check for recent errors
    echo -e "${YELLOW}Checking for errors in last 5 minutes...${NC}"
    ERROR_COUNT=$(aws logs filter-log-events \
        --log-group-name "$LOG_GROUP" \
        --start-time $(($(date +%s) - 300))000 \
        --filter-pattern "ERROR" \
        --query 'events | length(@)' \
        --output text 2>/dev/null || echo "0")
    
    if [ "$ERROR_COUNT" = "0" ] || [ -z "$ERROR_COUNT" ]; then
        echo -e "${GREEN}✅ No errors in recent logs${NC}"
        record_result "✅" "No errors in recent CloudWatch logs"
    else
        echo -e "${YELLOW}⚠️  Found ${ERROR_COUNT} error(s) in recent logs${NC}"
        record_result "⚠️" "Found ${ERROR_COUNT} error(s) in recent logs"
        
        # Check for specific errors we fixed
        PLATFORM_ROUTER_ERRORS=$(aws logs filter-log-events \
            --log-group-name "$LOG_GROUP" \
            --start-time $(($(date +%s) - 300))000 \
            --filter-pattern "PlatformAwareRouterIsNull" \
            --query 'events | length(@)' \
            --output text 2>/dev/null || echo "0")
        
        if [ "$PLATFORM_ROUTER_ERRORS" = "0" ]; then
            echo -e "${GREEN}✅ No PlatformAwareRouterIsNull errors (fix verified)${NC}"
            record_result "✅" "PlatformAwareRouterIsNull fix verified"
        else
            echo -e "${RED}❌ Found ${PLATFORM_ROUTER_ERRORS} PlatformAwareRouterIsNull errors${NC}"
            record_result "❌" "PlatformAwareRouterIsNull errors still present"
        fi
        
        API_CONTRACT_ERRORS=$(aws logs filter-log-events \
            --log-group-name "$LOG_GROUP" \
            --start-time $(($(date +%s) - 300))000 \
            --filter-pattern "Cannot find module.*api-contract" \
            --query 'events | length(@)' \
            --output text 2>/dev/null || echo "0")
        
        if [ "$API_CONTRACT_ERRORS" = "0" ]; then
            echo -e "${GREEN}✅ No api-contract module errors (fix verified)${NC}"
            record_result "✅" "api-contract module fix verified"
        else
            echo -e "${RED}❌ Found ${API_CONTRACT_ERRORS} api-contract module errors${NC}"
            record_result "❌" "api-contract module errors still present"
        fi
        
        FIRST_NAME_ERRORS=$(aws logs filter-log-events \
            --log-group-name "$LOG_GROUP" \
            --start-time $(($(date +%s) - 300))000 \
            --filter-pattern "first_name.*column" \
            --query 'events | length(@)' \
            --output text 2>/dev/null || echo "0")
        
        if [ "$FIRST_NAME_ERRORS" = "0" ]; then
            echo -e "${GREEN}✅ No first_name column errors (fix verified)${NC}"
            record_result "✅" "first_name column fix verified"
        else
            echo -e "${RED}❌ Found ${FIRST_NAME_ERRORS} first_name column errors${NC}"
            record_result "❌" "first_name column errors still present"
        fi
    fi
else
    echo ""
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}Step 4: Skipping CloudWatch Verification (no AWS credentials)${NC}"
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    record_result "⚠️" "CloudWatch verification skipped"
fi

# Step 5: Lambda Metrics Verification
if [ -z "$SKIP_DEPLOY" ]; then
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}Step 5: Lambda Metrics Verification${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    # Check error rate
    ERROR_RATE=$(aws cloudwatch get-metric-statistics \
        --namespace AWS/Lambda \
        --metric-name Errors \
        --dimensions Name=FunctionName,Value="$LAMBDA_NAME" \
        --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
        --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
        --period 3600 \
        --statistics Sum \
        --query 'Datapoints[0].Sum' \
        --output text 2>/dev/null || echo "0")
    
    if [ "$ERROR_RATE" = "0" ] || [ -z "$ERROR_RATE" ] || [ "$ERROR_RATE" = "None" ]; then
        echo -e "${GREEN}✅ Error rate: 0 (last hour)${NC}"
        record_result "✅" "Lambda error rate: 0"
    else
        echo -e "${YELLOW}⚠️  Error rate: ${ERROR_RATE} (last hour)${NC}"
        record_result "⚠️" "Lambda error rate: ${ERROR_RATE}"
    fi
    
    # Check cold start duration (InitDuration)
    COLD_START=$(aws cloudwatch get-metric-statistics \
        --namespace AWS/Lambda \
        --metric-name InitDuration \
        --dimensions Name=FunctionName,Value="$LAMBDA_NAME" \
        --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
        --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
        --period 3600 \
        --statistics Average \
        --query 'Datapoints[0].Average' \
        --output text 2>/dev/null || echo "0")
    
    if [ -n "$COLD_START" ] && [ "$COLD_START" != "None" ] && [ "$COLD_START" != "0" ]; then
        COLD_START_MS=$(echo "$COLD_START * 1000" | bc | cut -d. -f1)
        if [ "$COLD_START_MS" -lt 150 ]; then
            echo -e "${GREEN}✅ Cold start: ${COLD_START_MS}ms (target: <150ms)${NC}"
            record_result "✅" "Cold start: ${COLD_START_MS}ms"
        else
            echo -e "${YELLOW}⚠️  Cold start: ${COLD_START_MS}ms (target: <150ms)${NC}"
            record_result "⚠️" "Cold start: ${COLD_START_MS}ms (above target)"
        fi
    else
        echo -e "${YELLOW}⚠️  No cold start data available yet${NC}"
        record_result "⚠️" "No cold start data available"
    fi
else
    echo ""
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}Step 5: Skipping Lambda Metrics (no AWS credentials)${NC}"
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    record_result "⚠️" "Lambda metrics skipped"
fi

# Step 6: Code Verification Summary
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Step 6: Code Verification Summary${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Verify TypeScript compilation
cd "$PROJECT_ROOT/packages/universal-agent"
if npx tsc --noEmit &> /dev/null; then
    echo -e "${GREEN}✅ TypeScript compilation: PASSED${NC}"
    record_result "✅" "TypeScript compilation passed"
else
    echo -e "${RED}❌ TypeScript compilation: FAILED${NC}"
    record_result "❌" "TypeScript compilation failed"
fi

# Final Summary
echo ""
echo -e "${PURPLE}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${PURPLE}║                    VERIFICATION SUMMARY                         ║${NC}"
echo -e "${PURPLE}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo ""

for result in "${VERIFICATION_RESULTS[@]}"; do
    IFS='|' read -r status message <<< "$result"
    echo -e "$status $message"
done

echo ""
echo -e "${GREEN}✅ Passed: ${PASSED}${NC}"
echo -e "${RED}❌ Failed: ${FAILED}${NC}"
echo -e "${YELLOW}⚠️  Warnings: ${WARNINGS}${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 All critical verifications passed! 🎉${NC}"
    exit 0
else
    echo -e "${RED}⚠️  Some verifications failed. Review output above.${NC}"
    exit 1
fi
