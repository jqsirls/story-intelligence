#!/bin/bash
# Fieldnotes Setup Script
# Initializes the Storytailor tenant and verifies infrastructure

set -e

echo "🔧 Setting up Fieldnotes (User Research Agent)..."

# Load .env file if it exists
if [ -f ".env" ]; then
  echo "📝 Loading environment from .env file..."
  export $(grep -v '^#' .env | xargs)
fi

# Check for required environment variables
if [ -z "$SUPABASE_URL" ]; then
  echo "⚠️  SUPABASE_URL not set. Using default: http://localhost:54321"
  export SUPABASE_URL="${SUPABASE_URL:-http://localhost:54321}"
fi

if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  echo "❌ SUPABASE_SERVICE_ROLE_KEY is required"
  echo "   Get it from: Supabase Dashboard > Settings > API > service_role key"
  echo "   Or add it to .env file"
  exit 1
fi

# Build the package first
echo "📦 Building package..."
npm run build

# Initialize Storytailor tenant
echo "🏢 Initializing Storytailor tenant..."
node -e "
const { createClient } = require('@supabase/supabase-js');
const { initializeStorytalorTenant } = require('./dist/config/tenants/storytailor');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

initializeStorytalorTenant(supabase)
  .then(() => {
    console.log('✅ Storytailor tenant initialized successfully');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Failed to initialize tenant:', err.message);
    process.exit(1);
  });
"

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Configure delivery channels (Slack, Email, Webhook)"
echo "2. Start services:"
echo "   - REST API: npm run start:api"
echo "   - MCP Server: npm run start:mcp"
echo "   - Scheduler: node dist/scheduler.js"
echo ""
echo "See README.md for full configuration guide."
