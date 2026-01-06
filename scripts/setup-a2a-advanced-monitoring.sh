#!/bin/bash
# Setup Advanced A2A Monitoring & Metrics
# Creates comprehensive monitoring for API key usage, request rates, and performance

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

echo -e "${BLUE}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║        📊 Advanced A2A Monitoring & Metrics Setup 📊            ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo -e "${CYAN}Environment: ${ENVIRONMENT}${NC}"
echo -e "${CYAN}Lambda: ${LAMBDA_NAME}${NC}"
echo ""

# Create metric filters for advanced monitoring

echo -e "${BLUE}📊 Creating Metric Filters...${NC}"

# 1. Request Rate per API Key
echo -e "${YELLOW}Creating filter: Request Rate per API Key...${NC}"
aws logs put-metric-filter \
    --log-group-name "$LOG_GROUP" \
    --filter-name "${LAMBDA_NAME}-a2a-request-rate" \
    --filter-pattern '{ $.path = "/a2a/*" && $.method = "*" }' \
    --metric-transformations \
        metricName=A2ARequestRate,metricNamespace=A2A,metricValue=1,defaultValue=0 \
    --region "$AWS_REGION" 2>/dev/null && \
echo -e "${GREEN}  ✅ Created: Request rate metric${NC}" || \
echo -e "${YELLOW}  ⚠️  Filter may already exist${NC}"

# 2. Authentication Success/Failure Rates
echo -e "${YELLOW}Creating filter: Authentication Success Rate...${NC}"
aws logs put-metric-filter \
    --log-group-name "$LOG_GROUP" \
    --filter-name "${LAMBDA_NAME}-a2a-auth-success" \
    --filter-pattern '{ $.path = "/a2a/*" && $.statusCode = 200 && $.method = "POST" }' \
    --metric-transformations \
        metricName=A2AAuthSuccess,metricNamespace=A2A,metricValue=1,defaultValue=0 \
    --region "$AWS_REGION" 2>/dev/null && \
echo -e "${GREEN}  ✅ Created: Auth success metric${NC}" || \
echo -e "${YELLOW}  ⚠️  Filter may already exist${NC}"

# 3. Task Completion Rates
echo -e "${YELLOW}Creating filter: Task Completion Rate...${NC}"
aws logs put-metric-filter \
    --log-group-name "$LOG_GROUP" \
    --filter-name "${LAMBDA_NAME}-a2a-task-completed" \
    --filter-pattern '{ $.message = "*task.*completed*" || $.message = "*Task.*completed*" }' \
    --metric-transformations \
        metricName=A2ATaskCompleted,metricNamespace=A2A,metricValue=1,defaultValue=0 \
    --region "$AWS_REGION" 2>/dev/null && \
echo -e "${GREEN}  ✅ Created: Task completion metric${NC}" || \
echo -e "${YELLOW}  ⚠️  Filter may already exist${NC}"

# 4. Response Time (using Lambda duration metric)
echo -e "${YELLOW}Note: Response time uses Lambda Duration metric (already available)${NC}"

# 5. API Key Usage Anomalies (using request rate)
echo -e "${YELLOW}Creating filter: API Key Usage (for anomaly detection)...${NC}"
aws logs put-metric-filter \
    --log-group-name "$LOG_GROUP" \
    --filter-name "${LAMBDA_NAME}-a2a-api-key-usage" \
    --filter-pattern '{ $.path = "/a2a/*" && $.headers.X-API-Key = "*" }' \
    --metric-transformations \
        metricName=A2AApiKeyUsage,metricNamespace=A2A,metricValue=1,defaultValue=0 \
    --region "$AWS_REGION" 2>/dev/null && \
echo -e "${GREEN}  ✅ Created: API key usage metric${NC}" || \
echo -e "${YELLOW}  ⚠️  Filter may already exist${NC}"

# Create CloudWatch Alarms

echo ""
echo -e "${BLUE}🚨 Creating CloudWatch Alarms...${NC}"

# 1. High Request Rate Alarm
echo -e "${YELLOW}Creating alarm: High Request Rate...${NC}"
aws cloudwatch put-metric-alarm \
    --alarm-name "${LAMBDA_NAME}-a2a-high-request-rate" \
    --alarm-description "Alert when A2A request rate exceeds 1000 requests per 5 minutes" \
    --metric-name "A2ARequestRate" \
    --namespace "A2A" \
    --statistic "Sum" \
    --period 300 \
    --evaluation-periods 1 \
    --threshold 1000 \
    --comparison-operator "GreaterThanThreshold" \
    --treat-missing-data "notBreaching" \
    --region "$AWS_REGION" 2>/dev/null && \
echo -e "${GREEN}  ✅ Created: High request rate alarm${NC}" || \
echo -e "${YELLOW}  ⚠️  Alarm may already exist${NC}"

# 2. Low Authentication Success Rate
echo -e "${YELLOW}Creating alarm: Low Authentication Success Rate...${NC}"
aws cloudwatch put-metric-alarm \
    --alarm-name "${LAMBDA_NAME}-a2a-low-auth-success" \
    --alarm-description "Alert when A2A authentication success rate drops below 80%" \
    --metric-name "A2AAuthSuccess" \
    --namespace "A2A" \
    --statistic "Average" \
    --period 300 \
    --evaluation-periods 2 \
    --threshold 0.8 \
    --comparison-operator "LessThanThreshold" \
    --treat-missing-data "notBreaching" \
    --region "$AWS_REGION" 2>/dev/null && \
echo -e "${GREEN}  ✅ Created: Low auth success alarm${NC}" || \
echo -e "${YELLOW}  ⚠️  Alarm may already exist${NC}"

# 3. Low Task Completion Rate
echo -e "${YELLOW}Creating alarm: Low Task Completion Rate...${NC}"
aws cloudwatch put-metric-alarm \
    --alarm-name "${LAMBDA_NAME}-a2a-low-task-completion" \
    --alarm-description "Alert when A2A task completion rate drops" \
    --metric-name "A2ATaskCompleted" \
    --namespace "A2A" \
    --statistic "Sum" \
    --period 600 \
    --evaluation-periods 2 \
    --threshold 5 \
    --comparison-operator "LessThanThreshold" \
    --treat-missing-data "notBreaching" \
    --region "$AWS_REGION" 2>/dev/null && \
echo -e "${GREEN}  ✅ Created: Low task completion alarm${NC}" || \
echo -e "${YELLOW}  ⚠️  Alarm may already exist${NC}"

# 4. High Response Time
echo -e "${YELLOW}Creating alarm: High Response Time...${NC}"
aws cloudwatch put-metric-alarm \
    --alarm-name "${LAMBDA_NAME}-a2a-high-response-time" \
    --alarm-description "Alert when A2A endpoint response time exceeds 5 seconds" \
    --metric-name "Duration" \
    --namespace "AWS/Lambda" \
    --statistic "Average" \
    --dimensions "Name=FunctionName,Value=${LAMBDA_NAME}" \
    --period 300 \
    --evaluation-periods 2 \
    --threshold 5000 \
    --comparison-operator "GreaterThanThreshold" \
    --treat-missing-data "notBreaching" \
    --region "$AWS_REGION" 2>/dev/null && \
echo -e "${GREEN}  ✅ Created: High response time alarm${NC}" || \
echo -e "${YELLOW}  ⚠️  Alarm may already exist${NC}"

# Create Log Insights Queries file
echo ""
echo -e "${BLUE}📝 Creating Log Insights Queries...${NC}"

INSIGHTS_FILE="docs/platform/a2a/log-insights-queries.md"
mkdir -p "$(dirname "$INSIGHTS_FILE")"

cat > "$INSIGHTS_FILE" << 'EOF'
# A2A Log Insights Queries

## Failed Authentication Attempts

```sql
fields @timestamp, @message
| filter @message like /Authentication failed/ and @message like /a2a/
| sort @timestamp desc
| limit 100
```

## Task State Transitions

```sql
fields @timestamp, @message
| filter @message like /task.*state/ or @message like /Task.*state/
| parse @message /state[:\s]+(?<state>\w+)/ 
| stats count() by state
| sort count desc
```

## Router Integration Errors

```sql
fields @timestamp, @message, @logStream
| filter @message like /Router.*error/ or @message like /router.*error/
| sort @timestamp desc
| limit 50
```

## Request Rate per API Key

```sql
fields @timestamp, @message
| filter @message like /a2a/ and @message like /X-API-Key/
| parse @message /X-API-Key[:\s]+(?<apiKey>[^\s,}]+)/
| stats count() by apiKey
| sort count desc
```

## Authentication Success/Failure Rates

```sql
fields @timestamp, @message, statusCode
| filter @message like /a2a/ and (statusCode = 200 or statusCode = 401 or statusCode = 403)
| stats count() by statusCode
```

## Task Completion Rates

```sql
fields @timestamp, @message
| filter @message like /task.*completed/ or @message like /Task.*completed/
| stats count() by bin(5m)
| sort @timestamp desc
```

## Response Times for A2A Endpoints

```sql
fields @timestamp, @duration, @message
| filter @message like /a2a/
| stats avg(@duration), max(@duration), min(@duration) by bin(5m)
| sort @timestamp desc
```

## API Key Usage Anomalies

```sql
fields @timestamp, @message
| filter @message like /a2a/ and @message like /X-API-Key/
| parse @message /X-API-Key[:\s]+(?<apiKey>[^\s,}]+)/
| stats count() by apiKey, bin(1h)
| sort count desc
```

## Error Rate by Endpoint

```sql
fields @timestamp, @message, path
| filter @message like /a2a/ and (statusCode >= 400)
| parse @message /path[:\s"']+(?<path>[^"'\s}]+)/
| stats count() by path
| sort count desc
```

## Top Error Messages

```sql
fields @timestamp, @message, error
| filter @message like /a2a/ and error != ""
| stats count() by error
| sort count desc
| limit 20
```
EOF

echo -e "${GREEN}  ✅ Created: ${INSIGHTS_FILE}${NC}"

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║          ✅ Advanced Monitoring Setup Complete! ✅              ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${CYAN}Created Metric Filters:${NC}"
echo -e "  • Request Rate"
echo -e "  • Authentication Success"
echo -e "  • Task Completion"
echo -e "  • API Key Usage"
echo ""
echo -e "${CYAN}Created CloudWatch Alarms:${NC}"
echo -e "  • High Request Rate (>1000/5min)"
echo -e "  • Low Authentication Success (<80%)"
echo -e "  • Low Task Completion"
echo -e "  • High Response Time (>5s)"
echo ""
echo -e "${CYAN}Log Insights Queries:${NC}"
echo -e "  • Saved to: ${INSIGHTS_FILE}"
echo ""
echo -e "${CYAN}View all alarms:${NC}"
echo -e "  ${YELLOW}aws cloudwatch describe-alarms --alarm-name-prefix ${LAMBDA_NAME}-a2a --region ${AWS_REGION}${NC}"
echo ""
