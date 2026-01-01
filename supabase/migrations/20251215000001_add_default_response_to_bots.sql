-- Add default_response column to bot_bots table
-- This field stores a fallback response when LLM is unavailable and no canned response matches

ALTER TABLE bot_bots 
  ADD COLUMN IF NOT EXISTS default_response text;

-- Add comment for documentation
COMMENT ON COLUMN bot_bots.default_response IS 'Default response shown when LLM is unavailable (expired free tier, API down, etc.) and no canned response matches. This is separate from canned responses and provides a graceful fallback.';

