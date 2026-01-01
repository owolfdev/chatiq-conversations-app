-- Create table to cache OpenAI responses with embedding-based similarity matching
-- This enables automatic caching of responses to reduce costs and improve response times

CREATE TABLE IF NOT EXISTS bot_response_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_id uuid NOT NULL REFERENCES bot_bots(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES bot_teams(id) ON DELETE CASCADE,
  cache_key text NOT NULL, -- Hash of normalized message + system_prompt_hash for exact matches
  message text NOT NULL, -- Normalized message (lowercase, trimmed)
  response text NOT NULL, -- Cached OpenAI response
  message_embedding vector(1536) NOT NULL, -- Embedding for similarity search (text-embedding-3-small)
  system_prompt_hash text NOT NULL, -- SHA256 hash of bot's system_prompt for cache invalidation
  hit_count integer NOT NULL DEFAULT 0, -- Number of times this cache entry was used
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  expires_at timestamp with time zone NOT NULL, -- TTL expiration (7 days from creation to prevent stale responses)
  UNIQUE(bot_id, cache_key)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_bot_response_cache_bot_id 
  ON bot_response_cache(bot_id);

CREATE INDEX IF NOT EXISTS idx_bot_response_cache_team_id 
  ON bot_response_cache(team_id);

CREATE INDEX IF NOT EXISTS idx_bot_response_cache_cache_key 
  ON bot_response_cache(cache_key);

CREATE INDEX IF NOT EXISTS idx_bot_response_cache_system_prompt_hash 
  ON bot_response_cache(system_prompt_hash);

CREATE INDEX IF NOT EXISTS idx_bot_response_cache_expires_at 
  ON bot_response_cache(expires_at);

-- Create HNSW index for vector similarity search (same as bot_embeddings)
CREATE INDEX IF NOT EXISTS idx_bot_response_cache_message_embedding 
  ON bot_response_cache 
  USING hnsw (message_embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Create function to find similar cached responses using vector similarity
-- Uses very high similarity threshold (0.98) by default to prioritize accuracy over cost savings
CREATE OR REPLACE FUNCTION match_cached_responses(
  p_query_embedding vector(1536),
  p_bot_id uuid,
  p_system_prompt_hash text,
  p_similarity_threshold float DEFAULT 0.98, -- Very high threshold for accuracy (prevents semantically similar but different questions from matching)
  p_limit integer DEFAULT 1
)
RETURNS TABLE (
  id uuid,
  message text,
  response text,
  similarity float,
  hit_count integer
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.message,
    c.response,
    1 - (c.message_embedding <=> p_query_embedding) AS similarity,
    c.hit_count
  FROM bot_response_cache c
  WHERE 
    c.bot_id = p_bot_id
    AND c.system_prompt_hash = p_system_prompt_hash
    AND c.expires_at > now()
    AND 1 - (c.message_embedding <=> p_query_embedding) >= p_similarity_threshold
  ORDER BY c.message_embedding <=> p_query_embedding
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON TABLE bot_response_cache IS 'Caches OpenAI responses with embedding-based similarity matching. Reduces costs and improves response times for common queries.';
COMMENT ON COLUMN bot_response_cache.cache_key IS 'Hash of normalized message + system_prompt_hash for exact match lookups';
COMMENT ON COLUMN bot_response_cache.message IS 'Normalized message (lowercase, trimmed, extra spaces removed) used for caching';
COMMENT ON COLUMN bot_response_cache.message_embedding IS 'Vector embedding (1536 dimensions) using OpenAI text-embedding-3-small for similarity search';
COMMENT ON COLUMN bot_response_cache.system_prompt_hash IS 'SHA256 hash of bot system_prompt. Used to invalidate cache when prompt changes';
COMMENT ON COLUMN bot_response_cache.expires_at IS 'TTL expiration timestamp. Cache entries expire after 7 days to prevent stale responses as the app evolves. Expired entries should be cleaned up periodically.';
COMMENT ON FUNCTION match_cached_responses IS 'Finds similar cached responses using vector similarity search. Uses high threshold (0.95) by default to prioritize accuracy - only returns near-exact matches to avoid inaccurate responses. Returns results above similarity threshold, ordered by similarity';

