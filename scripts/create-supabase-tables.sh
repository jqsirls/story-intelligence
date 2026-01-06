#!/bin/bash
# Create Supabase Tables via SQL Editor API
# This script creates essential database tables using Supabase's SQL editor
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

ENVIRONMENT=${1:-staging}
PREFIX="/storytailor-${ENVIRONMENT}"

echo -e "${BLUE}🗄️  Creating Supabase Database Tables${NC}"
echo -e "${BLUE}Environment: ${ENVIRONMENT}${NC}"
echo -e "${BLUE}========================================${NC}"

# Get Supabase credentials
echo -e "${YELLOW}📋 Getting Supabase credentials...${NC}"
SUPABASE_URL=$(aws ssm get-parameter --name "${PREFIX}/supabase/url" --with-decryption --query 'Parameter.Value' --output text)
SUPABASE_SERVICE_KEY=$(aws ssm get-parameter --name "${PREFIX}/supabase/service_key" --with-decryption --query 'Parameter.Value' --output text)

if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_KEY" ]; then
    echo -e "${RED}❌ Supabase credentials not found${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Credentials loaded${NC}"

# Extract project reference from URL
PROJECT_REF=$(echo "$SUPABASE_URL" | sed -n 's/.*https:\/\/\([^.]*\)\.supabase\.co.*/\1/p')
echo -e "${BLUE}   Project: ${PROJECT_REF}${NC}"

# Function to execute SQL via Supabase SQL editor API
execute_sql_editor() {
    local sql_content="$1"
    local description="$2"
    
    echo -e "${YELLOW}  Creating: ${description}${NC}"
    
    # Use Supabase SQL editor API endpoint
    local response=$(curl -s -w "%{http_code}" \
        -X POST \
        -H "apikey: $SUPABASE_SERVICE_KEY" \
        -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
        -H "Content-Type: application/json" \
        -d "{\"sql\": $(echo "$sql_content" | jq -Rs .)}" \
        "https://${PROJECT_REF}.supabase.co/rest/v1/rpc/exec_sql" 2>/dev/null || echo "000")
    
    local http_code="${response: -3}"
    
    if [ "$http_code" = "200" ] || [ "$http_code" = "201" ]; then
        echo -e "${GREEN}    ✅ Success${NC}"
        return 0
    else
        echo -e "${YELLOW}    ⚠️  Response: $http_code (may already exist)${NC}"
        return 0  # Don't fail on existing tables
    fi
}

# Alternative approach: Use direct table creation via REST API
create_table_direct() {
    local table_name="$1"
    local description="$2"
    
    echo -e "${YELLOW}  Checking: ${description}${NC}"
    
    # Try to query the table to see if it exists
    local response=$(curl -s -w "%{http_code}" -o /dev/null \
        -H "apikey: $SUPABASE_SERVICE_KEY" \
        -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
        "$SUPABASE_URL/rest/v1/$table_name?limit=1" 2>/dev/null || echo "000")
    
    if [ "$response" = "200" ]; then
        echo -e "${GREEN}    ✅ Table exists and accessible${NC}"
        return 0
    else
        echo -e "${YELLOW}    ⚠️  Table not accessible (HTTP $response)${NC}"
        return 1
    fi
}

echo -e "${YELLOW}📊 Creating essential database schema...${NC}"

# Create the essential SQL schema
SCHEMA_SQL="
-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE,
    name TEXT,
    age INTEGER,
    preferences JSONB DEFAULT '{}',
    alexa_person_id TEXT UNIQUE,
    last_login_at TIMESTAMPTZ,
    is_coppa_protected BOOLEAN DEFAULT FALSE,
    parent_consent_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create stories table
CREATE TABLE IF NOT EXISTS stories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT,
    description TEXT,
    age_range TEXT,
    themes TEXT[],
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create conversations table
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    story_id UUID REFERENCES stories(id) ON DELETE CASCADE,
    messages JSONB DEFAULT '[]',
    status TEXT DEFAULT 'active',
    transcript_ids UUID[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create voice synthesis jobs table
CREATE TABLE IF NOT EXISTS voice_synthesis_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    text_content TEXT NOT NULL,
    voice_settings JSONB DEFAULT '{}',
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    audio_url TEXT,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Create child safety events table
CREATE TABLE IF NOT EXISTS child_safety_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    severity TEXT DEFAULT 'low' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    details JSONB DEFAULT '{}',
    resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create educational assessments table
CREATE TABLE IF NOT EXISTS educational_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    assessment_type TEXT NOT NULL,
    results JSONB DEFAULT '{}',
    score NUMERIC,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create accessibility preferences table
CREATE TABLE IF NOT EXISTS accessibility_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create story interactions table
CREATE TABLE IF NOT EXISTS story_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    story_id UUID REFERENCES stories(id) ON DELETE CASCADE,
    interaction_type TEXT CHECK (interaction_type IN ('created', 'viewed', 'edited', 'shared', 'completed')) NOT NULL,
    interaction_data JSONB DEFAULT '{}',
    session_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create audio transcripts table with TTL
CREATE TABLE IF NOT EXISTS audio_transcripts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    session_id TEXT NOT NULL,
    transcript_text TEXT NOT NULL,
    audio_duration_seconds INTEGER,
    language_code TEXT DEFAULT 'en-US',
    confidence_score NUMERIC CHECK (confidence_score BETWEEN 0 AND 1),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days')
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_stories_user_id ON stories(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_story_id ON conversations(story_id);
CREATE INDEX IF NOT EXISTS idx_voice_jobs_user_id ON voice_synthesis_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_voice_jobs_status ON voice_synthesis_jobs(status);
CREATE INDEX IF NOT EXISTS idx_safety_events_user_id ON child_safety_events(user_id);
CREATE INDEX IF NOT EXISTS idx_assessments_user_id ON educational_assessments(user_id);
CREATE INDEX IF NOT EXISTS idx_story_interactions_user_id ON story_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_story_interactions_story_id ON story_interactions(story_id);
CREATE INDEX IF NOT EXISTS idx_audio_transcripts_user_id ON audio_transcripts(user_id);
CREATE INDEX IF NOT EXISTS idx_audio_transcripts_expires_at ON audio_transcripts(expires_at);
"

# Try to execute the schema
echo -e "${YELLOW}🔧 Executing database schema...${NC}"

# Save SQL to temporary file for manual execution if needed
echo "$SCHEMA_SQL" > /tmp/supabase_schema.sql
echo -e "${BLUE}📄 Schema saved to: /tmp/supabase_schema.sql${NC}"

# Try multiple approaches to execute the SQL
echo -e "${YELLOW}🚀 Attempting to create database schema...${NC}"

# Approach 1: Try the SQL editor API (if available)
echo -e "${YELLOW}Approach 1: SQL Editor API${NC}"
response=$(curl -s -w "%{http_code}" \
    -X POST \
    -H "apikey: $SUPABASE_SERVICE_KEY" \
    -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"sql\": $(echo "$SCHEMA_SQL" | jq -Rs .)}" \
    "https://${PROJECT_REF}.supabase.co/rest/v1/rpc/exec_sql" 2>/dev/null || echo "000")

http_code="${response: -3}"
if [ "$http_code" = "200" ] || [ "$http_code" = "201" ]; then
    echo -e "${GREEN}✅ Schema created successfully via SQL Editor API${NC}"
    SCHEMA_CREATED=true
else
    echo -e "${YELLOW}⚠️  SQL Editor API not available (HTTP $http_code)${NC}"
    SCHEMA_CREATED=false
fi

# If SQL editor didn't work, provide manual instructions
if [ "$SCHEMA_CREATED" = false ]; then
    echo ""
    echo -e "${YELLOW}📋 Manual Setup Required${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo -e "${YELLOW}The automated schema creation didn't work. Please follow these steps:${NC}"
    echo ""
    echo -e "${BLUE}1. Go to your Supabase dashboard:${NC}"
    echo -e "${BLUE}   https://app.supabase.com/project/${PROJECT_REF}${NC}"
    echo ""
    echo -e "${BLUE}2. Navigate to SQL Editor${NC}"
    echo ""
    echo -e "${BLUE}3. Copy and paste the following SQL:${NC}"
    echo ""
    echo -e "${GREEN}$(cat /tmp/supabase_schema.sql)${NC}"
    echo ""
    echo -e "${BLUE}4. Click 'Run' to execute the schema${NC}"
    echo ""
    echo -e "${YELLOW}After running the SQL manually, press Enter to continue verification...${NC}"
    read -r
fi

# Verify the setup regardless of how it was created
echo -e "${YELLOW}🔍 Verifying database setup...${NC}"

# Check if tables exist and are accessible
tables_to_check=("users" "stories" "conversations" "voice_synthesis_jobs" "child_safety_events" "educational_assessments" "accessibility_preferences" "story_interactions" "audio_transcripts")
verified_count=0

for table in "${tables_to_check[@]}"; do
    if create_table_direct "$table" "Table: $table"; then
        verified_count=$((verified_count + 1))
    fi
done

echo ""
echo -e "${BLUE}========================================${NC}"
if [ $verified_count -eq ${#tables_to_check[@]} ]; then
    echo -e "${GREEN}🎉 Database setup completed successfully!${NC}"
    echo -e "${GREEN}✅ All ${verified_count} essential tables created and accessible${NC}"
    echo ""
    echo -e "${BLUE}Database is ready for application deployment!${NC}"
    
    # Create a simple test record to verify write access
    echo -e "${YELLOW}🧪 Testing database write access...${NC}"
    test_story='{
        "title": "Test Story",
        "content": "This is a test story to verify database functionality.",
        "description": "Database connectivity test",
        "age_range": "3-8",
        "themes": ["test"]
    }'
    
    response=$(curl -s -w "%{http_code}" -o /dev/null \
        -X POST \
        -H "apikey: $SUPABASE_SERVICE_KEY" \
        -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
        -H "Content-Type: application/json" \
        -H "Prefer: return=minimal" \
        -d "$test_story" \
        "$SUPABASE_URL/rest/v1/stories" 2>/dev/null || echo "000")
    
    if [ "$response" = "201" ]; then
        echo -e "${GREEN}✅ Database write test successful${NC}"
    else
        echo -e "${YELLOW}⚠️  Database write test failed (HTTP $response) - may need RLS policies${NC}"
    fi
    
else
    echo -e "${YELLOW}⚠️  Database setup completed with warnings${NC}"
    echo -e "${YELLOW}Verified ${verified_count}/${#tables_to_check[@]} tables${NC}"
    echo -e "${YELLOW}Some tables may need manual creation${NC}"
fi

echo ""
echo -e "${BLUE}Next steps:${NC}"
echo -e "${BLUE}1. Set up Row Level Security (RLS) policies${NC}"
echo -e "${BLUE}2. Deploy Lambda functions${NC}"
echo -e "${BLUE}3. Test end-to-end integration${NC}"

# Clean up
rm -f /tmp/supabase_schema.sql