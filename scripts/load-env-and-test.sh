#!/bin/bash

# Load environment variables and run tests
set -a  # automatically export all variables
source .env.staging 2>/dev/null || echo "Warning: .env.staging not found"
set +a

echo "🔄 Environment loaded. Current status:"
echo "OPENAI_API_KEY: ${OPENAI_API_KEY:+SET (${OPENAI_API_KEY:0:10}...)}${OPENAI_API_KEY:-NOT SET}"
echo "SUPABASE_URL: ${SUPABASE_URL:+SET ($SUPABASE_URL)}${SUPABASE_URL:-NOT SET}"
echo "SUPABASE_ANON_KEY: ${SUPABASE_ANON_KEY:+SET (${SUPABASE_ANON_KEY:0:20}...)}${SUPABASE_ANON_KEY:-NOT SET}"
echo ""

# Now run the API connection tests
./scripts/test-api-connections.sh