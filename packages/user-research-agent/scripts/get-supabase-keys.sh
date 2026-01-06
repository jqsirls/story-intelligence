#!/bin/bash
# Helper script to extract Supabase keys from local instance
# This attempts to get keys from Supabase's internal config

set -e

echo "🔑 Attempting to get Supabase keys from local instance..."

SUPABASE_URL="${SUPABASE_URL:-http://localhost:54321}"

# Check if Supabase is running
if ! curl -s "$SUPABASE_URL/rest/v1/" > /dev/null 2>&1; then
  echo "❌ Supabase is not running at $SUPABASE_URL"
  echo "   Start it with: npm run infrastructure:start (from root)"
  exit 1
fi

echo "✅ Supabase is running"

# Try to get keys from Supabase config
# Note: Local Supabase stores keys in Docker volumes or config files
# This is a helper - you may need to get keys from Supabase Studio UI

echo ""
echo "📋 To get Supabase keys:"
echo "   1. Open Supabase Studio: http://localhost:54323"
echo "   2. Go to Settings > API"
echo "   3. Copy the following:"
echo "      - service_role key (secret) → SUPABASE_SERVICE_ROLE_KEY"
echo "      - anon key → SUPABASE_ANON_KEY"
echo ""
echo "   4. Update .env file:"
echo "      cd packages/user-research-agent"
echo "      # Edit .env and paste the keys"
echo ""

# Check if .env exists
if [ -f ".env" ]; then
  echo "📝 Current .env file location: $(pwd)/.env"
  echo ""
  echo "You can update it with:"
  echo "  nano .env"
  echo "  # or"
  echo "  vim .env"
else
  echo "⚠️  .env file not found in current directory"
fi
