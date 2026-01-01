ALTER TABLE bot_conversations
  ADD COLUMN IF NOT EXISTS resolution_status text NOT NULL DEFAULT 'unresolved';

ALTER TABLE bot_conversations
  ADD CONSTRAINT bot_conversations_resolution_status_check
  CHECK (resolution_status IN ('resolved', 'unresolved'));

CREATE INDEX IF NOT EXISTS idx_bot_conversations_resolution_status
  ON bot_conversations(resolution_status);
