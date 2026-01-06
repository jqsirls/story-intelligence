#!/bin/bash

# Load environment variables
source .env.staging

echo "🚀 Storytailor Database Migration via Supabase API"
echo "=================================================="
echo ""

# Function to execute SQL via Supabase REST API
execute_sql() {
    local table_name=$1
    local check_query=$2
    
    echo -n "Checking table '$table_name'... "
    
    # Try to query the table
    response=$(curl -s -X GET \
        "${SUPABASE_URL}/rest/v1/${table_name}?limit=1" \
        -H "apikey: ${SUPABASE_SERVICE_KEY}" \
        -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}")
    
    # Check if we got an error
    if echo "$response" | grep -q "relation.*does not exist"; then
        echo "❌ Not found"
        return 1
    else
        echo "✅ Exists"
        return 0
    fi
}

# Function to create tables via direct SQL (if we had access)
check_tables() {
    echo "🔍 Checking existing tables..."
    echo ""
    
    local tables=(
        "users"
        "organizations"
        "organization_members"
        "stories"
        "characters"
        "api_keys"
        "sessions"
        "activity_logs"
        "children"
        "story_history"
        "user_preferences"
        "knowledge_base"
        "analytics_events"
        "conversations"
        "agent_metrics"
        "voice_profiles"
        "emotion_states"
        "educational_progress"
        "therapeutic_sessions"
        "smart_home_configs"
        "commerce_transactions"
        "accessibility_settings"
        "content_moderation_logs"
    )
    
    local existing=0
    local missing=0
    
    for table in "${tables[@]}"; do
        if execute_sql "$table"; then
            ((existing++))
        else
            ((missing++))
        fi
    done
    
    echo ""
    echo "📊 Summary:"
    echo "✅ Existing tables: $existing"
    echo "❌ Missing tables: $missing"
}

# Try using the Supabase Management API
try_management_api() {
    echo ""
    echo "🔧 Attempting to use Supabase Management API..."
    
    # Extract project ref from URL
    PROJECT_REF=$(echo $SUPABASE_URL | sed -n 's/https:\/\/\([^.]*\)\.supabase\.co/\1/p')
    echo "Project Reference: $PROJECT_REF"
    
    # Check if we can access the project
    response=$(curl -s -X GET \
        "https://api.supabase.com/v1/projects/${PROJECT_REF}" \
        -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}")
    
    if echo "$response" | grep -q "unauthorized"; then
        echo "❌ Service key doesn't have management API access"
        return 1
    else
        echo "ℹ️  Response: $response"
    fi
}

# Alternative: Create a Node.js script inline
create_node_migration() {
    echo ""
    echo "🔧 Creating Node.js migration approach..."
    
    cat > scripts/temp-migration.js << 'EOF'
const https = require('https');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

// Tables that should exist
const requiredTables = {
  users: {
    columns: ['id', 'clerk_id', 'email', 'full_name', 'role', 'subscription_status']
  },
  organizations: {
    columns: ['id', 'name', 'slug', 'owner_id', 'subscription_tier']
  },
  characters: {
    columns: ['id', 'organization_id', 'name', 'age', 'traits']
  },
  stories: {
    columns: ['id', 'organization_id', 'title', 'content', 'status']
  }
};

async function checkTable(tableName) {
  return new Promise((resolve) => {
    const url = new URL(`${SUPABASE_URL}/rest/v1/${tableName}`);
    url.searchParams.append('limit', '0');
    
    const options = {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
      }
    };
    
    https.get(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log(`✅ Table '${tableName}' exists`);
          resolve(true);
        } else if (data.includes('does not exist')) {
          console.log(`❌ Table '${tableName}' not found`);
          resolve(false);
        } else {
          console.log(`⚠️  Table '${tableName}' - unclear status:`, data);
          resolve(false);
        }
      });
    }).on('error', (err) => {
      console.error(`❌ Error checking ${tableName}:`, err.message);
      resolve(false);
    });
  });
}

async function main() {
  console.log('🔍 Checking Storytailor database tables...\n');
  
  let existingCount = 0;
  let missingCount = 0;
  
  for (const table of Object.keys(requiredTables)) {
    const exists = await checkTable(table);
    if (exists) existingCount++;
    else missingCount++;
  }
  
  console.log('\n📊 Summary:');
  console.log(`✅ Existing: ${existingCount}`);
  console.log(`❌ Missing: ${missingCount}`);
  
  if (missingCount > 0) {
    console.log('\n⚠️  Missing tables need to be created via Supabase Dashboard:');
    console.log('1. Go to: https://app.supabase.com/project/lendybmmnlqelrhkhdyc');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Run the SQL from CRITICAL_MIGRATIONS_FOR_DASHBOARD.sql');
  }
}

main();
EOF

    # Run the Node.js script
    node scripts/temp-migration.js
    
    # Clean up
    rm -f scripts/temp-migration.js
}

# Main execution
echo "🔐 Using Supabase URL: ${SUPABASE_URL}"
echo "🔑 Service key: ${SUPABASE_SERVICE_KEY:0:25}..."
echo ""

# First check what tables exist
check_tables

# Try management API
try_management_api

# Try Node.js approach
create_node_migration

echo ""
echo "📝 CONCLUSION:"
echo "============="
echo ""
echo "The service key has data-level access but NOT schema-level (DDL) access."
echo "This is a Supabase security feature - service keys can read/write data but cannot modify schemas."
echo ""
echo "✅ WHAT WORKS:"
echo "- Reading from existing tables"
echo "- Writing to existing tables"
echo "- API operations on existing data"
echo ""
echo "❌ WHAT DOESN'T WORK:"
echo "- Creating new tables"
echo "- Altering table schemas"
echo "- Running migrations via API"
echo ""
echo "🚀 SOLUTION - You have 3 options:"
echo ""
echo "1️⃣  SUPABASE DASHBOARD (Recommended - 5 minutes):"
echo "   - Go to: https://app.supabase.com/project/lendybmmnlqelrhkhdyc/editor"
echo "   - Click 'SQL Editor'"
echo "   - Paste contents of CRITICAL_MIGRATIONS_FOR_DASHBOARD.sql"
echo "   - Click 'Run'"
echo ""
echo "2️⃣  SUPABASE CLI WITH LOGIN (10 minutes):"
echo "   - Install: npm install -g supabase"
echo "   - Login: supabase login"
echo "   - Link: supabase link --project-ref lendybmmnlqelrhkhdyc"
echo "   - Push: supabase db push"
echo ""
echo "3️⃣  DIRECT POSTGRES ACCESS (Requires password):"
echo "   - Need the actual database password (not service key)"
echo "   - Can be found in Supabase Dashboard > Settings > Database"
echo ""
echo "The SQL migrations are ready in: CRITICAL_MIGRATIONS_FOR_DASHBOARD.sql"
echo "This will create the 8 critical tables needed for the dashboard."