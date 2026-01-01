-- Check all unique constraints and indexes on bot_bots.slug
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'bot_bots'::regclass
AND conkey::text LIKE '%slug%';

-- Also check indexes
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'bot_bots'
AND (indexdef LIKE '%slug%' OR indexname LIKE '%slug%')
ORDER BY indexname;

-- Check for any duplicate slugs (should be 0)
SELECT 
    slug,
    COUNT(*) as count,
    array_agg(name) as bot_names
FROM bot_bots
GROUP BY slug
HAVING COUNT(*) > 1;
