-- Create admin_pricing table for managing OpenAI model pricing
-- This allows admins to update pricing without code changes

CREATE TABLE IF NOT EXISTS admin_pricing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model text NOT NULL UNIQUE, -- e.g., 'gpt-3.5-turbo', 'text-embedding-3-small'
  input_price_per_1m_tokens numeric(10, 6) NOT NULL, -- Price per 1M input tokens
  output_price_per_1m_tokens numeric(10, 6) NOT NULL DEFAULT 0, -- Price per 1M output tokens (0 for embeddings)
  effective_from timestamp with time zone DEFAULT now() NOT NULL, -- When this pricing became effective
  effective_until timestamp with time zone, -- When this pricing was superseded (NULL = current)
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL, -- Admin who created/updated this pricing
  notes text -- Optional notes about pricing change
);

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_pricing_model ON admin_pricing(model);
CREATE INDEX IF NOT EXISTS idx_pricing_effective ON admin_pricing(effective_from, effective_until);

-- Enable RLS
ALTER TABLE admin_pricing ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Only platform admins can read pricing
CREATE POLICY "Only platform admins can view pricing"
ON admin_pricing FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM bot_user_profiles
    WHERE bot_user_profiles.id = auth.uid()
      AND bot_user_profiles.role = 'admin'
  )
);

-- RLS Policy: Only platform admins can update pricing
CREATE POLICY "Only platform admins can update pricing"
ON admin_pricing FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM bot_user_profiles
    WHERE bot_user_profiles.id = auth.uid()
      AND bot_user_profiles.role = 'admin'
  )
);

-- Insert default pricing (as of 2024)
-- These can be updated via admin UI
INSERT INTO admin_pricing (model, input_price_per_1m_tokens, output_price_per_1m_tokens, notes) VALUES
  ('gpt-3.5-turbo', 0.5, 1.5, 'Default pricing as of 2024'),
  ('gpt-4o-mini', 0.15, 0.6, 'Default pricing as of 2024'),
  ('gpt-4o', 2.5, 10.0, 'Default pricing as of 2024'),
  ('text-embedding-3-small', 0.02, 0, 'Default pricing as of 2024'),
  ('text-embedding-3-large', 0.13, 0, 'Default pricing as of 2024'),
  ('text-moderation-latest', 0.1, 0, 'Default pricing as of 2024')
ON CONFLICT (model) DO NOTHING;

-- Add comments
COMMENT ON TABLE admin_pricing IS 'Stores OpenAI model pricing, updateable by platform admins without code changes';
COMMENT ON COLUMN admin_pricing.effective_from IS 'When this pricing became effective (for historical cost accuracy)';
COMMENT ON COLUMN admin_pricing.effective_until IS 'When this pricing was superseded (NULL = current active pricing)';

