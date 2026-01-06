#!/bin/bash
# Verify integration tests use real endpoints
set -e

# Check that integration tests don't use mocks for critical services
if grep -r "jest.mock.*supabase\|jest.mock.*redis\|jest.mock.*router" packages/a2a-adapter/src/__tests__/integration 2>/dev/null; then
  echo "❌ FAILED: Integration tests use mocks for real services"
  exit 1
fi

echo "✅ PASSED: Integration tests use real endpoints"
exit 0
