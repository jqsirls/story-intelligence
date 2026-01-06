#!/bin/bash
# Verify zero workarounds in production code
set -e

PATTERNS=("workaround" "WORKAROUND" "hack" "HACK" "temporary" "TEMPORARY")

for pattern in "${PATTERNS[@]}"; do
  if grep -r "$pattern" packages/a2a-adapter packages/universal-agent/src/api/RESTAPIGateway.ts 2>/dev/null | grep -v "node_modules" | grep -v "__tests__" | grep -v ".test."; then
    echo "❌ FAILED: Found workaround: $pattern"
    exit 1
  fi
done

echo "✅ PASSED: Zero workarounds found"
exit 0
