-- Lifecycle State Alignment Migration Verification
-- Run this after applying migration 20251224000000

-- 1. Check Stories Status Constraint
SELECT 
  'Stories Constraint' as check_name,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint 
WHERE conname = 'stories_status_check';

-- 2. Check Conversations Table Structure
SELECT 
  'Conversations Table' as check_name,
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'conversations'
ORDER BY ordinal_position;

-- 3. Verify State Transition Function
SELECT 
  'State Transition Function' as check_name,
  proname as function_name,
  prosrc as function_body
FROM pg_proc
WHERE proname = 'validate_state_transition';

-- 4. Check Active Triggers
SELECT 
  'Active Triggers' as check_name,
  tgname as trigger_name, 
  tgrelid::regclass as table_name, 
  tgfoid::regproc as function_name
FROM pg_trigger
WHERE tgname IN ('story_state_transition', 'conversation_state_transition')
  AND NOT tgisinternal;

-- 5. Check Transfer Table Constraint
SELECT 
  'Transfer Constraint' as check_name,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint 
WHERE conname IN ('story_transfer_requests_status_check', 'story_transfers_status_check');

-- 6. Count Existing Records by Status
SELECT 
  'Story Status Counts' as check_name,
  status, 
  COUNT(*) as count
FROM stories
GROUP BY status
ORDER BY status;

-- 7. Test Valid Transition (Read-only check)
SELECT 
  'Valid Transitions Test' as check_name,
  validate_state_transition('story', 'draft', 'generating') as draft_to_generating,
  validate_state_transition('story', 'generating', 'ready') as generating_to_ready,
  validate_state_transition('conversation', 'initializing', 'active') as conv_init_to_active;

-- 8. Test Invalid Transition (Read-only check)
SELECT 
  'Invalid Transitions Test' as check_name,
  validate_state_transition('story', 'generating', 'archived') as should_be_false,
  validate_state_transition('conversation', 'ended', 'active') as should_also_be_false;

