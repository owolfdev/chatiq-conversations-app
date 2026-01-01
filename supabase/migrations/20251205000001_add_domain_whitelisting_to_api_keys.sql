-- Add domain whitelisting and widget-specific fields to bot_api_keys
-- This allows API keys to be restricted to specific domains for security

-- Add allowed_domains column (array of domains, e.g., ['example.com', 'www.example.com'])
ALTER TABLE bot_api_keys 
  ADD COLUMN IF NOT EXISTS allowed_domains text[] DEFAULT NULL;

-- Add is_widget_only flag (for keys specifically created for widget embedding)
ALTER TABLE bot_api_keys 
  ADD COLUMN IF NOT EXISTS is_widget_only boolean DEFAULT false NOT NULL;

-- Add index for domain lookups (using GIN index for array searches)
CREATE INDEX IF NOT EXISTS idx_bot_api_keys_allowed_domains 
  ON bot_api_keys USING GIN (allowed_domains) 
  WHERE allowed_domains IS NOT NULL;

-- Add comment explaining the fields
COMMENT ON COLUMN bot_api_keys.allowed_domains IS 
  'Array of allowed domains for this API key. If NULL, key works on any domain. If set, key only works when request origin matches one of these domains.';

COMMENT ON COLUMN bot_api_keys.is_widget_only IS 
  'If true, this key is intended for widget embedding. Helps users identify keys created specifically for public embedding.';

