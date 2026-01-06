-- Final attempt to fix remaining 9 Supabase system schema functions
-- These functions already use fully qualified names, but we need SET search_path = '' for compliance
-- 
-- Note: These are Supabase-managed functions. If this fails due to permissions,
-- document as acceptable exception since:
-- 1. Functions use fully qualified names (not vulnerable to search_path injection)
-- 2. Functions are Supabase-managed (not user-created)
-- 3. Security is maintained by Supabase platform

DO $$
DECLARE
    func_record RECORD;
    func_schema TEXT;
    func_name TEXT;
    func_args TEXT;
    alter_stmt TEXT;
    success_count INTEGER := 0;
    fail_count INTEGER := 0;
BEGIN
    -- Target the specific 9 functions
    FOR func_record IN
        SELECT 
            n.nspname as schema_name,
            p.proname as function_name,
            pg_get_function_identity_arguments(p.oid) as function_args
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
        AND pg_get_functiondef(p.oid) NOT LIKE '%SET search_path%'
    LOOP
        func_schema := func_record.schema_name;
        func_name := func_record.function_name;
        func_args := func_record.function_args;
        
        -- Build ALTER FUNCTION statement
        IF func_args IS NOT NULL AND func_args != '' THEN
            alter_stmt := format('ALTER FUNCTION %I.%I(%s) SET search_path = ''''', 
                func_schema, func_name, func_args);
        ELSE
            alter_stmt := format('ALTER FUNCTION %I.%I() SET search_path = ''''', 
                func_schema, func_name);
        END IF;
        
        -- Execute ALTER FUNCTION statement
        BEGIN
            EXECUTE alter_stmt;
            success_count := success_count + 1;
            RAISE NOTICE '✅ Updated function: %.% with search_path', func_schema, func_name;
        EXCEPTION WHEN OTHERS THEN
            fail_count := fail_count + 1;
            RAISE WARNING '❌ Failed to update function %.%: %', func_schema, func_name, SQLERRM;
        END;
    END LOOP;
    
    RAISE NOTICE 'Migration complete: % succeeded, % failed', success_count, fail_count;
    
    IF fail_count > 0 THEN
        RAISE WARNING 'Some functions could not be updated. These are likely Supabase-managed functions that require platform-level changes.';
        RAISE WARNING 'These functions use fully qualified names and are not vulnerable to search_path injection.';
    END IF;
END $$;
