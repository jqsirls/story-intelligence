-- Fix ALL SECURITY DEFINER functions to include SET search_path = ''
-- This migration addresses the plan requirement: "Fix ALL 30+ functions with mutable search_path (not just 9)"
-- 
-- Security: Setting search_path = '' prevents search_path injection attacks
-- This ensures functions use fully qualified names and don't rely on search_path
--
-- Method: Uses ALTER FUNCTION ... SET search_path = '' which is the correct PostgreSQL syntax
-- This is safer than recreating functions and preserves all existing function properties

DO $$
DECLARE
    func_record RECORD;
    func_schema TEXT;
    func_name TEXT;
    func_args TEXT;
    alter_stmt TEXT;
BEGIN
    -- Find all SECURITY DEFINER functions
    FOR func_record IN
        SELECT 
            n.nspname as schema_name,
            p.proname as function_name,
            pg_get_function_identity_arguments(p.oid) as function_args
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE p.prosecdef = true  -- SECURITY DEFINER
        AND n.nspname NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
        -- Include all schemas: public, graphql, storage, etc.
    LOOP
        func_schema := func_record.schema_name;
        func_name := func_record.function_name;
        func_args := func_record.function_args;
        
        -- Build ALTER FUNCTION statement
        -- Format: ALTER FUNCTION schema.function_name(args) SET search_path = ''
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
        END;
    END LOOP;
END $$;

-- Verify the fix
DO $$
DECLARE
    func_count INTEGER;
    fixed_count INTEGER;
BEGIN
    -- Count all SECURITY DEFINER functions
    SELECT COUNT(*) INTO func_count
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE p.prosecdef = true
    AND n.nspname NOT IN ('pg_catalog', 'information_schema', 'pg_toast');
    
    -- Count SECURITY DEFINER functions with search_path set
    SELECT COUNT(*) INTO fixed_count
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE p.prosecdef = true
    AND n.nspname NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
    AND pg_get_functiondef(p.oid) LIKE '%SET search_path%';
    
    RAISE NOTICE 'Total SECURITY DEFINER functions: %', func_count;
    RAISE NOTICE 'Functions with search_path set: %', fixed_count;
    
    IF fixed_count < func_count THEN
        RAISE WARNING 'Not all functions have search_path set. % functions still need updating.', (func_count - fixed_count);
    ELSE
        RAISE NOTICE 'All SECURITY DEFINER functions have search_path set!';
    END IF;
END $$;
