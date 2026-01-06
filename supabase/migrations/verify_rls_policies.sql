-- Verification query for RLS policies
-- Run this to check which tables have RLS enabled and which have policies

-- Count tables with RLS enabled
SELECT 
    COUNT(*) as tables_with_rls_enabled
FROM pg_tables t
JOIN pg_class c ON c.relname = t.tablename
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
AND c.relrowsecurity = true;

-- List all tables with RLS status
SELECT 
    schemaname,
    tablename,
    CASE 
        WHEN relrowsecurity THEN '✅ ENABLED'
        ELSE '❌ DISABLED'
    END as rls_status,
    (SELECT COUNT(*) 
     FROM pg_policies p 
     WHERE p.schemaname = t.schemaname 
     AND p.tablename = t.tablename) as policy_count
FROM pg_tables t
JOIN pg_class c ON c.relname = t.tablename
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
ORDER BY tablename;

-- List tables WITHOUT RLS enabled (security risk)
SELECT 
    tablename,
    '❌ RLS NOT ENABLED' as status
FROM pg_tables t
JOIN pg_class c ON c.relname = t.tablename
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
AND c.relrowsecurity = false
ORDER BY tablename;

-- List tables with RLS enabled but NO policies (security risk)
SELECT 
    t.tablename,
    '⚠️ RLS ENABLED BUT NO POLICIES' as status
FROM pg_tables t
JOIN pg_class c ON c.relname = t.tablename
JOIN pg_namespace n ON n.oid = c.relnamespace
LEFT JOIN pg_policies p ON p.schemaname = t.schemaname AND p.tablename = t.tablename
WHERE n.nspname = 'public'
AND c.relrowsecurity = true
AND p.policyname IS NULL
ORDER BY t.tablename;

-- List all RLS policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Summary: Tables that need RLS (per plan requirements)
-- Check specific tables mentioned in plan
SELECT 
    tablename,
    CASE 
        WHEN relrowsecurity THEN '✅ RLS ENABLED'
        ELSE '❌ RLS DISABLED'
    END as rls_status,
    (SELECT COUNT(*) 
     FROM pg_policies p 
     WHERE p.tablename = t.tablename) as policy_count
FROM pg_tables t
JOIN pg_class c ON c.relname = t.tablename
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
AND tablename IN (
    'emotions',
    'story_usage',
    'story_credits',
    'story_lighting_profiles',
    'partners',
    'affiliate_conversions',
    'api_usage',
    'tier_quality_config',
    'upgrade_suggestions',
    'custom_story_types',
    'conversations',
    'voice_synthesis_jobs',
    'child_safety_events',
    'educational_assessments',
    'accessibility_preferences',
    'user_device_preferences',
    'async_jobs',
    'smart_home_device_keys',
    'smart_home_devices',
    'device_tokens'
)
ORDER BY tablename;
