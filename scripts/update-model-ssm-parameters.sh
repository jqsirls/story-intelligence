#!/bin/bash
# Update OpenAI model SSM parameters to GPT-5.2
# Usage: ./scripts/update-model-ssm-parameters.sh [environment]

set -e

ENVIRONMENT=${1:-production}
PREFIX="storytailor-${ENVIRONMENT}"

echo "Updating OpenAI model parameters in SSM Parameter Store..."
echo "Environment: ${ENVIRONMENT}"
echo "Prefix: ${PREFIX}"

# Update model parameters
echo "Updating model-story to gpt-5.2..."
aws ssm put-parameter \
  --name "${PREFIX}/openai/model-story" \
  --value "gpt-5.2" \
  --type "String" \
  --description "Primary text model for story generation (GPT-5.2)" \
  --overwrite \
  --region us-east-1

echo "Updating model-conversation to gpt-5-mini..."
aws ssm put-parameter \
  --name "${PREFIX}/openai/model-conversation" \
  --value "gpt-5-mini" \
  --type "String" \
  --description "Lightweight model for conversations (GPT-5-mini)" \
  --overwrite \
  --region us-east-1

echo "Updating model-safety to gpt-5.2..."
aws ssm put-parameter \
  --name "${PREFIX}/openai/model-safety" \
  --value "gpt-5.2" \
  --type "String" \
  --description "Safety and content moderation model (GPT-5.2)" \
  --overwrite \
  --region us-east-1

echo "Updating model-routing to gpt-5-mini..."
aws ssm put-parameter \
  --name "${PREFIX}/openai/model-routing" \
  --value "gpt-5-mini" \
  --type "String" \
  --description "Routing and intent classification model (GPT-5-mini)" \
  --overwrite \
  --region us-east-1

echo "✅ All model parameters updated successfully"
echo ""
echo "Updated parameters:"
echo "  - ${PREFIX}/openai/model-story: gpt-5.2"
echo "  - ${PREFIX}/openai/model-conversation: gpt-5-mini"
echo "  - ${PREFIX}/openai/model-safety: gpt-5.2"
echo "  - ${PREFIX}/openai/model-routing: gpt-5-mini"
