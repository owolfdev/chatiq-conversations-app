-- Add support for IP-based rate limiting for public requests
-- This allows each IP address to have its own rate limit pool instead of sharing the bot owner's team quota

-- Make team_id nullable to support IP-based rate limits
ALTER TABLE bot_rate_limits 
  ALTER COLUMN team_id DROP NOT NULL;

-- Create unique index on (ip_address, date) for IP-based rate limiting
-- This ensures one record per IP address per day
CREATE UNIQUE INDEX IF NOT EXISTS idx_bot_rate_limits_ip_date 
  ON bot_rate_limits(ip_address, date)
  WHERE ip_address IS NOT NULL;

-- Create index for performance on IP lookups
CREATE INDEX IF NOT EXISTS idx_bot_rate_limits_ip_address 
  ON bot_rate_limits(ip_address)
  WHERE ip_address IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN bot_rate_limits.ip_address IS 'IP address for IP-based rate limiting (used for public/unauthenticated requests). When set, team_id may be NULL.';
COMMENT ON INDEX idx_bot_rate_limits_ip_date IS 'Unique index for IP-based rate limiting. One record per IP address per day.';

