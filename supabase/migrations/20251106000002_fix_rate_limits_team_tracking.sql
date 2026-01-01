-- Fix rate limit tracking to use team_id instead of per-key tracking
-- This ensures all bots/keys in a team share the same rate limit pool
-- and prevents bypassing limits by using multiple keys

-- Add team_id column to bot_rate_limits
ALTER TABLE bot_rate_limits 
  ADD COLUMN IF NOT EXISTS team_id uuid REFERENCES bot_teams(id) ON DELETE CASCADE;

-- Migrate existing rate limit data to use team_id
-- For API key-based limits: get team_id from bot_api_keys -> bot_bots -> team_id
UPDATE bot_rate_limits rl
SET team_id = (
  SELECT b.team_id
  FROM bot_api_keys ak
  JOIN bot_bots b ON ak.bot_id = b.id
  WHERE ak.key = rl.api_key
  LIMIT 1
)
WHERE rl.api_key IS NOT NULL 
  AND rl.team_id IS NULL;

-- For bot_slug-based limits (internal): get team_id from bot_bots
-- Note: This is approximate since we don't store bot_slug in rate_limits
-- For IP-based limits, we'll set to NULL (they'll use free plan limits)
-- In practice, since there are no keys in use yet, we can clean up old data

-- Delete old rate limit entries that don't have a team_id
-- (these are likely IP-based or from before teams existed)
DELETE FROM bot_rate_limits WHERE team_id IS NULL;

-- Now make team_id NOT NULL
ALTER TABLE bot_rate_limits 
  ALTER COLUMN team_id SET NOT NULL;

-- Create unique index on (team_id, date) to ensure one record per team per day
CREATE UNIQUE INDEX IF NOT EXISTS idx_bot_rate_limits_team_date 
  ON bot_rate_limits(team_id, date);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_bot_rate_limits_team_id 
  ON bot_rate_limits(team_id);

-- Drop old indexes/columns that are no longer needed
-- Keep api_key and ip_address columns for now (nullable) in case we need them for debugging
-- They can be dropped later if not needed

-- Add comment for documentation
COMMENT ON COLUMN bot_rate_limits.team_id IS 'Team that owns this rate limit. All bots/keys in a team share the same rate limit pool.';
COMMENT ON TABLE bot_rate_limits IS 'Tracks daily rate limit usage per team. All bots and API keys within a team share the same rate limit pool based on the team subscription plan.';

