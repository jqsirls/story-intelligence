#!/bin/bash

# Setup Monitoring Infrastructure for Storytailor Multi-Agent System
# This script creates CloudWatch dashboards, alarms, and log groups

set -e

echo "🚀 Setting up Monitoring Infrastructure"
echo "======================================"

# Configuration
ENVIRONMENT="${1:-staging}"
REGION="${AWS_REGION:-us-east-1}"
NAMESPACE="Storytailor"
SNS_TOPIC_NAME="storytailor-alerts-${ENVIRONMENT}"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Function to create SNS topic for alerts
create_sns_topic() {
    echo -e "${YELLOW}Creating SNS topic for alerts...${NC}"
    
    # Create topic
    TOPIC_ARN=$(aws sns create-topic \
        --name "$SNS_TOPIC_NAME" \
        --region "$REGION" \
        --query 'TopicArn' \
        --output text)
    
    echo "SNS Topic ARN: $TOPIC_ARN"
    
    # Add email subscription if provided
    if [ -n "$ALERT_EMAIL" ]; then
        aws sns subscribe \
            --topic-arn "$TOPIC_ARN" \
            --protocol email \
            --notification-endpoint "$ALERT_EMAIL" \
            --region "$REGION"
        
        echo -e "${GREEN}✅ Email subscription added for: $ALERT_EMAIL${NC}"
    fi
    
    # Store in SSM for agent access
    aws ssm put-parameter \
        --name "/storytailor/${ENVIRONMENT}/monitoring/sns-topic-arn" \
        --value "$TOPIC_ARN" \
        --type String \
        --overwrite \
        --region "$REGION" || true
}

# Function to create CloudWatch log groups
create_log_groups() {
    echo -e "${YELLOW}Creating CloudWatch log groups...${NC}"
    
    # List of agents
    AGENTS=(
        "router"
        "auth-agent"
        "content-agent"
        "child-safety-agent"
        "commerce-agent"
        "library-agent"
        "educational-agent"
        "therapeutic-agent"
        "accessibility-agent"
        "localization-agent"
        "smart-home-agent"
        "voice-synthesis-agent"
        "security-framework"
        "analytics-intelligence"
        "conversation-intelligence"
        "insights-agent"
        "knowledge-base"
        "emotion-agent"
        "personality-agent"
    )
    
    for agent in "${AGENTS[@]}"; do
        LOG_GROUP="/aws/lambda/storytailor-${agent}-${ENVIRONMENT}"
        
        # Create log group
        aws logs create-log-group \
            --log-group-name "$LOG_GROUP" \
            --region "$REGION" 2>/dev/null || true
        
        # Set retention policy (30 days)
        aws logs put-retention-policy \
            --log-group-name "$LOG_GROUP" \
            --retention-in-days 30 \
            --region "$REGION"
        
        echo "  ✓ Created log group: $LOG_GROUP"
    done
    
    echo -e "${GREEN}✅ Log groups created${NC}"
}

# Function to create metric filters
create_metric_filters() {
    echo -e "${YELLOW}Creating metric filters...${NC}"
    
    # Error rate filter
    aws logs put-metric-filter \
        --log-group-name "/aws/lambda/storytailor-router-${ENVIRONMENT}" \
        --filter-name "ErrorRate" \
        --filter-pattern '[timestamp, request_id, level="ERROR", ...]' \
        --metric-transformations \
            metricName=ErrorCount,metricNamespace=$NAMESPACE,metricValue=1 \
        --region "$REGION" || true
    
    # Latency filter
    aws logs put-metric-filter \
        --log-group-name "/aws/lambda/storytailor-router-${ENVIRONMENT}" \
        --filter-name "HighLatency" \
        --filter-pattern '[timestamp, request_id, level, message, duration > 1000]' \
        --metric-transformations \
            metricName=HighLatencyCount,metricNamespace=$NAMESPACE,metricValue=1 \
        --region "$REGION" || true
    
    # Child safety interventions
    aws logs put-metric-filter \
        --log-group-name "/aws/lambda/storytailor-child-safety-agent-${ENVIRONMENT}" \
        --filter-name "SafetyInterventions" \
        --filter-pattern '"safety intervention"' \
        --metric-transformations \
            metricName=SafetyInterventionCount,metricNamespace=$NAMESPACE,metricValue=1 \
        --region "$REGION" || true
    
    echo -e "${GREEN}✅ Metric filters created${NC}"
}

# Function to create CloudWatch alarms
create_alarms() {
    echo -e "${YELLOW}Creating CloudWatch alarms...${NC}"
    
    # High error rate alarm
    aws cloudwatch put-metric-alarm \
        --alarm-name "storytailor-${ENVIRONMENT}-high-error-rate" \
        --alarm-description "High error rate detected in Storytailor" \
        --metric-name "api.request.error" \
        --namespace "$NAMESPACE" \
        --statistic Sum \
        --period 300 \
        --threshold 10 \
        --comparison-operator GreaterThanThreshold \
        --evaluation-periods 2 \
        --alarm-actions "$TOPIC_ARN" \
        --dimensions Name=Environment,Value=$ENVIRONMENT \
        --region "$REGION"
    
    # High latency alarm
    aws cloudwatch put-metric-alarm \
        --alarm-name "storytailor-${ENVIRONMENT}-high-latency" \
        --alarm-description "High API latency detected" \
        --metric-name "api.request.duration" \
        --namespace "$NAMESPACE" \
        --statistic Average \
        --period 300 \
        --threshold 3000 \
        --comparison-operator GreaterThanThreshold \
        --evaluation-periods 2 \
        --alarm-actions "$TOPIC_ARN" \
        --dimensions Name=Environment,Value=$ENVIRONMENT \
        --region "$REGION"
    
    # Lambda concurrent executions alarm
    aws cloudwatch put-metric-alarm \
        --alarm-name "storytailor-${ENVIRONMENT}-lambda-throttles" \
        --alarm-description "Lambda throttling detected" \
        --metric-name Throttles \
        --namespace "AWS/Lambda" \
        --statistic Sum \
        --period 60 \
        --threshold 5 \
        --comparison-operator GreaterThanThreshold \
        --evaluation-periods 2 \
        --alarm-actions "$TOPIC_ARN" \
        --dimensions Name=FunctionName,Value="storytailor-router-${ENVIRONMENT}" \
        --region "$REGION"
    
    # Database connection failures
    aws cloudwatch put-metric-alarm \
        --alarm-name "storytailor-${ENVIRONMENT}-db-connection-failures" \
        --alarm-description "Database connection failures detected" \
        --metric-name "health.check.status" \
        --namespace "$NAMESPACE" \
        --statistic Average \
        --period 300 \
        --threshold 0.8 \
        --comparison-operator LessThanThreshold \
        --evaluation-periods 2 \
        --alarm-actions "$TOPIC_ARN" \
        --dimensions Name=Environment,Value=$ENVIRONMENT Name=Service,Value=database \
        --region "$REGION"
    
    # Child safety critical events
    aws cloudwatch put-metric-alarm \
        --alarm-name "storytailor-${ENVIRONMENT}-safety-critical" \
        --alarm-description "Critical child safety event detected" \
        --metric-name "SafetyInterventionCount" \
        --namespace "$NAMESPACE" \
        --statistic Sum \
        --period 60 \
        --threshold 1 \
        --comparison-operator GreaterThanOrEqualToThreshold \
        --evaluation-periods 1 \
        --alarm-actions "$TOPIC_ARN" \
        --dimensions Name=Environment,Value=$ENVIRONMENT \
        --region "$REGION"
    
    echo -e "${GREEN}✅ Alarms created${NC}"
}

# Function to create CloudWatch dashboard
create_dashboard() {
    echo -e "${YELLOW}Creating CloudWatch dashboard...${NC}"
    
    DASHBOARD_BODY=$(cat <<EOF
{
    "widgets": [
        {
            "type": "metric",
            "properties": {
                "metrics": [
                    [ "$NAMESPACE", "api.request.count", { "stat": "Sum", "label": "Total Requests" } ],
                    [ ".", "api.request.error", { "stat": "Sum", "label": "Errors" } ]
                ],
                "period": 300,
                "stat": "Sum",
                "region": "$REGION",
                "title": "API Request Volume",
                "width": 12,
                "height": 6
            }
        },
        {
            "type": "metric",
            "properties": {
                "metrics": [
                    [ "$NAMESPACE", "api.request.duration", { "stat": "Average", "label": "Avg Latency" } ],
                    [ "...", { "stat": "p99", "label": "p99 Latency" } ]
                ],
                "period": 300,
                "stat": "Average",
                "region": "$REGION",
                "title": "API Latency",
                "width": 12,
                "height": 6,
                "yAxis": {
                    "left": {
                        "label": "Milliseconds"
                    }
                }
            }
        },
        {
            "type": "metric",
            "properties": {
                "metrics": [
                    [ "$NAMESPACE", "agent.communication.count", { "stat": "Sum" } ],
                    [ ".", "agent.communication.error", { "stat": "Sum" } ]
                ],
                "period": 300,
                "stat": "Sum",
                "region": "$REGION",
                "title": "Agent Communication",
                "width": 8,
                "height": 6
            }
        },
        {
            "type": "metric",
            "properties": {
                "metrics": [
                    [ "$NAMESPACE", "business.story.created", { "stat": "Sum" } ],
                    [ ".", "business.user.registered", { "stat": "Sum" } ],
                    [ ".", "business.audio.generated", { "stat": "Sum" } ]
                ],
                "period": 300,
                "stat": "Sum",
                "region": "$REGION",
                "title": "Business Metrics",
                "width": 8,
                "height": 6
            }
        },
        {
            "type": "metric",
            "properties": {
                "metrics": [
                    [ "$NAMESPACE", "health.check.status", { "stat": "Average" } ]
                ],
                "period": 300,
                "stat": "Average",
                "region": "$REGION",
                "title": "Health Status",
                "width": 8,
                "height": 6,
                "yAxis": {
                    "left": {
                        "min": 0,
                        "max": 1
                    }
                }
            }
        },
        {
            "type": "metric",
            "properties": {
                "metrics": [
                    [ "AWS/Lambda", "Invocations", { "stat": "Sum" }, { "label": "Invocations" } ],
                    [ ".", "Errors", { "stat": "Sum" }, { "label": "Errors" } ],
                    [ ".", "Throttles", { "stat": "Sum" }, { "label": "Throttles" } ]
                ],
                "period": 300,
                "stat": "Sum",
                "region": "$REGION",
                "title": "Lambda Metrics",
                "width": 12,
                "height": 6
            }
        },
        {
            "type": "log",
            "properties": {
                "query": "SOURCE '/aws/lambda/storytailor-router-${ENVIRONMENT}' | fields @timestamp, @message | filter level = 'ERROR' | sort @timestamp desc | limit 20",
                "region": "$REGION",
                "title": "Recent Errors",
                "width": 12,
                "height": 6
            }
        }
    ]
}
EOF
)
    
    aws cloudwatch put-dashboard \
        --dashboard-name "Storytailor-${ENVIRONMENT}" \
        --dashboard-body "$DASHBOARD_BODY" \
        --region "$REGION"
    
    echo -e "${GREEN}✅ Dashboard created${NC}"
}

# Function to setup X-Ray tracing
setup_xray() {
    echo -e "${YELLOW}Setting up X-Ray tracing...${NC}"
    
    # Create X-Ray sampling rule
    SAMPLING_RULE=$(cat <<EOF
{
    "version": 2,
    "default": {
        "fixed_target": 1,
        "rate": 0.1
    },
    "rules": [
        {
            "description": "Storytailor API",
            "service_name": "storytailor-*",
            "http_method": "*",
            "url_path": "*",
            "fixed_target": 2,
            "rate": 0.2
        }
    ]
}
EOF
)
    
    echo "$SAMPLING_RULE" > /tmp/xray-sampling-rule.json
    
    aws xray create-sampling-rule \
        --cli-input-json file:///tmp/xray-sampling-rule.json \
        --region "$REGION" 2>/dev/null || echo "  Sampling rule already exists"
    
    rm -f /tmp/xray-sampling-rule.json
    
    echo -e "${GREEN}✅ X-Ray tracing configured${NC}"
}

# Function to configure CloudWatch Insights queries
create_insights_queries() {
    echo -e "${YELLOW}Creating CloudWatch Insights queries...${NC}"
    
    # Store common queries in SSM for easy access
    aws ssm put-parameter \
        --name "/storytailor/${ENVIRONMENT}/monitoring/insights/error-analysis" \
        --value 'fields @timestamp, @message, error.message, error.stack | filter level = "ERROR" | stats count() by error.message' \
        --type String \
        --description "Analyze errors by type" \
        --overwrite \
        --region "$REGION" || true
    
    aws ssm put-parameter \
        --name "/storytailor/${ENVIRONMENT}/monitoring/insights/latency-analysis" \
        --value 'fields @timestamp, duration, path, method | filter duration > 1000 | stats avg(duration), max(duration), count() by path' \
        --type String \
        --description "Analyze high latency requests" \
        --overwrite \
        --region "$REGION" || true
    
    aws ssm put-parameter \
        --name "/storytailor/${ENVIRONMENT}/monitoring/insights/user-activity" \
        --value 'fields @timestamp, userId, path, method | stats count() by userId | sort count() desc | limit 20' \
        --type String \
        --description "Top active users" \
        --overwrite \
        --region "$REGION" || true
    
    echo -e "${GREEN}✅ Insights queries stored${NC}"
}

# Function to create StatsD/CloudWatch agent config
create_cw_agent_config() {
    echo -e "${YELLOW}Creating CloudWatch agent configuration...${NC}"
    
    CW_CONFIG=$(cat <<EOF
{
    "metrics": {
        "namespace": "$NAMESPACE",
        "metrics_collected": {
            "statsd": {
                "service_address": ":8125",
                "metrics_collection_interval": 60,
                "metrics_aggregation_interval": 300
            }
        }
    },
    "logs": {
        "logs_collected": {
            "files": {
                "collect_list": [
                    {
                        "file_path": "/var/log/storytailor/*.log",
                        "log_group_name": "/aws/storytailor/${ENVIRONMENT}/application",
                        "log_stream_name": "{instance_id}"
                    }
                ]
            }
        }
    }
}
EOF
)
    
    # Store in SSM
    aws ssm put-parameter \
        --name "/storytailor/${ENVIRONMENT}/monitoring/cw-agent-config" \
        --value "$CW_CONFIG" \
        --type String \
        --description "CloudWatch agent configuration" \
        --overwrite \
        --region "$REGION" || true
    
    echo -e "${GREEN}✅ CloudWatch agent config stored${NC}"
}

# Main execution
main() {
    echo "Environment: $ENVIRONMENT"
    echo "Region: $REGION"
    echo ""
    
    # Create SNS topic
    create_sns_topic
    
    # Create log groups
    create_log_groups
    
    # Create metric filters
    create_metric_filters
    
    # Create alarms
    create_alarms
    
    # Create dashboard
    create_dashboard
    
    # Setup X-Ray
    setup_xray
    
    # Create Insights queries
    create_insights_queries
    
    # Create CW agent config
    create_cw_agent_config
    
    echo ""
    echo -e "${GREEN}🎉 Monitoring infrastructure setup complete!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Subscribe to SNS alerts: $TOPIC_ARN"
    echo "2. View dashboard: https://console.aws.amazon.com/cloudwatch/home?region=${REGION}#dashboards:name=Storytailor-${ENVIRONMENT}"
    echo "3. Configure agents to use monitoring package"
    echo "4. Enable X-Ray tracing on Lambda functions"
    echo ""
    echo "To integrate monitoring in your agents:"
    echo '  import { createMonitoring } from "@storytailor/monitoring";'
    echo '  const monitor = createMonitoring("agent-name");'
}

# Run main function
main