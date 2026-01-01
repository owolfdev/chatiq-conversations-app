-- Include language metadata in retrieval functions

DROP FUNCTION IF EXISTS match_bot_embeddings(vector(1536), uuid, uuid, integer);
DROP FUNCTION IF EXISTS match_bot_chunks_deterministic(text, uuid, uuid, integer);

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
  similarity double precision,
  chunk_language text,
  document_language text,
  translation_group_id text
)
LANGUAGE sql
SECURITY DEFINER
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
    1 - (e.vector <=> p_query_embedding) AS similarity,
    c.language AS chunk_language,
    d.language AS document_language,
    d.translation_group_id
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
  similarity,
  chunk_language,
  document_language,
  translation_group_id
FROM ranked_embeddings
ORDER BY similarity DESC;
$$;

CREATE OR REPLACE FUNCTION match_bot_chunks_deterministic(
  p_query text,
  p_team_id uuid,
  p_bot_id uuid,
  p_limit integer DEFAULT 6
)
RETURNS TABLE (
  chunk_id uuid,
  document_id uuid,
  canonical_url text,
  anchor_id text,
  chunk_text text,
  rank double precision,
  chunk_language text,
  document_language text,
  translation_group_id text
)
LANGUAGE sql
SECURITY DEFINER
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
query AS (
  SELECT websearch_to_tsquery('english', p_query) AS q
),
ranked_chunks AS (
  SELECT
    c.id AS chunk_id,
    c.document_id,
    d.canonical_url,
    c.anchor_id,
    c.text AS chunk_text,
    ts_rank_cd(to_tsvector('english', c.text), query.q) AS rank,
    c.language AS chunk_language,
    d.language AS document_language,
    d.translation_group_id
  FROM bot_doc_chunks c
  JOIN bot_documents d
    ON d.id = c.document_id
  CROSS JOIN query
  WHERE c.document_id IN (SELECT id FROM eligible_documents)
    AND to_tsvector('english', c.text) @@ query.q
  ORDER BY rank DESC
  LIMIT COALESCE(p_limit, 6)
)
SELECT
  chunk_id,
  document_id,
  canonical_url,
  anchor_id,
  chunk_text,
  rank,
  chunk_language,
  document_language,
  translation_group_id
FROM ranked_chunks
ORDER BY rank DESC;
$$;
