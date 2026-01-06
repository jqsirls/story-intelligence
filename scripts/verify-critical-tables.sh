#!/bin/bash

source .env.staging

echo "🔍 Verifying Critical Dashboard Tables"
echo "===================================="
echo ""

# Critical tables for dashboard
CRITICAL_TABLES=(
    "users"
    "organizations"
    "organization_members"
    "stories"
    "characters"
    "api_keys"
    "sessions"
    "activity_logs"
)

echo "Checking critical tables for dashboard functionality..."
echo ""

EXISTING=0
MISSING=0

for table in "${CRITICAL_TABLES[@]}"; do
    response=$(curl -s -X GET \
        "${SUPABASE_URL}/rest/v1/${table}?limit=1" \
        -H "apikey: ${SUPABASE_SERVICE_KEY}" \
        -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}")
    
    if echo "$response" | grep -q "relation.*does not exist"; then
        echo "❌ $table - MISSING (Required for dashboard)"
        ((MISSING++))
    else
        echo "✅ $table - EXISTS"
        ((EXISTING++))
    fi
done

echo ""
echo "📊 Dashboard Tables Summary:"
echo "✅ Existing: $EXISTING/8"
echo "❌ Missing: $MISSING/8"
echo ""

if [ $MISSING -gt 0 ]; then
    echo "⚠️  Still missing $MISSING critical tables for dashboard functionality"
    echo ""
    echo "Missing tables:"
    for table in "${CRITICAL_TABLES[@]}"; do
        response=$(curl -s -X GET \
            "${SUPABASE_URL}/rest/v1/${table}?limit=1" \
            -H "apikey: ${SUPABASE_SERVICE_KEY}" \
            -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}")
        
        if echo "$response" | grep -q "relation.*does not exist"; then
            echo "  - $table"
        fi
    done
else
    echo "🎉 All critical dashboard tables are created!"
    echo "✅ Ready to proceed with Phase 2 deployments!"
fi