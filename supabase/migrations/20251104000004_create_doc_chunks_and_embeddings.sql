-- Create bot_doc_chunks table (document chunks for RAG)
-- Documents are split into chunks (~600 tokens) for embedding and retrieval

CREATE TABLE IF NOT EXISTS bot_doc_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid REFERENCES bot_teams(id) ON DELETE CASCADE NOT NULL,
  document_id uuid REFERENCES bot_documents(id) ON DELETE CASCADE NOT NULL,
  idx integer NOT NULL CHECK (idx >= 0),
  text text NOT NULL,
  anchor_id text,
  hash text NOT NULL,
  created_at timestamp without time zone DEFAULT now() NOT NULL,
  UNIQUE(document_id, idx)
);

-- Create bot_embeddings table (vector embeddings using pgvector)
-- Stores vector embeddings for document chunks to enable semantic search

CREATE TABLE IF NOT EXISTS bot_embeddings (
  chunk_id uuid PRIMARY KEY REFERENCES bot_doc_chunks(id) ON DELETE CASCADE NOT NULL,
  team_id uuid REFERENCES bot_teams(id) ON DELETE CASCADE NOT NULL,
  collection_id uuid REFERENCES bot_collections(id) ON DELETE CASCADE,
  vector vector(1536) NOT NULL, -- OpenAI text-embedding-3-small uses 1536 dimensions
  created_at timestamp without time zone DEFAULT now() NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_bot_doc_chunks_team_id ON bot_doc_chunks(team_id);
CREATE INDEX IF NOT EXISTS idx_bot_doc_chunks_document_id ON bot_doc_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_bot_doc_chunks_hash ON bot_doc_chunks(hash);
CREATE INDEX IF NOT EXISTS idx_bot_embeddings_team_id ON bot_embeddings(team_id);
CREATE INDEX IF NOT EXISTS idx_bot_embeddings_collection_id ON bot_embeddings(collection_id) WHERE collection_id IS NOT NULL;

-- Create vector similarity search index (HNSW for fast approximate nearest neighbor search)
-- Using HNSW algorithm which is optimized for high-dimensional vectors
CREATE INDEX IF NOT EXISTS idx_bot_embeddings_vector ON bot_embeddings 
  USING hnsw (vector vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Add comments for documentation
COMMENT ON TABLE bot_doc_chunks IS 'Document chunks created by splitting documents into ~600 token segments for embedding and retrieval.';
COMMENT ON TABLE bot_embeddings IS 'Vector embeddings stored using pgvector. Each chunk is embedded using OpenAI text-embedding-3-small (1536 dimensions).';
COMMENT ON COLUMN bot_doc_chunks.idx IS 'Zero-based index of chunk within the document';
COMMENT ON COLUMN bot_doc_chunks.hash IS 'Hash of chunk content for deduplication';
COMMENT ON COLUMN bot_doc_chunks.anchor_id IS 'Anchor ID for linking back to source document section';
COMMENT ON COLUMN bot_embeddings.vector IS 'Vector embedding (1536 dimensions) using OpenAI text-embedding-3-small';
COMMENT ON COLUMN bot_embeddings.collection_id IS 'Optional collection ID for scoped retrieval. If NULL, chunk is globally accessible within team.';

