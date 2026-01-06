-- Verification Script for API Keys and Webhooks Migration
-- Run this in Supabase SQL Editor to verify everything was created correctly

-- 1. Verify Tables Exist
SELECT 
  '✅ Tables' as check_type,
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
  AND table_name IN ('api_keys', 'webhooks', 'webhook_deliveries')
ORDER BY table_name;

-- 2. Verify api_keys table has new columns
SELECT 
  '✅ API Keys Columns' as check_type,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'api_keys'
  AND column_name IN ('key_hash', 'key_prefix', 'user_id', 'is_active', 'updated_at', 'rate_limit_requests', 'rate_limit_window')
ORDER BY column_name;

-- 3. Verify Functions Exist
SELECT 
  '✅ Functions' as check_type,
  proname as function_name,
  CASE 
    WHEN proname = 'update_updated_at_column' THEN 'Generic updated_at trigger'
    WHEN proname = 'update_api_keys_updated_at' THEN 'API keys updated_at trigger'
    WHEN proname = 'update_webhook_delivery' THEN 'Update webhook delivery status'
    WHEN proname = 'get_pending_webhook_deliveries' THEN 'Get pending deliveries for retry'
    WHEN proname = 'schedule_webhook_retry' THEN 'Schedule webhook retry'
    WHEN proname = 'cleanup_old_webhook_deliveries' THEN 'Cleanup old deliveries'
    ELSE 'Other function'
  END as description
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND proname IN (
    'update_updated_at_column',
    'update_api_keys_updated_at',
    'update_webhook_delivery',
    'get_pending_webhook_deliveries',
    'schedule_webhook_retry',
    'cleanup_old_webhook_deliveries'
  )
ORDER BY proname;

-- 4. Verify Triggers Exist
SELECT 
  '✅ Triggers' as check_type,
  tgname as trigger_name,
  tgrelid::regclass as table_name,
  proname as function_name
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgname IN ('update_api_keys_updated_at_trigger', 'update_webhooks_updated_at_trigger')
ORDER BY tgname;

-- 5. Verify Indexes Exist
SELECT 
  '✅ Indexes' as check_type,
  indexname,
  tablename,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND (
    indexname LIKE 'idx_api_keys%' OR
    indexname LIKE 'idx_webhooks%' OR
    indexname LIKE 'idx_webhook_deliveries%'
  )
ORDER BY tablename, indexname;

-- 6. Verify RLS Policies
SELECT 
  '✅ RLS Policies' as check_type,
  tablename,
  policyname,
  cmd as command,
  CASE 
    WHEN permissive = 'PERMISSIVE' THEN 'Allow'
    ELSE 'Restrict'
  END as policy_type
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('api_keys', 'webhooks', 'webhook_deliveries')
ORDER BY tablename, policyname;

-- 7. Verify RLS is Enabled
SELECT 
  '✅ RLS Status' as check_type,
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('api_keys', 'webhooks', 'webhook_deliveries')
ORDER BY tablename;

-- Summary
SELECT 
  '📊 Summary' as check_type,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('api_keys', 'webhooks', 'webhook_deliveries')) as tables_count,
  (SELECT COUNT(*) FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public' AND proname IN ('update_updated_at_column', 'update_api_keys_updated_at', 'update_webhook_delivery', 'get_pending_webhook_deliveries', 'schedule_webhook_retry', 'cleanup_old_webhook_deliveries')) as functions_count,
  (SELECT COUNT(*) FROM pg_trigger WHERE tgname IN ('update_api_keys_updated_at_trigger', 'update_webhooks_updated_at_trigger')) as triggers_count,
  (SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public' AND (indexname LIKE 'idx_api_keys%' OR indexname LIKE 'idx_webhooks%' OR indexname LIKE 'idx_webhook_deliveries%')) as indexes_count,
  (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename IN ('api_keys', 'webhooks', 'webhook_deliveries')) as policies_count;
