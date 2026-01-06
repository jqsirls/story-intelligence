#!/bin/bash
# Setup A2A CloudWatch Monitoring & Alarms
# Creates alarms for A2A endpoint monitoring

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
SNS_TOPIC_ARN=${SNS_TOPIC_ARN:-""} # Optional: SNS topic for alarm notifications

echo -e "${BLUE}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║         📊 A2A CloudWatch Monitoring Setup 📊                  ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo -e "${CYAN}Environment: ${ENVIRONMENT}${NC}"
echo -e "${CYAN}Lambda: ${LAMBDA_NAME}${NC}"
echo -e "${CYAN}Log Group: ${LOG_GROUP}${NC}"
echo ""

# Validate environment
if [[ "$ENVIRONMENT" != "staging" && "$ENVIRONMENT" != "production" ]]; then
    echo -e "${RED}❌ Invalid environment: $ENVIRONMENT${NC}"
    echo -e "${YELLOW}Usage: $0 [staging|production] [sns-topic-arn]${NC}"
    exit 1
fi

# Check if SNS topic provided
if [ -n "$2" ]; then
    SNS_TOPIC_ARN="$2"
    echo -e "${GREEN}✅ SNS Topic: ${SNS_TOPIC_ARN}${NC}"
else
    echo -e "${YELLOW}⚠️  No SNS topic provided - alarms will be created without notifications${NC}"
    echo -e "${YELLOW}   To add notifications later, update alarms with:${NC}"
    echo -e "${CYAN}   aws cloudwatch put-metric-alarm --alarm-actions ${SNS_TOPIC_ARN}${NC}"
fi

# Verify log group exists
if ! aws logs describe-log-groups --log-group-name-prefix "$LOG_GROUP" --region "$AWS_REGION" --query "logGroups[?logGroupName=='${LOG_GROUP}']" --output text | grep -q "$LOG_GROUP"; then
    echo -e "${YELLOW}⚠️  Log group ${LOG_GROUP} not found - it will be created on first Lambda invocation${NC}"
fi

echo -e "${BLUE}📊 Creating CloudWatch Alarms...${NC}"

# 1. A2A Authentication Failures Alarm
echo -e "${YELLOW}Creating alarm: A2A Authentication Failures...${NC}"
ALARM_NAME="${LAMBDA_NAME}-a2a-auth-failures"
ALARM_ACTIONS=""
if [ -n "$SNS_TOPIC_ARN" ]; then
    ALARM_ACTIONS="--alarm-actions ${SNS_TOPIC_ARN} --ok-actions ${SNS_TOPIC_ARN}"
fi

aws cloudwatch put-metric-alarm \
    --alarm-name "$ALARM_NAME" \
    --alarm-description "Alert when A2A authentication failures exceed threshold" \
    --metric-name "AuthenticationFailures" \
    --namespace "A2A" \
    --statistic "Sum" \
    --period 300 \
    --evaluation-periods 1 \
    --threshold 10 \
    --comparison-operator "GreaterThanThreshold" \
    --treat-missing-data "notBreaching" \
    --region "$AWS_REGION" \
    $ALARM_ACTIONS 2>/dev/null || \
    
# Use log-based metric filter instead
aws logs put-metric-filter \
    --log-group-name "$LOG_GROUP" \
    --filter-name "${LAMBDA_NAME}-a2a-auth-failures" \
    --filter-pattern '{ $.error = "*Authentication failed*" && $.path = "/a2a/*" }' \
    --metric-transformations \
        metricName=A2AAuthFailures,metricNamespace=A2A,metricValue=1,defaultValue=0 \
    --region "$AWS_REGION" 2>/dev/null || echo -e "${YELLOW}  ⚠️  Metric filter may already exist${NC}"

# Create alarm based on log metric
aws cloudwatch put-metric-alarm \
    --alarm-name "$ALARM_NAME" \
    --alarm-description "Alert when A2A authentication failures exceed 10 in 5 minutes" \
    --metric-name "A2AAuthFailures" \
    --namespace "A2A" \
    --statistic "Sum" \
    --period 300 \
    --evaluation-periods 1 \
    --threshold 10 \
    --comparison-operator "GreaterThanThreshold" \
    --treat-missing-data "notBreaching" \
    --region "$AWS_REGION" \
    $ALARM_ACTIONS 2>/dev/null && echo -e "${GREEN}  ✅ Created: ${ALARM_NAME}${NC}" || echo -e "${YELLOW}  ⚠️  Alarm may already exist${NC}"

# 2. A2A Endpoint 5xx Errors
echo -e "${YELLOW}Creating alarm: A2A Endpoint 5xx Errors...${NC}"
ALARM_NAME="${LAMBDA_NAME}-a2a-5xx-errors"

aws logs put-metric-filter \
    --log-group-name "$LOG_GROUP" \
    --filter-name "${LAMBDA_NAME}-a2a-5xx-errors" \
    --filter-pattern '{ $.statusCode >= 500 && $.path = "/a2a/*" }' \
    --metric-transformations \
        metricName=A2A5xxErrors,metricNamespace=A2A,metricValue=1,defaultValue=0 \
    --region "$AWS_REGION" 2>/dev/null || echo -e "${YELLOW}  ⚠️  Metric filter may already exist${NC}"

aws cloudwatch put-metric-alarm \
    --alarm-name "$ALARM_NAME" \
    --alarm-description "Alert when A2A endpoints return 5xx errors" \
    --metric-name "A2A5xxErrors" \
    --namespace "A2A" \
    --statistic "Sum" \
    --period 300 \
    --evaluation-periods 1 \
    --threshold 5 \
    --comparison-operator "GreaterThanThreshold" \
    --treat-missing-data "notBreaching" \
    --region "$AWS_REGION" \
    $ALARM_ACTIONS 2>/dev/null && echo -e "${GREEN}  ✅ Created: ${ALARM_NAME}${NC}" || echo -e "${YELLOW}  ⚠️  Alarm may already exist${NC}"

# 3. Task Creation Failures
echo -e "${YELLOW}Creating alarm: A2A Task Creation Failures...${NC}"
ALARM_NAME="${LAMBDA_NAME}-a2a-task-failures"

aws logs put-metric-filter \
    --log-group-name "$LOG_GROUP" \
    --filter-name "${LAMBDA_NAME}-a2a-task-failures" \
    --filter-pattern '{ $.error = "*Failed to create task*" && $.path = "/a2a/task" }' \
    --metric-transformations \
        metricName=A2ATaskFailures,metricNamespace=A2A,metricValue=1,defaultValue=0 \
    --region "$AWS_REGION" 2>/dev/null || echo -e "${YELLOW}  ⚠️  Metric filter may already exist${NC}"

aws cloudwatch put-metric-alarm \
    --alarm-name "$ALARM_NAME" \
    --alarm-description "Alert when A2A task creation fails" \
    --metric-name "A2ATaskFailures" \
    --namespace "A2A" \
    --statistic "Sum" \
    --period 300 \
    --evaluation-periods 1 \
    --threshold 5 \
    --comparison-operator "GreaterThanThreshold" \
    --treat-missing-data "notBreaching" \
    --region "$AWS_REGION" \
    $ALARM_ACTIONS 2>/dev/null && echo -e "${GREEN}  ✅ Created: ${ALARM_NAME}${NC}" || echo -e "${YELLOW}  ⚠️  Alarm may already exist${NC}"

# 4. Router Integration Errors
echo -e "${YELLOW}Creating alarm: Router Integration Errors...${NC}"
ALARM_NAME="${LAMBDA_NAME}-a2a-router-errors"

aws logs put-metric-filter \
    --log-group-name "$LOG_GROUP" \
    --filter-name "${LAMBDA_NAME}-a2a-router-errors" \
    --filter-pattern '{ ($.error = "*Router not available*" || $.error = "*Router integration*") && $.path = "/a2a/*" }' \
    --metric-transformations \
        metricName=A2ARouterErrors,metricNamespace=A2A,metricValue=1,defaultValue=0 \
    --region "$AWS_REGION" 2>/dev/null || echo -e "${YELLOW}  ⚠️  Metric filter may already exist${NC}"

aws cloudwatch put-metric-alarm \
    --alarm-name "$ALARM_NAME" \
    --alarm-description "Alert when A2A router integration errors occur" \
    --metric-name "A2ARouterErrors" \
    --namespace "A2A" \
    --statistic "Sum" \
    --period 300 \
    --evaluation-periods 1 \
    --threshold 5 \
    --comparison-operator "GreaterThanThreshold" \
    --treat-missing-data "notBreaching" \
    --region "$AWS_REGION" \
    $ALARM_ACTIONS 2>/dev/null && echo -e "${GREEN}  ✅ Created: ${ALARM_NAME}${NC}" || echo -e "${YELLOW}  ⚠️  Alarm may already exist${NC}"

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                  ✅ Monitoring Setup Complete! ✅               ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${CYAN}Created Alarms:${NC}"
echo -e "  • ${LAMBDA_NAME}-a2a-auth-failures"
echo -e "  • ${LAMBDA_NAME}-a2a-5xx-errors"
echo -e "  • ${LAMBDA_NAME}-a2a-task-failures"
echo -e "  • ${LAMBDA_NAME}-a2a-router-errors"
echo ""
echo -e "${CYAN}View alarms:${NC}"
echo -e "  ${YELLOW}aws cloudwatch describe-alarms --alarm-name-prefix ${LAMBDA_NAME}-a2a --region ${AWS_REGION}${NC}"
echo ""
echo -e "${CYAN}Log Insights Queries:${NC}"
echo -e "  • Failed authentication: ${YELLOW}fields @timestamp, @message | filter @message like /Authentication failed/ and @message like /a2a/${NC}"
echo -e "  • Task transitions: ${YELLOW}fields @timestamp, @message | filter @message like /task.*state/${NC}"
echo -e "  • Router errors: ${YELLOW}fields @timestamp, @message | filter @message like /Router.*error/${NC}"
echo ""
