-- Add action metadata to canned responses for workflow triggers (e.g., human handoff)

ALTER TABLE bot_canned_responses
  ADD COLUMN IF NOT EXISTS action text,
  ADD COLUMN IF NOT EXISTS action_config jsonb;

ALTER TABLE bot_canned_responses
  ADD CONSTRAINT canned_responses_action_check
  CHECK (action IS NULL OR action IN ('human_request', 'human_takeover_on', 'human_takeover_off'));

COMMENT ON COLUMN bot_canned_responses.action IS 'Optional action to trigger when the canned response matches (e.g., human_request)';
COMMENT ON COLUMN bot_canned_responses.action_config IS 'JSON configuration for the canned response action';
