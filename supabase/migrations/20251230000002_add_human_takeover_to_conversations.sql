ALTER TABLE bot_conversations
  ADD COLUMN IF NOT EXISTS human_takeover boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS human_takeover_until timestamp with time zone;

CREATE INDEX IF NOT EXISTS idx_bot_conversations_human_takeover
  ON bot_conversations(human_takeover, human_takeover_until);
