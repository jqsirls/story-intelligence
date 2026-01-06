#!/bin/bash
# Dev deploy for Universal Agent (allows non-fatal TS errors for debugging)
set -e

ENVIRONMENT=${1:-staging}
PREFIX="/storytailor-${ENVIRONMENT}"
LAMBDA_NAME="storytailor-universal-agent-${ENVIRONMENT}"
HANDLER="dist/lambda.handler"
AGENT_DIR="packages/universal-agent"
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [[ "$ENVIRONMENT" != "staging" ]]; then
  echo "Dev deploy script only supports staging."
  exit 1
fi

cd "$PROJECT_ROOT/$AGENT_DIR"
npm run build -- --noEmitOnError false || true

if [ ! -d "dist" ] || [ ! -f "dist/lambda.js" ]; then
  echo "Build did not produce dist/lambda.js"
  exit 1
fi

DEPLOY_DIR=$(mktemp -d)
cp -r "$AGENT_DIR/dist" "$DEPLOY_DIR/"
cp "$PROJECT_ROOT/lambda-deployments/universal-agent/package.json" "$DEPLOY_DIR/package.json"
cd "$DEPLOY_DIR"
npm install --production --legacy-peer-deps --no-audit --no-fund --no-package-lock
zip -r universal-agent.zip dist/ node_modules/ package.json
aws lambda update-function-code --function-name "$LAMBDA_NAME" --zip-file fileb://universal-agent.zip

