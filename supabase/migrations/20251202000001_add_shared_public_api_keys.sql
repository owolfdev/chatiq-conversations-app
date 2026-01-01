-- Add support for shared public API keys
-- These keys can access any public bot across all teams (for platform admin use)
-- Regular API keys are tied to a specific bot (bot_id is NOT NULL)

-- Allow bot_id to be NULL for shared public keys
ALTER TABLE bot_api_keys 
  ALTER COLUMN bot_id DROP NOT NULL;

-- Allow team_id to be NULL for system-level shared keys
-- System keys (team_id = NULL) can access any public bot
-- Team keys (team_id = NOT NULL, bot_id = NULL) can access public bots in their team
ALTER TABLE bot_api_keys 
  ALTER COLUMN team_id DROP NOT NULL;

-- Add comment explaining the new behavior
COMMENT ON COLUMN bot_api_keys.bot_id IS 
  'Bot ID for bot-specific keys, or NULL for shared public keys';
COMMENT ON COLUMN bot_api_keys.team_id IS 
  'Team ID for team-scoped keys, or NULL for system-level shared keys that work across all teams';

