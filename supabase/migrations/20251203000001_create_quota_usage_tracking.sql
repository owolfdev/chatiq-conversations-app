-- Create table to track monthly OpenAI API call counts per team
-- This tracks actual OpenAI API usage (not canned responses or cached messages)
-- Separate from message saving, so it works for both private and non-private mode

CREATE TABLE IF NOT EXISTS bot_quota_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES bot_teams(id) ON DELETE CASCADE,
  month_start timestamp with time zone NOT NULL, -- First day of the month (UTC)
  openai_api_calls integer NOT NULL DEFAULT 0, -- Count of OpenAI API calls this month
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(team_id, month_start)
);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_bot_quota_usage_team_month 
  ON bot_quota_usage(team_id, month_start);

CREATE INDEX IF NOT EXISTS idx_bot_quota_usage_team_id 
  ON bot_quota_usage(team_id);

-- Add comments for documentation
COMMENT ON TABLE bot_quota_usage IS 'Tracks monthly OpenAI API call counts per team. Incremented for every OpenAI API call (not canned responses or cached messages). Works for both private and non-private mode conversations.';
COMMENT ON COLUMN bot_quota_usage.month_start IS 'First day of the month (UTC) for this quota period. Used to reset monthly quotas.';
COMMENT ON COLUMN bot_quota_usage.openai_api_calls IS 'Total number of OpenAI API calls made this month. Incremented for every successful OpenAI API response, regardless of whether messages are saved to database.';

-- Create function to atomically increment OpenAI API call count
CREATE OR REPLACE FUNCTION increment_quota_usage(
  p_team_id uuid,
  p_month_start timestamp with time zone
) RETURNS void AS $$
BEGIN
  INSERT INTO bot_quota_usage (team_id, month_start, openai_api_calls, updated_at)
  VALUES (p_team_id, p_month_start, 1, now())
  ON CONFLICT (team_id, month_start)
  DO UPDATE SET
    openai_api_calls = bot_quota_usage.openai_api_calls + 1,
    updated_at = now();
END;
$$ LANGUAGE plpgsql;

