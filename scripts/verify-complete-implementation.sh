#!/bin/bash
# Verify complete implementation
set -e

# Check that all required files exist
REQUIRED_FILES=(
  "packages/a2a-adapter/src/types.ts"
  "packages/a2a-adapter/src/AgentCard.ts"
  "packages/a2a-adapter/src/JsonRpcHandler.ts"
  "packages/a2a-adapter/src/TaskManager.ts"
  "packages/a2a-adapter/src/MessageHandler.ts"
  "packages/a2a-adapter/src/SSEStreamer.ts"
  "packages/a2a-adapter/src/WebhookHandler.ts"
  "packages/a2a-adapter/src/Authentication.ts"
  "packages/a2a-adapter/src/RouterIntegration.ts"
)

for file in "${REQUIRED_FILES[@]}"; do
  if [ ! -f "$file" ]; then
    echo "❌ FAILED: Required file missing: $file"
    exit 1
  fi
done

echo "✅ PASSED: All required files exist"
exit 0
