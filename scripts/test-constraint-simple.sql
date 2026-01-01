-- Simple test to verify unique constraint is working
-- Run each query separately in Supabase SQL Editor

-- STEP 1: Check if the unique index exists
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'bot_bots'
AND indexname = 'idx_bot_bots_slug_unique';

-- Expected: Should return 1 row with the unique index

-- STEP 2: Check for duplicate slugs (should be empty)
SELECT 
    slug,
    COUNT(*) as count
FROM bot_bots
GROUP BY slug
HAVING COUNT(*) > 1;

-- Expected: Should return 0 rows (no duplicates)

-- STEP 3: Try to insert a duplicate slug (this should FAIL)
-- Replace 'billy-the-bot' with any slug that exists in your database
INSERT INTO bot_bots (name, slug, description, system_prompt, status, user_id, team_id)
SELECT 
    'Duplicate Test',
    'billy-the-bot',  -- This slug already exists, so this should fail
    'Test',
    'Test',
    'active',
    (SELECT id FROM bot_user_profiles LIMIT 1),
    (SELECT id FROM bot_teams LIMIT 1);

-- Expected Result: 
-- ✅ If you get an ERROR like "duplicate key value violates unique constraint" - the constraint is WORKING!
-- ❌ If the insert succeeds - the constraint is NOT working

-- STEP 4: Clean up test data (if insert succeeded somehow)
-- DELETE FROM bot_bots WHERE name = 'Duplicate Test' AND slug = 'billy-the-bot';

