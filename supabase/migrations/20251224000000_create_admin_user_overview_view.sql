CREATE OR REPLACE VIEW admin_user_overview AS
SELECT
  profiles.id,
  profiles.email,
  profiles.full_name,
  profiles.plan,
  profiles.role,
  profiles.created_at,
  COALESCE(bots.bot_count, 0) AS bot_count,
  COALESCE(conversations.conversation_count, 0) AS conversation_count,
  COALESCE(documents.document_count, 0) AS document_count,
  conversations.last_active_at
FROM bot_user_profiles AS profiles
LEFT JOIN (
  SELECT
    user_id,
    COUNT(*)::int AS bot_count
  FROM bot_bots
  GROUP BY user_id
) AS bots ON bots.user_id = profiles.id
LEFT JOIN (
  SELECT
    user_id,
    COUNT(*)::int AS conversation_count,
    MAX(created_at) AS last_active_at
  FROM bot_conversations
  GROUP BY user_id
) AS conversations ON conversations.user_id = profiles.id
LEFT JOIN (
  SELECT
    user_id,
    COUNT(*)::int AS document_count
  FROM bot_documents
  GROUP BY user_id
) AS documents ON documents.user_id = profiles.id;
