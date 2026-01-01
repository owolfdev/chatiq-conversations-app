-- SQL script to check moderation flags in audit log
-- Run this in Supabase SQL Editor or via psql

-- View recent moderation flags
SELECT 
  id,
  team_id,
  user_id,
  action,
  resource_type,
  resource_id as bot_id,
  metadata->>'flagged_categories' as flagged_categories,
  metadata->>'message_preview' as message_preview,
  metadata->>'message_length' as message_length,
  metadata->'category_scores' as category_scores,
  ip_address,
  user_agent,
  created_at
FROM bot_audit_log
WHERE action = 'content_moderation_flagged'
ORDER BY created_at DESC
LIMIT 20;

-- Count flags by category
SELECT 
  jsonb_array_elements_text(metadata->'flagged_categories') as category,
  COUNT(*) as count
FROM bot_audit_log
WHERE action = 'content_moderation_flagged'
GROUP BY category
ORDER BY count DESC;

-- Count flags by team
SELECT 
  team_id,
  COUNT(*) as flag_count,
  MAX(created_at) as last_flag
FROM bot_audit_log
WHERE action = 'content_moderation_flagged'
  AND team_id IS NOT NULL
GROUP BY team_id
ORDER BY flag_count DESC;

-- Count flags by day
SELECT 
  DATE(created_at) as date,
  COUNT(*) as flag_count
FROM bot_audit_log
WHERE action = 'content_moderation_flagged'
GROUP BY DATE(created_at)
ORDER BY date DESC
LIMIT 30;

-- View flags with full context
SELECT 
  bal.id,
  bal.created_at,
  bal.ip_address,
  bal.metadata->>'message_preview' as message_preview,
  bal.metadata->>'flagged_categories' as categories,
  bb.name as bot_name,
  bb.slug as bot_slug,
  bu.email as user_email,
  bt.name as team_name
FROM bot_audit_log bal
LEFT JOIN bot_bots bb ON bal.resource_id = bb.id
LEFT JOIN bot_user_profiles bu ON bal.user_id = bu.id
LEFT JOIN bot_teams bt ON bal.team_id = bt.id
WHERE bal.action = 'content_moderation_flagged'
ORDER BY bal.created_at DESC
LIMIT 20;



