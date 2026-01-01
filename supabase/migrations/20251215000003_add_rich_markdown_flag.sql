-- Add toggle for rich/markdown responses on bots
ALTER TABLE bot_bots
  ADD COLUMN IF NOT EXISTS rich_responses_enabled BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN bot_bots.rich_responses_enabled IS
  'When true, bot responses are prompted to return Markdown-formatted answers.';
