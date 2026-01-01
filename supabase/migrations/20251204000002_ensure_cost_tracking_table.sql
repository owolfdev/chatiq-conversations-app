-- Ensure admin_cost_tracking table exists
-- This migration is idempotent and safe to run multiple times

DO $$
BEGIN
  -- Check if table exists, if not create it
  IF NOT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'admin_cost_tracking'
  ) THEN
    -- Create the table
    CREATE TABLE admin_cost_tracking (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      timestamp timestamp with time zone DEFAULT now() NOT NULL,
      team_id uuid REFERENCES bot_teams(id) ON DELETE SET NULL,
      bot_id uuid REFERENCES bot_bots(id) ON DELETE SET NULL,
      user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
      cost_type text NOT NULL CHECK (cost_type IN ('chat', 'embedding', 'moderation')),
      model text NOT NULL,
      input_tokens integer NOT NULL DEFAULT 0,
      output_tokens integer NOT NULL DEFAULT 0,
      total_tokens integer NOT NULL DEFAULT 0,
      cost_usd numeric(10, 6) NOT NULL DEFAULT 0,
      cache_hit boolean NOT NULL DEFAULT false,
      ip_address text,
      metadata jsonb,
      created_at timestamp with time zone DEFAULT now() NOT NULL
    );

    -- Create indexes
    CREATE INDEX IF NOT EXISTS idx_cost_tracking_timestamp ON admin_cost_tracking(timestamp DESC);
    CREATE INDEX IF NOT EXISTS idx_cost_tracking_team_id ON admin_cost_tracking(team_id);
    CREATE INDEX IF NOT EXISTS idx_cost_tracking_bot_id ON admin_cost_tracking(bot_id);
    CREATE INDEX IF NOT EXISTS idx_cost_tracking_user_id ON admin_cost_tracking(user_id);
    CREATE INDEX IF NOT EXISTS idx_cost_tracking_cost_type ON admin_cost_tracking(cost_type);
    CREATE INDEX IF NOT EXISTS idx_cost_tracking_cache_hit ON admin_cost_tracking(cache_hit);
    CREATE INDEX IF NOT EXISTS idx_cost_tracking_timestamp_team ON admin_cost_tracking(timestamp DESC, team_id);

    -- Enable RLS
    ALTER TABLE admin_cost_tracking ENABLE ROW LEVEL SECURITY;

    -- Create RLS policies if they don't exist
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' 
      AND tablename = 'admin_cost_tracking' 
      AND policyname = 'Only platform admins can view cost tracking'
    ) THEN
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
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' 
      AND tablename = 'admin_cost_tracking' 
      AND policyname = 'System can insert cost tracking'
    ) THEN
      CREATE POLICY "System can insert cost tracking"
      ON admin_cost_tracking FOR INSERT
      WITH CHECK (true);
    END IF;

    -- Add comments
    COMMENT ON TABLE admin_cost_tracking IS 'Tracks all OpenAI API costs for platform admin monitoring. Only accessible to platform admins.';
    COMMENT ON COLUMN admin_cost_tracking.cost_type IS 'Type of API call: chat (completions), embedding, or moderation';
    COMMENT ON COLUMN admin_cost_tracking.cache_hit IS 'True if response was served from cache (minimal/no cost)';
    COMMENT ON COLUMN admin_cost_tracking.metadata IS 'Additional context: conversation_id, error info, request details, etc.';
  END IF;
END $$;

