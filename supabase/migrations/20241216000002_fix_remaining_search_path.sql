-- Fix remaining SECURITY DEFINER functions in graphql and storage schemas
-- These are Supabase system schema functions that need search_path set
-- This migration targets the specific 9 functions that were missed

DO $$
DECLARE
    func_record RECORD;
    func_schema TEXT;
    func_name TEXT;
    func_args TEXT;
    alter_stmt TEXT;
BEGIN
    -- Target the specific functions that still need fixing
    FOR func_record IN
        SELECT 
            n.nspname as schema_name,
            p.proname as function_name,
            pg_get_function_identity_arguments(p.oid) as function_args
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
            RAISE NOTICE 'Updated function: %.% with search_path', func_schema, func_name;
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Failed to update function %.%: %', func_schema, func_name, SQLERRM;
            -- If permission denied, provide helpful message
            IF SQLERRM LIKE '%permission%' OR SQLERRM LIKE '%denied%' THEN
                RAISE WARNING 'Permission issue: You may need superuser privileges to modify Supabase system schema functions';
            END IF;
        END;
    END LOOP;
END $$;

-- Verify the fix
DO $$
DECLARE
    remaining_count INTEGER;
BEGIN
    -- Count remaining functions without search_path
    SELECT COUNT(*) INTO remaining_count
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
        RAISE NOTICE 'All remaining functions have search_path set!';
    ELSE
        RAISE WARNING 'Still % functions without search_path. Check permissions or function definitions.', remaining_count;
    END IF;
END $$;
