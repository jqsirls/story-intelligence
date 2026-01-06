-- Verification query for search_path fix migration
-- Run this to confirm all SECURITY DEFINER functions have search_path set

-- Count total SECURITY DEFINER functions
SELECT 
    COUNT(*) as total_security_definer_functions
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.prosecdef = true  -- SECURITY DEFINER
AND n.nspname NOT IN ('pg_catalog', 'information_schema', 'pg_toast');

-- Count SECURITY DEFINER functions with search_path set
SELECT 
    COUNT(*) as functions_with_search_patha
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.prosecdef = true  -- SECURITY DEFINER
AND n.nspname NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
AND pg_get_functiondef(p.oid) LIKE '%SET search_path%';

-- List all SECURITY DEFINER functions and their search_path status
SELECT 
    n.nspname as schema_name,
    p.proname as function_name,
    pg_get_function_identity_arguments(p.oid) as function_args,
    CASE 
        WHEN pg_get_functiondef(p.oid) LIKE '%SET search_path%' THEN '✅ SET'
        ELSE '❌ NOT SET'
    END as search_path_status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.prosecdef = true  -- SECURITY DEFINER
AND n.nspname NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
ORDER BY n.nspname, p.proname;

-- Detailed check: Show functions without search_path (should be 0 after migration)
SELECT 
    n.nspname as schema_name,
    p.proname as function_name,
    pg_get_function_identity_arguments(p.oid) as function_args
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.prosecdef = true  -- SECURITY DEFINER
AND n.nspname NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
AND pg_get_functiondef(p.oid) NOT LIKE '%SET search_path%'
ORDER BY n.nspname, p.proname;
