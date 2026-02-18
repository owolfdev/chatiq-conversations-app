ALTER TABLE bot_conversations
  ADD COLUMN IF NOT EXISTS last_opened_at timestamptz;

COMMENT ON COLUMN bot_conversations.last_opened_at IS 'Timestamp when the conversation was last opened by a team member.';

CREATE INDEX IF NOT EXISTS idx_bot_conversations_last_opened_at
  ON bot_conversations(last_opened_at);

-- Initialize existing conversations as "opened" at rollout time so only future activity appears unread.
UPDATE bot_conversations
SET last_opened_at = NOW()
WHERE last_opened_at IS NULL;
