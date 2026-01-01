-- Add context_chunk_ids column to persist pinned retrieval context per conversation
ALTER TABLE bot_conversations
  ADD COLUMN IF NOT EXISTS context_chunk_ids jsonb DEFAULT '[]'::jsonb NOT NULL;

COMMENT ON COLUMN bot_conversations.context_chunk_ids IS 'Pinned retrieval chunk identifiers (array of UUID strings) reused across conversation turns.';

