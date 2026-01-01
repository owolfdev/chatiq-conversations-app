-- Create embedding cache table for chunk caching
-- This table stores embeddings by content hash to avoid re-embedding identical text
-- Caching is team-scoped and model-versioned for safety

CREATE TABLE IF NOT EXISTS bot_embedding_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hash text NOT NULL,
  team_id uuid REFERENCES bot_teams(id) ON DELETE CASCADE NOT NULL,
  model_version text NOT NULL DEFAULT 'text-embedding-3-small-v1',
  vector vector(1536) NOT NULL,
  usage_count integer NOT NULL DEFAULT 1,
  created_at timestamp without time zone DEFAULT now() NOT NULL,
  last_used_at timestamp without time zone DEFAULT now() NOT NULL,
  UNIQUE(hash, team_id, model_version)
);

-- Indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_bot_embedding_cache_hash_team_model 
  ON bot_embedding_cache(hash, team_id, model_version);
CREATE INDEX IF NOT EXISTS idx_bot_embedding_cache_team_id 
  ON bot_embedding_cache(team_id);
CREATE INDEX IF NOT EXISTS idx_bot_embedding_cache_last_used 
  ON bot_embedding_cache(last_used_at);

-- Enable RLS for team isolation
ALTER TABLE bot_embedding_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see embedding cache for their teams"
ON bot_embedding_cache FOR SELECT
USING (
  team_id IN (SELECT public.user_team_ids())
);

CREATE POLICY "Users create embedding cache for their teams"
ON bot_embedding_cache FOR INSERT
WITH CHECK (
  team_id IN (SELECT public.user_team_ids())
);

CREATE POLICY "Users update embedding cache for their teams"
ON bot_embedding_cache FOR UPDATE
USING (
  team_id IN (SELECT public.user_team_ids())
)
WITH CHECK (
  team_id IN (SELECT public.user_team_ids())
);

-- Function to increment usage count and update last_used_at
CREATE OR REPLACE FUNCTION public.increment_cache_usage(
  p_hash text,
  p_team_id uuid,
  p_model_version text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE bot_embedding_cache
  SET 
    usage_count = usage_count + 1,
    last_used_at = now()
  WHERE hash = p_hash
    AND team_id = p_team_id
    AND model_version = p_model_version;
END;
$$;

-- Function to decrement usage count (for cleanup)
CREATE OR REPLACE FUNCTION public.decrement_cache_usage(
  p_hash text,
  p_team_id uuid,
  p_model_version text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE bot_embedding_cache
  SET usage_count = GREATEST(usage_count - 1, 0)
  WHERE hash = p_hash
    AND team_id = p_team_id
    AND model_version = p_model_version;
END;
$$;

-- Comments for documentation
COMMENT ON TABLE bot_embedding_cache IS 'Cache of embeddings by content hash to avoid re-embedding identical text. Team-scoped and model-versioned for safety.';
COMMENT ON COLUMN bot_embedding_cache.hash IS 'SHA256 hash of chunk text content';
COMMENT ON COLUMN bot_embedding_cache.model_version IS 'Embedding model version (e.g., text-embedding-3-small-v1) to handle model changes';
COMMENT ON COLUMN bot_embedding_cache.usage_count IS 'Number of chunks currently using this cached embedding';
COMMENT ON COLUMN bot_embedding_cache.last_used_at IS 'Timestamp when this cache entry was last accessed';

