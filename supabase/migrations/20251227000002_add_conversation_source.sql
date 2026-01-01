-- Add source tracking for conversations
ALTER TABLE bot_conversations
  ADD COLUMN IF NOT EXISTS source text,
  ADD COLUMN IF NOT EXISTS source_detail jsonb;

CREATE INDEX IF NOT EXISTS idx_bot_conversations_source ON bot_conversations(source);
