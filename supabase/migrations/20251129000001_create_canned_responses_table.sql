-- Create bot_canned_responses table for pre-LLM pattern matching responses
-- This enables instant, zero-cost responses to common queries like greetings, thanks, etc.

CREATE TABLE IF NOT EXISTS bot_canned_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_id uuid REFERENCES bot_bots(id) ON DELETE CASCADE NOT NULL,
  team_id uuid REFERENCES bot_teams(id) ON DELETE CASCADE NOT NULL,
  
  -- Pattern matching fields
  pattern text NOT NULL,  -- e.g., "hi|hello|hey" or "thank you"
  pattern_type text NOT NULL DEFAULT 'regex',  -- 'regex', 'keyword', 'exact'
  
  -- Response content
  response text NOT NULL,
  
  -- Matching configuration
  case_sensitive boolean DEFAULT false NOT NULL,
  fuzzy_threshold integer DEFAULT 1 NOT NULL,  -- Levenshtein distance (0-3, 0 = disabled)
  
  -- Priority and ordering
  priority integer DEFAULT 0 NOT NULL,  -- Higher priority = checked first
  enabled boolean DEFAULT true NOT NULL,
  
  created_at timestamp DEFAULT now() NOT NULL,
  updated_at timestamp DEFAULT now() NOT NULL,
  
  -- Note: team_id validation is enforced at the application level
  -- The foreign keys to bot_bots and bot_teams provide referential integrity
  
  -- Validate pattern_type
  CONSTRAINT check_pattern_type CHECK (pattern_type IN ('regex', 'keyword', 'exact')),
  
  -- Validate fuzzy_threshold range
  CONSTRAINT check_fuzzy_threshold CHECK (fuzzy_threshold >= 0 AND fuzzy_threshold <= 3)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_canned_responses_bot ON bot_canned_responses(bot_id, enabled, priority DESC);
CREATE INDEX IF NOT EXISTS idx_canned_responses_team ON bot_canned_responses(team_id);
CREATE INDEX IF NOT EXISTS idx_canned_responses_enabled ON bot_canned_responses(bot_id, enabled) WHERE enabled = true;

-- Add comments for documentation
COMMENT ON TABLE bot_canned_responses IS 'Pre-LLM pattern matching responses for instant, zero-cost replies to common queries';
COMMENT ON COLUMN bot_canned_responses.pattern IS 'Pattern to match against user input (regex, keyword phrase, or exact string)';
COMMENT ON COLUMN bot_canned_responses.pattern_type IS 'Type of pattern matching: regex (regex pattern), keyword (phrase matching), or exact (exact string match)';
COMMENT ON COLUMN bot_canned_responses.response IS 'Response text to return when pattern matches';
COMMENT ON COLUMN bot_canned_responses.case_sensitive IS 'Whether pattern matching should be case-sensitive';
COMMENT ON COLUMN bot_canned_responses.fuzzy_threshold IS 'Levenshtein distance threshold for typo tolerance (0 = disabled, 1-3 = allowed character differences)';
COMMENT ON COLUMN bot_canned_responses.priority IS 'Priority order for checking patterns (higher = checked first)';
COMMENT ON COLUMN bot_canned_responses.enabled IS 'Whether this canned response is active';

-- Enable RLS
ALTER TABLE bot_canned_responses ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see canned responses from their teams
CREATE POLICY "Users see canned responses from their teams"
ON bot_canned_responses FOR SELECT
USING (
  team_id IN (SELECT public.user_team_ids())
);

-- Policy: Team members can create canned responses in their teams
CREATE POLICY "Team members create canned responses in their teams"
ON bot_canned_responses FOR INSERT
WITH CHECK (
  team_id IN (SELECT public.user_team_ids())
);

-- Policy: Team members can update canned responses in their teams
CREATE POLICY "Team members update canned responses in their teams"
ON bot_canned_responses FOR UPDATE
USING (
  team_id IN (SELECT public.user_team_ids())
)
WITH CHECK (
  team_id IN (SELECT public.user_team_ids())
);

-- Policy: Team members can delete canned responses in their teams
CREATE POLICY "Team members delete canned responses in their teams"
ON bot_canned_responses FOR DELETE
USING (
  team_id IN (SELECT public.user_team_ids())
);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_canned_responses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_canned_responses_updated_at
  BEFORE UPDATE ON bot_canned_responses
  FOR EACH ROW
  EXECUTE FUNCTION update_canned_responses_updated_at();

