-- Verify the unique constraint is working correctly
-- Run this in Supabase SQL Editor

-- 1. Check if unique index exists (should show idx_bot_bots_slug_unique)
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'bot_bots'
AND indexdef LIKE '%slug%'
ORDER BY indexname;

-- 2. Check for any existing duplicate slugs (should return 0 rows if constraint is working)
SELECT 
    slug,
    COUNT(*) as count,
    array_agg(name) as bot_names,
    array_agg(id::text) as bot_ids
FROM bot_bots
GROUP BY slug
HAVING COUNT(*) > 1;

-- 3. Test the constraint by trying to insert a duplicate slug
-- This should FAIL if the constraint is working
-- Replace 'test-slug' with a slug that already exists (like 'test-slug' or 'billy-the-bot')
INSERT INTO bot_bots (name, slug, description, system_prompt, status, user_id, team_id)
VALUES (
    'Duplicate Test Bot',
    'test-slug',  -- Change this to an existing slug to test
    'Test description',
    'Test prompt',
    'active',
    (SELECT id FROM bot_user_profiles LIMIT 1),
    (SELECT id FROM bot_teams LIMIT 1)
);

-- Expected: Should get an error like:
-- "duplicate key value violates unique constraint "idx_bot_bots_slug_unique""
-- If you get this error, the constraint is working! ✅
-- If the insert succeeds, the constraint is NOT working ❌

