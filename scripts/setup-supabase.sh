#!/bin/bash
# Setup Supabase Database
# This script runs all migrations and sets up the database schema
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

ENVIRONMENT=${1:-staging}
PREFIX="/storytailor-${ENVIRONMENT}"

echo -e "${BLUE}🗄️  Setting up Supabase Database${NC}"
echo -e "${BLUE}Environment: ${ENVIRONMENT}${NC}"
echo -e "${BLUE}========================================${NC}"

# Function to get parameter value
get_parameter() {
    local param_name="$1"
    aws ssm get-parameter --name "$param_name" --with-decryption --query 'Parameter.Value' --output text 2>/dev/null || echo ""
}

# Get Supabase credentials
get_supabase_credentials() {
    echo -e "${YELLOW}📋 Getting Supabase credentials...${NC}"
    
    SUPABASE_URL=$(get_parameter "${PREFIX}/supabase/url")
    SUPABASE_SERVICE_KEY=$(get_parameter "${PREFIX}/supabase/service_key")
    
    if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_KEY" ]; then
        echo -e "${RED}❌ Supabase credentials not found in SSM${NC}"
        echo -e "${YELLOW}Please run: ./scripts/update-api-keys.sh ${ENVIRONMENT}${NC}"
        exit 1
    fi
    
    # Extract project ID from URL
    SUPABASE_PROJECT_ID=$(echo "$SUPABASE_URL" | sed -n 's/.*https:\/\/\([^.]*\)\.supabase\.co.*/\1/p')
    
    echo -e "${GREEN}✅ Supabase credentials loaded${NC}"
    echo -e "${BLUE}   Project ID: ${SUPABASE_PROJECT_ID}${NC}"
    echo -e "${BLUE}   URL: ${SUPABASE_URL}${NC}"
}

# Check if Supabase CLI is installed
check_supabase_cli() {
    echo -e "${YELLOW}🔧 Checking Supabase CLI...${NC}"
    
    if ! command -v supabase &> /dev/null; then
        echo -e "${YELLOW}⚠️  Supabase CLI not found. Installing...${NC}"
        
        # Install Supabase CLI
        if command -v brew &> /dev/null; then
            brew install supabase/tap/supabase
        elif command -v npm &> /dev/null; then
            npm install -g supabase
        else
            echo -e "${RED}❌ Cannot install Supabase CLI. Please install manually:${NC}"
            echo -e "${YELLOW}   https://supabase.com/docs/guides/cli${NC}"
            exit 1
        fi
    fi
    
    echo -e "${GREEN}✅ Supabase CLI available${NC}"
    supabase --version
}

# Test database connection
test_connection() {
    echo -e "${YELLOW}🔗 Testing database connection...${NC}"
    
    # Test with a simple query
    local response=$(curl -s -w "%{http_code}" -o /dev/null \
        -H "apikey: $SUPABASE_SERVICE_KEY" \
        -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
        -H "Content-Type: application/json" \
        "$SUPABASE_URL/rest/v1/" || echo "000")
    
    if [ "$response" = "200" ]; then
        echo -e "${GREEN}✅ Database connection successful${NC}"
        return 0
    else
        echo -e "${RED}❌ Database connection failed (HTTP $response)${NC}"
        return 1
    fi
}

# Run migrations using direct SQL execution
run_migrations() {
    echo -e "${YELLOW}📊 Running database migrations...${NC}"
    
    local migration_count=0
    local failed_migrations=0
    
    # Get list of migration files in order
    local migrations=($(ls supabase/migrations/*.sql | grep -E '^supabase/migrations/[0-9]+.*\.sql$' | sort))
    
    echo -e "${BLUE}Found ${#migrations[@]} migration files${NC}"
    
    for migration_file in "${migrations[@]}"; do
        local migration_name=$(basename "$migration_file")
        echo -e "${YELLOW}  Running: ${migration_name}${NC}"
        
        # Read migration content
        local migration_sql=$(cat "$migration_file")
        
        # Execute migration via REST API
        local response=$(curl -s -w "%{http_code}" \
            -X POST \
            -H "apikey: $SUPABASE_SERVICE_KEY" \
            -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
            -H "Content-Type: application/json" \
            -d "{\"query\": $(echo "$migration_sql" | jq -Rs .)}" \
            "$SUPABASE_URL/rest/v1/rpc/exec_sql" 2>/dev/null || echo "000")
        
        local http_code="${response: -3}"
        
        if [ "$http_code" = "200" ] || [ "$http_code" = "201" ]; then
            echo -e "${GREEN}    ✅ ${migration_name}${NC}"
            migration_count=$((migration_count + 1))
        else
            echo -e "${RED}    ❌ ${migration_name} (HTTP $http_code)${NC}"
            failed_migrations=$((failed_migrations + 1))
            
            # Try alternative approach for some migrations
            echo -e "${YELLOW}    🔄 Trying alternative execution...${NC}"
            
            # Split migration into individual statements and execute
            echo "$migration_sql" | sed 's/;/;\n/g' | while IFS= read -r statement; do
                if [ -n "$(echo "$statement" | tr -d '[:space:]')" ]; then
                    curl -s -X POST \
                        -H "apikey: $SUPABASE_SERVICE_KEY" \
                        -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
                        -H "Content-Type: application/json" \
                        -d "{\"query\": $(echo "$statement" | jq -Rs .)}" \
                        "$SUPABASE_URL/rest/v1/rpc/exec_sql" > /dev/null 2>&1
                fi
            done
        fi
        
        # Small delay between migrations
        sleep 1
    done
    
    echo ""
    echo -e "${BLUE}Migration Summary:${NC}"
    echo -e "${GREEN}  ✅ Successful: ${migration_count}${NC}"
    if [ $failed_migrations -gt 0 ]; then
        echo -e "${RED}  ❌ Failed: ${failed_migrations}${NC}"
    fi
}

# Alternative migration approach using psql if available
run_migrations_psql() {
    echo -e "${YELLOW}📊 Running migrations with psql...${NC}"
    
    if ! command -v psql &> /dev/null; then
        echo -e "${YELLOW}⚠️  psql not available, using REST API approach${NC}"
        run_migrations
        return
    fi
    
    # Extract connection details
    local db_host="${SUPABASE_PROJECT_ID}.supabase.co"
    local db_name="postgres"
    local db_user="postgres"
    
    echo -e "${BLUE}Connecting to: ${db_host}${NC}"
    
    # Set password from service key (this is a simplified approach)
    export PGPASSWORD="$SUPABASE_SERVICE_KEY"
    
    local migration_count=0
    local migrations=($(ls supabase/migrations/*.sql | grep -E '^supabase/migrations/[0-9]+.*\.sql$' | sort))
    
    for migration_file in "${migrations[@]}"; do
        local migration_name=$(basename "$migration_file")
        echo -e "${YELLOW}  Running: ${migration_name}${NC}"
        
        if psql -h "$db_host" -U "$db_user" -d "$db_name" -p 5432 -f "$migration_file" -q; then
            echo -e "${GREEN}    ✅ ${migration_name}${NC}"
            migration_count=$((migration_count + 1))
        else
            echo -e "${RED}    ❌ ${migration_name}${NC}"
        fi
    done
    
    unset PGPASSWORD
    echo -e "${GREEN}✅ Completed ${migration_count} migrations${NC}"
}

# Verify database schema
verify_schema() {
    echo -e "${YELLOW}🔍 Verifying database schema...${NC}"
    
    # Check for key tables
    local tables_to_check=(
        "users"
        "stories"
        "conversations"
        "voice_synthesis_jobs"
        "child_safety_events"
        "educational_assessments"
        "accessibility_preferences"
    )
    
    local verified_tables=0
    
    for table in "${tables_to_check[@]}"; do
        local response=$(curl -s -w "%{http_code}" -o /dev/null \
            -H "apikey: $SUPABASE_SERVICE_KEY" \
            -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
            "$SUPABASE_URL/rest/v1/$table?limit=1" || echo "000")
        
        if [ "$response" = "200" ]; then
            echo -e "${GREEN}  ✅ Table: ${table}${NC}"
            verified_tables=$((verified_tables + 1))
        else
            echo -e "${RED}  ❌ Table: ${table} (HTTP $response)${NC}"
        fi
    done
    
    echo ""
    echo -e "${BLUE}Schema Verification:${NC}"
    echo -e "${GREEN}  ✅ Verified: ${verified_tables}/${#tables_to_check[@]} tables${NC}"
    
    if [ $verified_tables -eq ${#tables_to_check[@]} ]; then
        echo -e "${GREEN}🎉 Database schema setup complete!${NC}"
        return 0
    else
        echo -e "${YELLOW}⚠️  Some tables may not be accessible or need additional setup${NC}"
        return 1
    fi
}

# Create initial data
seed_initial_data() {
    echo -e "${YELLOW}🌱 Seeding initial data...${NC}"
    
    # Create a test story template
    local test_story='{
        "title": "Welcome to Storytailor",
        "description": "A magical introduction to personalized storytelling",
        "content": "Once upon a time, in a world where stories come alive...",
        "age_range": "3-8",
        "themes": ["friendship", "adventure", "learning"],
        "created_at": "'$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)'"
    }'
    
    # Insert test data
    curl -s -X POST \
        -H "apikey: $SUPABASE_SERVICE_KEY" \
        -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
        -H "Content-Type: application/json" \
        -d "$test_story" \
        "$SUPABASE_URL/rest/v1/stories" > /dev/null 2>&1
    
    echo -e "${GREEN}✅ Initial data seeded${NC}"
}

# Main setup process
main() {
    echo -e "${BLUE}Starting Supabase database setup...${NC}"
    echo ""
    
    # Step 1: Get credentials
    get_supabase_credentials
    echo ""
    
    # Step 2: Check CLI (optional)
    # check_supabase_cli
    # echo ""
    
    # Step 3: Test connection
    if ! test_connection; then
        echo -e "${RED}❌ Cannot proceed without database connection${NC}"
        exit 1
    fi
    echo ""
    
    # Step 4: Run migrations
    run_migrations
    echo ""
    
    # Step 5: Verify schema
    if verify_schema; then
        echo ""
        # Step 6: Seed initial data
        seed_initial_data
        echo ""
        
        echo -e "${GREEN}🎉 Supabase database setup completed successfully!${NC}"
        echo -e "${BLUE}Database is ready for application deployment${NC}"
    else
        echo -e "${YELLOW}⚠️  Database setup completed with warnings${NC}"
        echo -e "${YELLOW}Some features may require manual configuration${NC}"
    fi
}

# Show help
show_help() {
    echo "Usage: $0 [environment]"
    echo ""
    echo "Set up Supabase database with migrations and initial data"
    echo ""
    echo "Arguments:"
    echo "  environment    Environment name (staging, prod) [default: staging]"
    echo ""
    echo "Examples:"
    echo "  $0 staging     # Set up staging database"
    echo "  $0 prod        # Set up production database"
    echo ""
    echo "Prerequisites:"
    echo "  - Supabase credentials configured in AWS SSM"
    echo "  - Database migrations in supabase/migrations/"
    echo "  - Network access to Supabase"
}

# Handle script arguments
case "${1}" in
    "help"|"-h"|"--help")
        show_help
        ;;
    "")
        main
        ;;
    *)
        if [[ "$1" =~ ^(staging|prod|dev)$ ]]; then
            main
        else
            echo -e "${RED}❌ Invalid environment: $1${NC}"
            echo -e "${YELLOW}Valid environments: staging, prod, dev${NC}"
            show_help
            exit 1
        fi
        ;;
esac