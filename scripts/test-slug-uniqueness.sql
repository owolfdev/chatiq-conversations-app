-- Quick test script to verify slug uniqueness constraint
-- Run this in Supabase SQL Editor to check the constraint is working

-- 1. Check if unique index exists
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'bot_bots'
AND indexdef LIKE '%slug%';

-- Expected: Should show idx_bot_bots_slug_unique with UNIQUE constraint

-- 2. Try to create a duplicate slug (should fail)
-- Replace 'test-slug' with an existing slug from your database
DO $$
BEGIN
    -- This will fail if constraint is working
    INSERT INTO bot_bots (name, slug, description, system_prompt, status, user_id, team_id)
    VALUES ('Test Duplicate', 'test-slug', 'Test', 'Test prompt', 'active', 
            (SELECT id FROM bot_user_profiles LIMIT 1),
            (SELECT id FROM bot_teams LIMIT 1))
    ON CONFLICT DO NOTHING;
    
    RAISE NOTICE 'If you see this, the insert succeeded (constraint might not be working)';
EXCEPTION
    WHEN unique_violation THEN
        RAISE NOTICE '✅ Unique constraint is working! Duplicate slug prevented.';
END $$;

-- 3. Check for any existing duplicate slugs (should return 0 rows)
SELECT 
    slug,
    COUNT(*) as count,
    array_agg(name) as bot_names
FROM bot_bots
GROUP BY slug
HAVING COUNT(*) > 1;

-- Expected: Should return 0 rows (no duplicates)

-- 4. List all bot slugs (for reference)
SELECT 
    id,
    name,
    slug,
    created_at
FROM bot_bots
ORDER BY created_at DESC
LIMIT 10;

