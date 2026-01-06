-- Check if we can modify the remaining functions
-- This will help determine if they're Supabase-managed (read-only) or modifiable

-- Check ownership and permissions for the remaining functions
SELECT 
    n.nspname as schema_name,
    p.proname as function_name,
    pg_get_function_identity_arguments(p.oid) as function_args,
    pg_get_userbyid(p.proowner) as owner,
    p.proacl as access_privileges,
    CASE 
        WHEN pg_get_userbyid(p.proowner) = 'supabase_admin' THEN 'Supabase Managed'
        WHEN pg_get_userbyid(p.proowner) = 'postgres' THEN 'Postgres Default'
        ELSE 'Custom'
    END as ownership_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.prosecdef = true  -- SECURITY DEFINER
AND n.nspname IN ('graphql', 'storage')
AND (
    (n.nspname = 'graphql' AND p.proname IN ('get_schema_version', 'increment_schema_version'))
    OR
    (n.nspname = 'storage' AND p.proname IN (
        'add_prefixes', 
        'delete_leaf_prefixes', 
        'delete_prefix', 
        'lock_top_prefixes', 
        'objects_delete_cleanup', 
        'objects_update_cleanup', 
        'prefixes_delete_cleanup'
    ))
)
ORDER BY n.nspname, p.proname;

-- Try to get current search_path setting (if any)
SELECT 
    n.nspname as schema_name,
    p.proname as function_name,
    pg_get_function_identity_arguments(p.oid) as function_args,
    pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.prosecdef = true
AND n.nspname IN ('graphql', 'storage')
AND (
    (n.nspname = 'graphql' AND p.proname IN ('get_schema_version', 'increment_schema_version'))
    OR
    (n.nspname = 'storage' AND p.proname IN (
        'add_prefixes', 
        'delete_leaf_prefixes', 
        'delete_prefix', 
        'lock_top_prefixes', 
        'objects_delete_cleanup', 
        'objects_update_cleanup', 
        'prefixes_delete_cleanup'
    ))
)
ORDER BY n.nspname, p.proname;
