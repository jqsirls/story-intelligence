#!/bin/bash
# Monitor Supabase Connection Issues
# Checks logs, tests connectivity, and provides troubleshooting steps

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Environment setup
ENVIRONMENT=${1:-production}
LAMBDA_NAME="storytailor-universal-agent-${ENVIRONMENT}"
LOG_GROUP="/aws/lambda/${LAMBDA_NAME}"
AWS_REGION=${AWS_REGION:-us-east-1}
PREFIX="/storytailor-${ENVIRONMENT}"

echo -e "${BLUE}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║         🔍 Supabase Connection Monitoring & Diagnostics 🔍     ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo -e "${CYAN}Environment: ${ENVIRONMENT}${NC}"
echo -e "${CYAN}Lambda: ${LAMBDA_NAME}${NC}"
echo ""

# Get Supabase configuration from SSM
echo -e "${BLUE}📋 Checking Supabase Configuration...${NC}"
SUPABASE_URL=$(aws ssm get-parameter \
    --name "${PREFIX}/supabase/url" \
    --region "$AWS_REGION" \
    --query 'Parameter.Value' \
    --output text 2>/dev/null || \
    aws ssm get-parameter \
    --name "${PREFIX}/supabase-url" \
    --region "$AWS_REGION" \
    --query 'Parameter.Value' \
    --output text 2>/dev/null || echo "")

if [ -z "$SUPABASE_URL" ]; then
    echo -e "${RED}❌ Supabase URL not found in SSM Parameter Store${NC}"
    echo -e "${YELLOW}   Checked: ${PREFIX}/supabase/url and ${PREFIX}/supabase-url${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Supabase URL: ${SUPABASE_URL}${NC}"

# Check for connection errors in logs
echo ""
echo -e "${BLUE}📊 Analyzing Recent Logs (last 1 hour)...${NC}"
CONNECTION_ERRORS=$(aws logs filter-log-events \
    --log-group-name "$LOG_GROUP" \
    --start-time $(($(date +%s) - 3600))000 \
    --filter-pattern "supabase connection failed OR fetch failed OR TypeError: fetch failed" \
    --region "$AWS_REGION" \
    --query 'events[*].message' \
    --output text 2>/dev/null || echo "")

if [ -n "$CONNECTION_ERRORS" ]; then
    ERROR_COUNT=$(echo "$CONNECTION_ERRORS" | wc -l | tr -d ' ')
    echo -e "${YELLOW}⚠️  Found ${ERROR_COUNT} connection error(s) in last hour${NC}"
    echo ""
    echo -e "${CYAN}Recent errors:${NC}"
    echo "$CONNECTION_ERRORS" | head -5 | while read -r line; do
        echo -e "${YELLOW}  • ${line}${NC}"
    done
else
    echo -e "${GREEN}✅ No connection errors found in recent logs${NC}"
fi

# Check Lambda VPC configuration
echo ""
echo -e "${BLUE}🔍 Checking Lambda Network Configuration...${NC}"
VPC_CONFIG=$(aws lambda get-function-configuration \
    --function-name "$LAMBDA_NAME" \
    --region "$AWS_REGION" \
    --query 'VpcConfig.{VpcId:VpcId,SubnetIds:SubnetIds,SecurityGroupIds:SecurityGroupIds}' \
    --output json 2>/dev/null || echo '{}')

VPC_ID=$(echo "$VPC_CONFIG" | jq -r '.VpcId // empty' 2>/dev/null || echo "")

if [ -n "$VPC_ID" ] && [ "$VPC_ID" != "null" ] && [ "$VPC_ID" != "" ]; then
    echo -e "${YELLOW}⚠️  Lambda is in VPC: ${VPC_ID}${NC}"
    echo -e "${CYAN}  Subnets: $(echo "$VPC_CONFIG" | jq -r '.SubnetIds | join(", ")' 2>/dev/null || echo 'unknown')${NC}"
    echo -e "${CYAN}  Security Groups: $(echo "$VPC_CONFIG" | jq -r '.SecurityGroupIds | join(", ")' 2>/dev/null || echo 'unknown')${NC}"
    echo ""
    echo -e "${YELLOW}⚠️  VPC Configuration Check:${NC}"
    echo -e "${CYAN}  1. Verify security groups allow outbound HTTPS (port 443)${NC}"
    echo -e "${CYAN}  2. Verify NAT Gateway or VPC endpoint for internet access${NC}"
    echo -e "${CYAN}  3. Check route tables for proper internet routing${NC}"
else
    echo -e "${GREEN}✅ Lambda is not in VPC (has direct internet access)${NC}"
fi

# Test Supabase connectivity (from local machine)
echo ""
echo -e "${BLUE}🌐 Testing Supabase Connectivity...${NC}"
if curl -s --max-time 5 "${SUPABASE_URL}/rest/v1/" -o /dev/null 2>&1; then
    echo -e "${GREEN}✅ Supabase URL is reachable from this machine${NC}"
else
    echo -e "${YELLOW}⚠️  Supabase URL may not be reachable (could be network/firewall issue)${NC}"
fi

# Check Supabase credentials
echo ""
echo -e "${BLUE}🔐 Checking Supabase Credentials...${NC}"
SUPABASE_KEY=$(aws ssm get-parameter \
    --name "${PREFIX}/supabase/service-key" \
    --region "$AWS_REGION" \
    --with-decryption \
    --query 'Parameter.Value' \
    --output text 2>/dev/null || \
    aws ssm get-parameter \
    --name "${PREFIX}/supabase-service-key" \
    --region "$AWS_REGION" \
    --with-decryption \
    --query 'Parameter.Value' \
    --output text 2>/dev/null || echo "")

if [ -n "$SUPABASE_KEY" ]; then
    KEY_LENGTH=${#SUPABASE_KEY}
    echo -e "${GREEN}✅ Supabase service key found (length: ${KEY_LENGTH} chars)${NC}"
else
    echo -e "${RED}❌ Supabase service key not found in SSM${NC}"
fi

# Create CloudWatch metric filter for Supabase errors
echo ""
echo -e "${BLUE}📊 Setting up CloudWatch Monitoring...${NC}"
FILTER_NAME="${LAMBDA_NAME}-supabase-connection-errors"

aws logs put-metric-filter \
    --log-group-name "$LOG_GROUP" \
    --filter-name "$FILTER_NAME" \
    --filter-pattern '{ ($.error = "*Supabase connection failed*" || $.error = "*fetch failed*" || $.error = "*TypeError: fetch failed*") && $.service = "universal-agent" }' \
    --metric-transformations \
        metricName=SupabaseConnectionErrors,metricNamespace=A2A,metricValue=1,defaultValue=0 \
    --region "$AWS_REGION" 2>/dev/null && \
echo -e "${GREEN}  ✅ Created metric filter: ${FILTER_NAME}${NC}" || \
echo -e "${YELLOW}  ⚠️  Metric filter may already exist${NC}"

# Create CloudWatch alarm
ALARM_NAME="${LAMBDA_NAME}-supabase-connection-errors"
aws cloudwatch put-metric-alarm \
    --alarm-name "$ALARM_NAME" \
    --alarm-description "Alert when Supabase connection errors exceed threshold" \
    --metric-name "SupabaseConnectionErrors" \
    --namespace "A2A" \
    --statistic "Sum" \
    --period 300 \
    --evaluation-periods 2 \
    --threshold 5 \
    --comparison-operator "GreaterThanThreshold" \
    --treat-missing-data "notBreaching" \
    --region "$AWS_REGION" 2>/dev/null && \
echo -e "${GREEN}  ✅ Created alarm: ${ALARM_NAME}${NC}" || \
echo -e "${YELLOW}  ⚠️  Alarm may already exist${NC}"

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║              ✅ Monitoring Setup Complete! ✅                   ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${CYAN}Troubleshooting Steps:${NC}"
echo ""
if [ -n "$VPC_ID" ] && [ "$VPC_ID" != "null" ] && [ "$VPC_ID" != "" ]; then
    echo -e "${YELLOW}If Lambda is in VPC:${NC}"
    echo -e "  1. Check security group outbound rules allow HTTPS (port 443)"
    echo -e "  2. Verify NAT Gateway or VPC endpoint is configured"
    echo -e "  3. Check route tables for internet gateway routing"
    echo -e "  4. Test connectivity from Lambda execution environment"
    echo ""
fi
echo -e "${CYAN}General Checks:${NC}"
echo -e "  1. Verify Supabase URL is correct: ${SUPABASE_URL}"
echo -e "  2. Check Supabase service status"
echo -e "  3. Verify credentials are valid"
echo -e "  4. Check CloudWatch logs for specific error messages"
echo ""
echo -e "${CYAN}View Recent Errors:${NC}"
echo -e "  ${YELLOW}aws logs tail ${LOG_GROUP} --since 1h --region ${AWS_REGION} --format short | grep -i supabase${NC}"
echo ""
