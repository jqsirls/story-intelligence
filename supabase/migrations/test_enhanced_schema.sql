-- Test script for enhanced database schema and RLS policies
-- This script tests the new functionality added in the enhanced migration

-- Test 1: Verify all tables exist
DO $$
DECLARE
    table_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN (
        'users', 'libraries', 'library_permissions', 'stories', 'characters',
        'emotions', 'subscriptions', 'media_assets', 'audit_log',
        'audio_transcripts', 'story_interactions', 'user_preferences',
        'data_retention_policies', 'alexa_user_mappings', 'voice_codes',
        'conversation_states'
    );
    
    IF table_count = 16 THEN
        RAISE NOTICE 'SUCCESS: All 16 tables exist';
    ELSE
        RAISE EXCEPTION 'FAILURE: Expected 16 tables, found %', table_count;
    END IF;
END $$;

-- Test 2: Verify RLS is enabled on all tables
DO $$
DECLARE
    rls_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO rls_count
    FROM pg_class c
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public'
    AND c.relkind = 'r'
    AND c.relrowsecurity = true
    AND c.relname IN (
        'users', 'libraries', 'library_permissions', 'stories', 'characters',
        'emotions', 'subscriptions', 'media_assets', 'audit_log',
        'audio_transcripts', 'story_interactions', 'user_preferences',
        'data_retention_policies', 'alexa_user_mappings', 'voice_codes',
        'conversation_states'
    );
    
    IF rls_count = 16 THEN
        RAISE NOTICE 'SUCCESS: RLS enabled on all 16 tables';
    ELSE
        RAISE EXCEPTION 'FAILURE: RLS not enabled on all tables, found % with RLS', rls_count;
    END IF;
END $$;

-- Test 3: Verify functions exist
DO $$
DECLARE
    function_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO function_count
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname IN (
        'check_library_permission',
        'check_library_permission_with_coppa',
        'log_audit_event',
        'log_audit_event_enhanced',
        'check_coppa_compliance',
        'cleanup_expired_data',
        'cleanup_expired_data_enhanced',
        'export_user_data',
        'delete_user_data',
        'set_coppa_protection'
    );
    
    IF function_count >= 10 THEN
        RAISE NOTICE 'SUCCESS: All required functions exist (found %)', function_count;
    ELSE
        RAISE EXCEPTION 'FAILURE: Missing functions, found % of expected 10+', function_count;
    END IF;
END $$;

-- Test 4: Verify triggers exist
DO $$
DECLARE
    trigger_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO trigger_count
    FROM information_schema.triggers
    WHERE trigger_schema = 'public'
    AND trigger_name IN (
        'trigger_set_coppa_protection',
        'trigger_validate_coppa_story_creation'
    );
    
    IF trigger_count = 2 THEN
        RAISE NOTICE 'SUCCESS: All 2 triggers exist';
    ELSE
        RAISE EXCEPTION 'FAILURE: Expected 2 triggers, found %', trigger_count;
    END IF;
END $$;

-- Test 5: Verify data retention policies are populated
DO $$
DECLARE
    policy_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO policy_count
    FROM data_retention_policies
    WHERE is_active = true;
    
    IF policy_count = 5 THEN
        RAISE NOTICE 'SUCCESS: All 5 data retention policies exist';
    ELSE
        RAISE EXCEPTION 'FAILURE: Expected 5 retention policies, found %', policy_count;
    END IF;
END $$;

-- Test 6: Test COPPA protection trigger
DO $$
DECLARE
    test_user_id UUID;
    is_protected BOOLEAN;
BEGIN
    -- Insert a test user under 13
    INSERT INTO users (email, age) 
    VALUES ('test_child@example.com', 10)
    RETURNING id INTO test_user_id;
    
    -- Check if COPPA protection was automatically set
    SELECT is_coppa_protected INTO is_protected
    FROM users WHERE id = test_user_id;
    
    IF is_protected THEN
        RAISE NOTICE 'SUCCESS: COPPA protection trigger works correctly';
    ELSE
        RAISE EXCEPTION 'FAILURE: COPPA protection not set for user under 13';
    END IF;
    
    -- Clean up test data
    DELETE FROM users WHERE id = test_user_id;
END $$;

-- Test 7: Test enhanced audit logging function
DO $$
DECLARE
    audit_id UUID;
    test_payload JSONB;
BEGIN
    test_payload := jsonb_build_object(
        'action', 'test_action',
        'email', 'test@example.com',
        'name', 'Test User'
    );
    
    SELECT log_audit_event_enhanced(
        'TEST_AGENT',
        'test_action',
        test_payload,
        'test_session_123',
        'test_correlation_456'
    ) INTO audit_id;
    
    IF audit_id IS NOT NULL THEN
        RAISE NOTICE 'SUCCESS: Enhanced audit logging function works (ID: %)', audit_id;
        
        -- Clean up test audit log
        DELETE FROM audit_log WHERE id = audit_id;
    ELSE
        RAISE EXCEPTION 'FAILURE: Enhanced audit logging function failed';
    END IF;
END $$;

-- Test 8: Verify indexes exist for performance
DO $$
DECLARE
    index_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO index_count
    FROM pg_indexes
    WHERE schemaname = 'public'
    AND indexname LIKE 'idx_%';
    
    IF index_count >= 20 THEN
        RAISE NOTICE 'SUCCESS: Performance indexes exist (found %)', index_count;
    ELSE
        RAISE NOTICE 'WARNING: Only % performance indexes found, expected 20+', index_count;
    END IF;
END $$;

-- Test 9: Test audio transcript TTL
DO $$
DECLARE
    transcript_id UUID;
    expires_at_value TIMESTAMPTZ;
BEGIN
    -- Insert test transcript
    INSERT INTO audio_transcripts (user_id, session_id, transcript_text)
    VALUES (gen_random_uuid(), 'test_session', 'Test transcript')
    RETURNING id, expires_at INTO transcript_id, expires_at_value;
    
    -- Check if expires_at is set to 30 days from now
    IF expires_at_value > NOW() + INTERVAL '29 days' 
       AND expires_at_value < NOW() + INTERVAL '31 days' THEN
        RAISE NOTICE 'SUCCESS: Audio transcript TTL set correctly to 30 days';
    ELSE
        RAISE EXCEPTION 'FAILURE: Audio transcript TTL not set correctly';
    END IF;
    
    -- Clean up
    DELETE FROM audio_transcripts WHERE id = transcript_id;
END $$;

-- Test 10: Test emotion TTL
DO $$
DECLARE
    emotion_id UUID;
    expires_at_value TIMESTAMPTZ;
BEGIN
    -- Insert test emotion
    INSERT INTO emotions (user_id, mood, confidence)
    VALUES (gen_random_uuid(), 'happy', 0.8)
    RETURNING id, expires_at INTO emotion_id, expires_at_value;
    
    -- Check if expires_at is set to 365 days from now
    IF expires_at_value > NOW() + INTERVAL '364 days' 
       AND expires_at_value < NOW() + INTERVAL '366 days' THEN
        RAISE NOTICE 'SUCCESS: Emotion TTL set correctly to 365 days';
    ELSE
        RAISE EXCEPTION 'FAILURE: Emotion TTL not set correctly';
    END IF;
    
    -- Clean up
    DELETE FROM emotions WHERE id = emotion_id;
END $$;

RAISE NOTICE 'All database schema tests completed successfully!';