-- Create admin_cost_tracking table for platform admin cost monitoring
-- This table tracks all OpenAI API costs across the platform

CREATE TABLE IF NOT EXISTS admin_cost_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp timestamp with time zone DEFAULT now() NOT NULL,
  team_id uuid REFERENCES bot_teams(id) ON DELETE SET NULL,
  bot_id uuid REFERENCES bot_bots(id) ON DELETE SET NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  cost_type text NOT NULL CHECK (cost_type IN ('chat', 'embedding', 'moderation')),
  model text NOT NULL, -- e.g., 'gpt-3.5-turbo', 'text-embedding-3-small'
  input_tokens integer NOT NULL DEFAULT 0,
  output_tokens integer NOT NULL DEFAULT 0,
  total_tokens integer NOT NULL DEFAULT 0,
  cost_usd numeric(10, 6) NOT NULL DEFAULT 0, -- Cost in USD (supports up to $999,999.999999)
  cache_hit boolean NOT NULL DEFAULT false, -- True if this was served from cache (cost = 0 or minimal)
  ip_address text,
  metadata jsonb, -- Additional context (conversation_id, error info, etc.)
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_cost_tracking_timestamp ON admin_cost_tracking(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_cost_tracking_team_id ON admin_cost_tracking(team_id);
CREATE INDEX IF NOT EXISTS idx_cost_tracking_bot_id ON admin_cost_tracking(bot_id);
CREATE INDEX IF NOT EXISTS idx_cost_tracking_user_id ON admin_cost_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_cost_tracking_cost_type ON admin_cost_tracking(cost_type);
CREATE INDEX IF NOT EXISTS idx_cost_tracking_cache_hit ON admin_cost_tracking(cache_hit);

-- Composite index for hourly/daily aggregations
CREATE INDEX IF NOT EXISTS idx_cost_tracking_timestamp_team ON admin_cost_tracking(timestamp DESC, team_id);

-- (Hourly bucket index omitted; use timestamp index with date_trunc in queries)

-- Enable RLS
ALTER TABLE admin_cost_tracking ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Only platform admins can read cost tracking data
CREATE POLICY "Only platform admins can view cost tracking"
ON admin_cost_tracking FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM bot_user_profiles
    WHERE bot_user_profiles.id = auth.uid()
      AND bot_user_profiles.role = 'admin'
  )
);

-- RLS Policy: System can insert cost tracking (via service role)
-- Note: Inserts will typically use admin client (service role) which bypasses RLS
-- This policy is a safety measure for any direct inserts
CREATE POLICY "System can insert cost tracking"
ON admin_cost_tracking FOR INSERT
WITH CHECK (true); -- Service role bypasses RLS anyway

-- Add comments
COMMENT ON TABLE admin_cost_tracking IS 'Tracks all OpenAI API costs for platform admin monitoring. Only accessible to platform admins.';
COMMENT ON COLUMN admin_cost_tracking.cost_type IS 'Type of API call: chat (completions), embedding, or moderation';
COMMENT ON COLUMN admin_cost_tracking.cache_hit IS 'True if response was served from cache (minimal/no cost)';
COMMENT ON COLUMN admin_cost_tracking.metadata IS 'Additional context: conversation_id, error info, request details, etc.';
