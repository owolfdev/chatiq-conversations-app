-- Enable pgvector extension for vector similarity search
-- This must be run first before creating tables that use vector columns

CREATE EXTENSION IF NOT EXISTS vector;

-- Verify extension is installed
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'vector'
  ) THEN
    RAISE EXCEPTION 'pgvector extension could not be enabled';
  END IF;
END $$;

COMMENT ON EXTENSION vector IS 'Enables vector similarity search for embeddings';

