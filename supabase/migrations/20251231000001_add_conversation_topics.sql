ALTER TABLE bot_conversations
  ADD COLUMN IF NOT EXISTS topic text,
  ADD COLUMN IF NOT EXISTS topic_source text,
  ADD COLUMN IF NOT EXISTS topic_confidence numeric,
  ADD COLUMN IF NOT EXISTS topic_updated_at timestamp without time zone;

COMMENT ON COLUMN bot_conversations.topic IS 'System-assigned topic label for the conversation.';
COMMENT ON COLUMN bot_conversations.topic_source IS 'Origin of the topic label (e.g. heuristic, llm, manual).';
COMMENT ON COLUMN bot_conversations.topic_confidence IS 'Confidence score for the topic classification.';
COMMENT ON COLUMN bot_conversations.topic_updated_at IS 'Timestamp when topic was last updated.';

CREATE INDEX IF NOT EXISTS idx_bot_conversations_topic
  ON bot_conversations(topic);
