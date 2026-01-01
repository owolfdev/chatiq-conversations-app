-- Deterministic (FTS) chunk search scoped to team + bot
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
  rank double precision
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
    ts_rank_cd(to_tsvector('english', c.text), query.q) AS rank
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
  rank
FROM ranked_chunks
ORDER BY rank DESC;
$$;

COMMENT ON FUNCTION match_bot_chunks_deterministic(text, uuid, uuid, integer)
IS 'Returns the most relevant chunks using deterministic FTS, scoped to a team/bot combination. Uses SECURITY DEFINER to bypass RLS when called with admin/service role client. Security is enforced via team_id and bot_id parameters.';
