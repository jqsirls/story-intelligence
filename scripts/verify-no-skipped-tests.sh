#!/bin/bash
# Verify no skipped tests
set -e

if grep -r "skip\|SKIP\|xit\|xdescribe" packages/a2a-adapter/src/__tests__ 2>/dev/null; then
  echo "❌ FAILED: Found skipped tests"
  exit 1
fi

if grep -r "only\|ONLY\|fit\|fdescribe" packages/a2a-adapter/src/__tests__ 2>/dev/null; then
  echo "❌ FAILED: Found focused tests (only/fit)"
  exit 1
fi

echo "✅ PASSED: No skipped tests found"
exit 0
