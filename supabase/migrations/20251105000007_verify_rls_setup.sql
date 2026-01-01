-- Verification queries for RLS setup
-- Run these queries in Supabase SQL Editor to verify RLS is properly configured

-- 1. Check if RLS is enabled on all tenant-scoped tables
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename LIKE 'bot_%'
  AND tablename NOT IN ('bot_contact_messages', 'bot_rate_limits', 'bot_document_links')
ORDER BY tablename;

-- Expected: All tables should show rls_enabled = true

-- 2. Check if helper functions exist
SELECT 
  routine_name,
  routine_type,
  data_type as return_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'is_team_member',
    'user_team_ids',
    'is_team_admin',
    'is_team_owner'
  )
ORDER BY routine_name;

-- Expected: Should return 4 functions

-- 3. Count RLS policies per table
SELECT 
  schemaname,
  tablename,
  COUNT(*) as policy_count,
  string_agg(policyname, ', ' ORDER BY policyname) as policy_names
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename LIKE 'bot_%'
GROUP BY schemaname, tablename
ORDER BY tablename;

-- Expected: Each table should have multiple policies (SELECT, INSERT, UPDATE, DELETE)

-- 4. Verify specific policies exist for core tables
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd as operation,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('bot_teams', 'bot_bots', 'bot_documents', 'bot_conversations')
ORDER BY tablename, cmd, policyname;

-- 5. Check if helper functions are working (requires authenticated user)
-- Note: This will only work if you're running as an authenticated user
-- SELECT 
--   public.user_team_ids() as user_teams;

-- 6. Verify RLS is actually blocking unauthorized access
-- This test should be run with different user contexts to verify isolation
-- Create test scenarios:
--   - User A in Team 1 should NOT see Team 2's data
--   - User A should see Team 1's data
--   - Public bots should be visible to all authenticated users

