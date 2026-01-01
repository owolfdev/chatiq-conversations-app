ALTER TABLE bot_conversations
  ADD COLUMN IF NOT EXISTS topic_message_preview text,
  ADD COLUMN IF NOT EXISTS topic_message_at timestamptz;

COMMENT ON COLUMN bot_conversations.topic_message_preview IS 'User message that triggered the current topic.';
COMMENT ON COLUMN bot_conversations.topic_message_at IS 'Timestamp of the user message that triggered the current topic.';
