#!/bin/bash

# Setup EventBridge Rules for Multi-Agent Communication

set -e

ENVIRONMENT=${ENVIRONMENT:-staging}
BUS_NAME="storytailor-$ENVIRONMENT"

echo "🚀 Setting up EventBridge Rules for Multi-Agent Communication"
echo "========================================================="
echo ""
echo "Event Bus: $BUS_NAME"
echo ""

# Create rule for Router -> Agent delegation
echo "1️⃣ Creating Router delegation rule..."
aws events put-rule \
    --name router-agent-delegation \
    --event-bus-name $BUS_NAME \
    --event-pattern '{
        "source": ["storytailor.router"],
        "detail-type": ["AgentRequest"]
    }' \
    --description "Routes requests from Router to specific agents" \
    --state ENABLED

# Create rule for crisis detection
echo ""
echo "2️⃣ Creating crisis detection rule..."
aws events put-rule \
    --name crisis-detection-alert \
    --event-bus-name $BUS_NAME \
    --event-pattern '{
        "source": ["storytailor.agents"],
        "detail-type": ["CrisisDetected"]
    }' \
    --description "Alerts when any agent detects a crisis situation" \
    --state ENABLED

# Create rule for cross-agent communication
echo ""
echo "3️⃣ Creating cross-agent communication rule..."
aws events put-rule \
    --name cross-agent-communication \
    --event-bus-name $BUS_NAME \
    --event-pattern '{
        "source": ["storytailor.agents"],
        "detail-type": ["AgentCommunication"]
    }' \
    --description "Enables agents to communicate with each other" \
    --state ENABLED

# Create rule for metrics collection
echo ""
echo "4️⃣ Creating metrics collection rule..."
aws events put-rule \
    --name agent-metrics-collection \
    --event-bus-name $BUS_NAME \
    --event-pattern '{
        "source": ["storytailor.agents"],
        "detail-type": ["AgentMetrics"]
    }' \
    --description "Collects metrics from all agents" \
    --state ENABLED

# Create rule for error handling
echo ""
echo "5️⃣ Creating error handling rule..."
aws events put-rule \
    --name agent-error-handler \
    --event-bus-name $BUS_NAME \
    --event-pattern '{
        "source": ["storytailor.agents"],
        "detail-type": ["AgentError"]
    }' \
    --description "Handles errors from agent processing" \
    --state ENABLED

echo ""
echo "📋 Listing all rules on EventBridge bus..."
aws events list-rules --event-bus-name $BUS_NAME --query 'Rules[*].[Name, State, Description]' --output table

echo ""
echo "✅ EventBridge setup complete!"
echo ""
echo "Next steps:"
echo "1. Add Lambda targets to each rule"
echo "2. Configure IAM permissions for Lambda invocations"
echo "3. Test event routing between agents"