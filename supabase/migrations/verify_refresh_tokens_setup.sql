-- Verification script for refresh_tokens table and RLS policies
-- Run this in Supabase Dashboard > SQL Editor to verify the migration was successful

-- 1. Verify table exists
SELECT 
  'Table exists' as check_type,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'refresh_tokens') 
    THEN '✅ PASS' 
    ELSE '❌ FAIL' 
  END as status;

-- 2. Verify table structure
SELECT 
  'Table structure' as check_type,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'refresh_tokens'
ORDER BY ordinal_position;

-- 3. Verify indexes exist
SELECT 
  'Indexes' as check_type,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'refresh_tokens'
ORDER BY indexname;

-- 4. Verify RLS is enabled
SELECT 
  'RLS enabled' as check_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_tables 
      WHERE tablename = 'refresh_tokens' 
      AND rowsecurity = true
    ) 
    THEN '✅ PASS' 
    ELSE '❌ FAIL' 
  END as status;

-- 5. Verify policies exist
SELECT 
  'Policies' as check_type,
  policyname,
  cmd as command,
  CASE 
    WHEN qual IS NOT NULL THEN 'Has USING clause'
    ELSE 'No USING clause'
  END as using_clause,
  CASE 
    WHEN with_check IS NOT NULL THEN 'Has WITH CHECK clause'
    ELSE 'No WITH CHECK clause'
  END as with_check_clause
FROM pg_policies
WHERE tablename = 'refresh_tokens'
ORDER BY policyname;

-- 6. Verify service role policy specifically
SELECT 
  'Service role policy' as check_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'refresh_tokens' 
      AND policyname = 'refresh_tokens_service_role_policy'
      AND cmd = 'INSERT'
      AND with_check LIKE '%service_role%'
    ) 
    THEN '✅ PASS - Service role can insert' 
    ELSE '❌ FAIL - Service role policy missing or incorrect' 
  END as status;

-- Summary
SELECT 
  'SUMMARY' as check_type,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'refresh_tokens') as table_exists,
  (SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'refresh_tokens') as index_count,
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'refresh_tokens') as policy_count,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'refresh_tokens' 
      AND policyname = 'refresh_tokens_service_role_policy'
    ) 
    THEN '✅' 
    ELSE '❌' 
  END as service_role_policy_exists;
