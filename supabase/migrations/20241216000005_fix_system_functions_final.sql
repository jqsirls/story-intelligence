-- Fix ALL 9 remaining Supabase system schema functions
-- This migration uses string concatenation only (no format() calls)
-- Run via Supabase Dashboard SQL Editor for best results

-- First, try to get necessary permissions
DO $$
BEGIN
    BEGIN
        EXECUTE 'GRANT ALL ON ALL FUNCTIONS IN SCHEMA graphql TO current_user';
        EXECUTE 'GRANT ALL ON ALL FUNCTIONS IN SCHEMA storage TO current_user';
        RAISE NOTICE 'Permissions granted successfully';
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Could not grant permissions: %', SQLERRM;
    END;
END $$;

-- Fix all 9 functions
DO $$
DECLARE
    func_record RECORD;
    func_schema TEXT;
    func_name TEXT;
    func_args TEXT;
    alter_stmt TEXT;
    success_count INTEGER := 0;
    fail_count INTEGER := 0;
    error_msg TEXT;
BEGIN
    RAISE NOTICE 'Starting migration to fix 9 Supabase system functions...';
    
    -- Target all 9 functions
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
        ORDER BY n.nspname, p.proname
    LOOP
        func_schema := func_record.schema_name;
        func_name := func_record.function_name;
        func_args := func_record.function_args;
        
        -- Build ALTER FUNCTION statement using only string concatenation
        IF func_args IS NOT NULL AND func_args != '' AND func_args != '()' THEN
            alter_stmt := 'ALTER FUNCTION ' || quote_ident(func_schema) || '.' || quote_ident(func_name) || 
                         '(' || func_args || ') SET search_path = ''''';
        ELSE
            alter_stmt := 'ALTER FUNCTION ' || quote_ident(func_schema) || '.' || quote_ident(func_name) || 
                         '() SET search_path = ''''';
        END IF;
        
        -- Execute ALTER FUNCTION statement
        BEGIN
            EXECUTE alter_stmt;
            success_count := success_count + 1;
            RAISE NOTICE 'Updated: %.%', func_schema, func_name;
        EXCEPTION WHEN OTHERS THEN
            fail_count := fail_count + 1;
            error_msg := func_schema || '.' || func_name || ': ' || SQLERRM;
            RAISE WARNING 'Failed: %', error_msg;
        END;
    END LOOP;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Migration Results:';
    RAISE NOTICE '  Success: % functions', success_count;
    RAISE NOTICE '  Failed: % functions', fail_count;
    RAISE NOTICE '========================================';
    
    IF fail_count > 0 THEN
        RAISE WARNING 'Some functions could not be updated. Check error messages above.';
    END IF;
END $$;

-- Verify the fix
DO $$
DECLARE
    remaining_count INTEGER;
    remaining_list TEXT;
BEGIN
    SELECT 
        COUNT(*),
        string_agg(quote_ident(n.nspname) || '.' || quote_ident(p.proname), ', ' ORDER BY n.nspname, p.proname)
    INTO remaining_count, remaining_list
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
    AND pg_get_functiondef(p.oid) NOT LIKE '%SET search_path%';
    
    IF remaining_count = 0 THEN
        RAISE NOTICE 'SUCCESS: All 9 functions now have search_path set!';
    ELSE
        RAISE WARNING 'Still % functions without search_path: %',
          remaining_count, COALESCE(remaining_list, 'none');
    END IF;
END $$;
