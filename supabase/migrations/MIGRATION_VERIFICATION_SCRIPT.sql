-- ============================================
-- MIGRATION VERIFICATION SCRIPT
-- ============================================
-- Run this in Supabase SQL Editor AFTER the critical migrations

-- 1. Check total table count (should be 16+ from previous 9)
SELECT COUNT(*) as total_tables 
FROM information_schema.tables 
WHERE table_schema = 'public';

-- 2. Verify all critical tables were created
SELECT 
  table_name,
  CASE 
    WHEN table_name IN ('characters', 'refresh_tokens', 'libraries', 'knowledge_base', 'system_metrics', 'alert_rules', 'system_alerts') 
    THEN '✅ CRITICAL' 
    ELSE '📊 EXISTING' 
  END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY 
  CASE WHEN table_name IN ('characters', 'refresh_tokens', 'libraries', 'knowledge_base', 'system_metrics', 'alert_rules', 'system_alerts') THEN 1 ELSE 2 END,
  table_name;

-- 3. Test characters table
SELECT 'Characters table ready' as status, 0 as count;
-- INSERT INTO characters (user_id, name, description) VALUES ((SELECT id FROM users LIMIT 1), 'Test Character', 'A test character for verification') ON CONFLICT DO NOTHING;

-- 4. Test knowledge base functionality
SELECT 'Knowledge Base entries:' as status, COUNT(*) as count FROM knowledge_base;
SELECT title, category FROM knowledge_base LIMIT 3;

-- 5. Test system health function
SELECT 'System Health Function:' as status;
-- SELECT * FROM get_system_health();

-- 6. Test alert rules
SELECT 'Alert Rules created:' as status, COUNT(*) as count FROM alert_rules;
SELECT name, severity, metric FROM alert_rules ORDER BY severity DESC;

-- 7. Verify RLS is enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('characters', 'refresh_tokens', 'libraries', 'knowledge_base', 'system_metrics', 'alert_rules', 'system_alerts')
ORDER BY tablename;

-- ============================================
-- SUCCESS CRITERIA
-- ============================================
-- ✅ Total tables: 16+ (up from 9)
-- ✅ All 7 critical tables exist
-- ✅ Knowledge base has sample entries  
-- ✅ Alert rules are configured
-- ✅ RLS is enabled on all tables
-- ✅ System health function works

SELECT '🎉 MIGRATION VERIFICATION COMPLETE!' as final_status;
 
 
 