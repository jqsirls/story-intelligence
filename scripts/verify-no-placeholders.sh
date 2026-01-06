#!/bin/bash
# Verify zero placeholders in production code
set -e

PATTERNS=("TODO" "FIXME" "placeholder" "PLACEHOLDER" "simplified" "SIMPLIFIED" "For now" "for now" "FOR NOW" "TBD" "tbd" "XXX" "xxx")

for pattern in "${PATTERNS[@]}"; do
  if grep -r "$pattern" packages/a2a-adapter packages/universal-agent/src/api/RESTAPIGateway.ts 2>/dev/null | grep -v "node_modules" | grep -v "__tests__" | grep -v ".test."; then
    echo "❌ FAILED: Found placeholder pattern: $pattern"
    exit 1
  fi
done

echo "✅ PASSED: Zero placeholders found"
exit 0
