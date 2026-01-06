#!/bin/bash
# Verify no deferred issues
set -e

PATTERNS=("later\|LATER" "future\|FUTURE" "will fix\|WILL FIX" "known issue\|KNOWN ISSUE")

for pattern in "${PATTERNS[@]}"; do
  if grep -r "$pattern" packages/a2a-adapter packages/universal-agent/src/api/RESTAPIGateway.ts 2>/dev/null | grep -v "node_modules" | grep -v "__tests__" | grep -v ".test." | grep -v "future features"; then
    echo "❌ FAILED: Found deferred issue: $pattern"
    exit 1
  fi
done

echo "✅ PASSED: No deferred issues found"
exit 0
