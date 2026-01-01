-- Helper function to run semantic search over bot embeddings
CREATE OR REPLACE FUNCTION match_bot_embeddings(
  p_query_embedding vector(1536),
  p_team_id uuid,
  p_bot_id uuid,
  p_limit integer DEFAULT 12
)
RETURNS TABLE (
  chunk_id uuid,
  document_id uuid,
  canonical_url text,
  anchor_id text,
  chunk_text text,
  similarity double precision
)
LANGUAGE sql
STABLE
AS $$
WITH eligible_documents AS (
  SELECT d.id
  FROM bot_documents d
  LEFT JOIN bot_document_links l
    ON l.document_id = d.id
  WHERE d.team_id = p_team_id
    AND d.is_flagged = false
    AND (d.is_global = true OR l.bot_id = p_bot_id)
),
ranked_embeddings AS (
  SELECT
    e.chunk_id,
    c.document_id,
    d.canonical_url,
    c.anchor_id,
    c.text,
    1 - (e.vector <=> p_query_embedding) AS similarity
  FROM bot_embeddings e
  JOIN bot_doc_chunks c
    ON c.id = e.chunk_id
  JOIN bot_documents d
    ON d.id = c.document_id
  WHERE c.document_id IN (SELECT id FROM eligible_documents)
  ORDER BY e.vector <=> p_query_embedding
  LIMIT COALESCE(p_limit, 12)
)
SELECT
  chunk_id,
  document_id,
  canonical_url,
  anchor_id,
  text AS chunk_text,
  similarity
FROM ranked_embeddings
ORDER BY similarity DESC;
$$;

COMMENT ON FUNCTION match_bot_embeddings(vector(1536), uuid, uuid, integer)
IS 'Returns the most relevant chunks for a query embedding scoped to a team/bot combination.';

