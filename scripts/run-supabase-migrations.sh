#!/bin/bash
# Run Supabase Migrations via REST API
# This script executes database migrations directly via Supabase REST API
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

ENVIRONMENT=${1:-staging}
PREFIX="/storytailor-${ENVIRONMENT}"

echo -e "${BLUE}🗄️  Running Supabase Database Migrations${NC}"
echo -e "${BLUE}Environment: ${ENVIRONMENT}${NC}"
echo -e "${BLUE}========================================${NC}"

# Function to get parameter value
get_parameter() {
    local param_name="$1"
    aws ssm get-parameter --name "$param_name" --with-decryption --query 'Parameter.Value' --output text 2>/dev/null || echo ""
}

# Get Supabase credentials
echo -e "${YELLOW}📋 Getting Supabase credentials...${NC}"
SUPABASE_URL=$(get_parameter "${PREFIX}/supabase/url")
SUPABASE_SERVICE_KEY=$(get_parameter "${PREFIX}/supabase/service_key")

if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_KEY" ]; then
    echo -e "${RED}❌ Supabase credentials not found in SSM${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Credentials loaded${NC}"
echo -e "${BLUE}   URL: ${SUPABASE_URL}${NC}"

# Test connection first
echo -e "${YELLOW}🔗 Testing database connection...${NC}"
response=$(curl -s -w "%{http_code}" -o /dev/null \
    -H "apikey: $SUPABASE_SERVICE_KEY" \
    -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
    "$SUPABASE_URL/rest/v1/" || echo "000")

if [ "$response" != "200" ]; then
    echo -e "${RED}❌ Database connection failed (HTTP $response)${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Database connection successful${NC}"

# Function to execute SQL via REST API
execute_sql() {
    local sql_content="$1"
    local description="$2"
    
    echo -e "${YELLOW}  Executing: ${description}${NC}"
    
    # Clean up SQL content - remove comments and empty lines
    local clean_sql=$(echo "$sql_content" | sed '/^--/d' | sed '/^$/d' | tr '\n' ' ')
    
    if [ -z "$(echo "$clean_sql" | tr -d '[:space:]')" ]; then
        echo -e "${YELLOW}    ⏭️  Skipped (empty)${NC}"
        return 0
    fi
    
    # Execute via REST API using a simple approach
    local temp_file=$(mktemp)
    echo "$clean_sql" > "$temp_file"
    
    local response=$(curl -s -w "%{http_code}" \
        -X POST \
        -H "apikey: $SUPABASE_SERVICE_KEY" \
        -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
        -H "Content-Type: application/json" \
        -d "{\"query\": $(cat "$temp_file" | jq -Rs .)}" \
        "$SUPABASE_URL/rest/v1/rpc/exec_sql" 2>/dev/null || echo "000")
    
    rm "$temp_file"
    
    local http_code="${response: -3}"
    
    if [ "$http_code" = "200" ] || [ "$http_code" = "201" ]; then
        echo -e "${GREEN}    ✅ Success${NC}"
        return 0
    else
        echo -e "${RED}    ❌ Failed (HTTP $http_code)${NC}"
        return 1
    fi
}

# Create essential tables first
echo -e "${YELLOW}📊 Creating essential database schema...${NC}"

# Create users table if not exists
execute_sql "
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE,
    name TEXT,
    age INTEGER,
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);" "Users table"

# Create stories table if not exists
execute_sql "
CREATE TABLE IF NOT EXISTS stories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    title TEXT NOT NULL,
    content TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);" "Stories table"

# Create conversations table if not exists
execute_sql "
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    story_id UUID REFERENCES stories(id),
    messages JSONB DEFAULT '[]',
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);" "Conversations table"

# Create voice synthesis jobs table
execute_sql "
CREATE TABLE IF NOT EXISTS voice_synthesis_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    text_content TEXT NOT NULL,
    voice_settings JSONB DEFAULT '{}',
    status TEXT DEFAULT 'pending',
    audio_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);" "Voice synthesis jobs table"

# Create child safety events table
execute_sql "
CREATE TABLE IF NOT EXISTS child_safety_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    event_type TEXT NOT NULL,
    severity TEXT DEFAULT 'low',
    details JSONB DEFAULT '{}',
    resolved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);" "Child safety events table"

# Create educational assessments table
execute_sql "
CREATE TABLE IF NOT EXISTS educational_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    assessment_type TEXT NOT NULL,
    results JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);" "Educational assessments table"

# Create accessibility preferences table
execute_sql "
CREATE TABLE IF NOT EXISTS accessibility_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) UNIQUE,
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);" "Accessibility preferences table"

# Enable Row Level Security
echo -e "${YELLOW}🔒 Enabling Row Level Security...${NC}"

execute_sql "ALTER TABLE users ENABLE ROW LEVEL SECURITY;" "Enable RLS on users"
execute_sql "ALTER TABLE stories ENABLE ROW LEVEL SECURITY;" "Enable RLS on stories"
execute_sql "ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;" "Enable RLS on conversations"
execute_sql "ALTER TABLE voice_synthesis_jobs ENABLE ROW LEVEL SECURITY;" "Enable RLS on voice_synthesis_jobs"
execute_sql "ALTER TABLE child_safety_events ENABLE ROW LEVEL SECURITY;" "Enable RLS on child_safety_events"
execute_sql "ALTER TABLE educational_assessments ENABLE ROW LEVEL SECURITY;" "Enable RLS on educational_assessments"
execute_sql "ALTER TABLE accessibility_preferences ENABLE ROW LEVEL SECURITY;" "Enable RLS on accessibility_preferences"

# Create basic RLS policies
echo -e "${YELLOW}🛡️  Creating Row Level Security policies...${NC}"

# Users can only see their own data
execute_sql "
CREATE POLICY IF NOT EXISTS users_own_data ON users
FOR ALL USING (auth.uid() = id);" "Users RLS policy"

execute_sql "
CREATE POLICY IF NOT EXISTS stories_own_data ON stories
FOR ALL USING (auth.uid() = user_id);" "Stories RLS policy"

execute_sql "
CREATE POLICY IF NOT EXISTS conversations_own_data ON conversations
FOR ALL USING (auth.uid() = user_id);" "Conversations RLS policy"

execute_sql "
CREATE POLICY IF NOT EXISTS voice_jobs_own_data ON voice_synthesis_jobs
FOR ALL USING (auth.uid() = user_id);" "Voice synthesis jobs RLS policy"

execute_sql "
CREATE POLICY IF NOT EXISTS safety_events_own_data ON child_safety_events
FOR ALL USING (auth.uid() = user_id);" "Child safety events RLS policy"

execute_sql "
CREATE POLICY IF NOT EXISTS assessments_own_data ON educational_assessments
FOR ALL USING (auth.uid() = user_id);" "Educational assessments RLS policy"

execute_sql "
CREATE POLICY IF NOT EXISTS accessibility_own_data ON accessibility_preferences
FOR ALL USING (auth.uid() = user_id);" "Accessibility preferences RLS policy"

# Create indexes for performance
echo -e "${YELLOW}⚡ Creating database indexes...${NC}"

execute_sql "CREATE INDEX IF NOT EXISTS idx_stories_user_id ON stories(user_id);" "Stories user index"
execute_sql "CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);" "Conversations user index"
execute_sql "CREATE INDEX IF NOT EXISTS idx_conversations_story_id ON conversations(story_id);" "Conversations story index"
execute_sql "CREATE INDEX IF NOT EXISTS idx_voice_jobs_user_id ON voice_synthesis_jobs(user_id);" "Voice jobs user index"
execute_sql "CREATE INDEX IF NOT EXISTS idx_voice_jobs_status ON voice_synthesis_jobs(status);" "Voice jobs status index"
execute_sql "CREATE INDEX IF NOT EXISTS idx_safety_events_user_id ON child_safety_events(user_id);" "Safety events user index"
execute_sql "CREATE INDEX IF NOT EXISTS idx_assessments_user_id ON educational_assessments(user_id);" "Assessments user index"

# Verify the setup
echo -e "${YELLOW}🔍 Verifying database setup...${NC}"

# Check if tables exist by querying them
tables_to_check=("users" "stories" "conversations" "voice_synthesis_jobs" "child_safety_events" "educational_assessments" "accessibility_preferences")
verified_count=0

for table in "${tables_to_check[@]}"; do
    response=$(curl -s -w "%{http_code}" -o /dev/null \
        -H "apikey: $SUPABASE_SERVICE_KEY" \
        -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
        "$SUPABASE_URL/rest/v1/$table?limit=1" || echo "000")
    
    if [ "$response" = "200" ]; then
        echo -e "${GREEN}  ✅ Table: ${table}${NC}"
        verified_count=$((verified_count + 1))
    else
        echo -e "${RED}  ❌ Table: ${table} (HTTP $response)${NC}"
    fi
done

echo ""
echo -e "${BLUE}========================================${NC}"
if [ $verified_count -eq ${#tables_to_check[@]} ]; then
    echo -e "${GREEN}🎉 Database setup completed successfully!${NC}"
    echo -e "${GREEN}✅ All ${verified_count} essential tables created and accessible${NC}"
    echo -e "${BLUE}🔒 Row Level Security enabled${NC}"
    echo -e "${BLUE}⚡ Performance indexes created${NC}"
    echo ""
    echo -e "${BLUE}Database is ready for application deployment!${NC}"
else
    echo -e "${YELLOW}⚠️  Database setup completed with warnings${NC}"
    echo -e "${YELLOW}Verified ${verified_count}/${#tables_to_check[@]} tables${NC}"
    echo -e "${YELLOW}Some features may require additional configuration${NC}"
fi

echo ""
echo -e "${BLUE}Next steps:${NC}"
echo -e "${BLUE}1. Deploy Lambda functions${NC}"
echo -e "${BLUE}2. Test end-to-end integration${NC}"
echo -e "${BLUE}3. Run validation tests${NC}"