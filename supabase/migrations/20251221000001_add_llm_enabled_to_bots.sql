-- Add llm_enabled column to bot_bots table
-- This allows users to toggle LLM on/off for individual bots
-- When disabled, bots will only use pre-configured responses, cache, or default responses

ALTER TABLE bot_bots 
  ADD COLUMN IF NOT EXISTS llm_enabled boolean NOT NULL DEFAULT true;

-- Add comment for documentation
COMMENT ON COLUMN bot_bots.llm_enabled IS 'When false, LLM generation is disabled. Bot will only use pre-configured responses, cache, or default_response. Useful for testing, cost savings, or when AI is not needed.';
