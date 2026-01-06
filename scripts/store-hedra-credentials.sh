#!/bin/bash
# Store Hedra API credentials in AWS SSM Parameter Store
# Usage: ./scripts/store-hedra-credentials.sh [environment] [api-key]

set -e

ENVIRONMENT=${1:-production}
HEDRA_API_KEY=${2:-${HEDRA_API_KEY}}

if [ -z "$HEDRA_API_KEY" ]; then
  echo "Error: Hedra API key not provided"
  echo "Usage: $0 [environment] [api-key]"
  echo "Or set HEDRA_API_KEY environment variable"
  exit 1
fi

PREFIX="/storytailor-${ENVIRONMENT}"

echo "Storing Hedra API key in SSM Parameter Store..."
echo "Environment: ${ENVIRONMENT}"
echo "Parameter: ${PREFIX}/hedra/api-key"

aws ssm put-parameter \
  --name "${PREFIX}/hedra/api-key" \
  --value "${HEDRA_API_KEY}" \
  --type "SecureString" \
  --description "Hedra API key for realtime avatar generation" \
  --overwrite \
  --region us-east-1

if [ $? -eq 0 ]; then
  echo "✅ Hedra API key stored successfully in ${PREFIX}/hedra/api-key"
else
  echo "❌ Failed to store Hedra API key"
  exit 1
fi
