#!/bin/bash
# Verify zero any types in production code
set -e

PATTERNS=(": any" "as any" "any\[\]" "Record<string, any>")

for pattern in "${PATTERNS[@]}"; do
  if grep -r "$pattern" packages/a2a-adapter packages/universal-agent/src/api/RESTAPIGateway.ts 2>/dev/null | grep -v "node_modules" | grep -v "__tests__" | grep -v ".test."; then
    echo "❌ FAILED: Found any type usage: $pattern"
    exit 1
  fi
done

echo "✅ PASSED: Zero any types found"
exit 0
