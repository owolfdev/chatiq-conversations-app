-- Enable Row Level Security (RLS) on collections and embeddings tables
-- These tables support document organization and RAG (Retrieval-Augmented Generation)

-- Enable RLS on bot_collections
ALTER TABLE bot_collections ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see collections from their teams
CREATE POLICY "Users see collections from their teams"
ON bot_collections FOR SELECT
USING (
  team_id IN (SELECT public.user_team_ids())
);

-- Policy: Users can create collections in their teams
CREATE POLICY "Users create collections in their teams"
ON bot_collections FOR INSERT
WITH CHECK (
  team_id IN (SELECT public.user_team_ids())
);

-- Policy: Team members can update collections in their teams
CREATE POLICY "Team members can update collections in their teams"
ON bot_collections FOR UPDATE
USING (
  team_id IN (SELECT public.user_team_ids())
)
WITH CHECK (
  team_id IN (SELECT public.user_team_ids())
);

-- Policy: Team members can delete collections in their teams
CREATE POLICY "Team members can delete collections in their teams"
ON bot_collections FOR DELETE
USING (
  team_id IN (SELECT public.user_team_ids())
);

-- Enable RLS on bot_collection_links
ALTER TABLE bot_collection_links ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see collection links for collections in their teams
-- Derive team_id from bot_id or collection_id
CREATE POLICY "Users see collection links for their teams"
ON bot_collection_links FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM bot_bots b
    WHERE b.id = bot_collection_links.bot_id
      AND b.team_id IN (SELECT public.user_team_ids())
  ) OR
  EXISTS (
    SELECT 1 FROM bot_collections c
    WHERE c.id = bot_collection_links.collection_id
      AND c.team_id IN (SELECT public.user_team_ids())
  )
);

-- Policy: Users can create collection links for bots in their teams
CREATE POLICY "Users create collection links for their teams"
ON bot_collection_links FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM bot_bots b
    WHERE b.id = bot_collection_links.bot_id
      AND b.team_id IN (SELECT public.user_team_ids())
  )
);

-- Policy: Team members can delete collection links for their teams
CREATE POLICY "Team members can delete collection links for their teams"
ON bot_collection_links FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM bot_bots b
    WHERE b.id = bot_collection_links.bot_id
      AND b.team_id IN (SELECT public.user_team_ids())
  )
);

-- Enable RLS on bot_doc_chunks
ALTER TABLE bot_doc_chunks ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see document chunks from their teams
CREATE POLICY "Users see document chunks from their teams"
ON bot_doc_chunks FOR SELECT
USING (
  team_id IN (SELECT public.user_team_ids())
);

-- Policy: Users can create document chunks in their teams
CREATE POLICY "Users create document chunks in their teams"
ON bot_doc_chunks FOR INSERT
WITH CHECK (
  team_id IN (SELECT public.user_team_ids())
);

-- Policy: Team members can update document chunks in their teams
CREATE POLICY "Team members can update document chunks in their teams"
ON bot_doc_chunks FOR UPDATE
USING (
  team_id IN (SELECT public.user_team_ids())
)
WITH CHECK (
  team_id IN (SELECT public.user_team_ids())
);

-- Policy: Team members can delete document chunks in their teams
CREATE POLICY "Team members can delete document chunks in their teams"
ON bot_doc_chunks FOR DELETE
USING (
  team_id IN (SELECT public.user_team_ids())
);

-- Enable RLS on bot_embeddings
ALTER TABLE bot_embeddings ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see embeddings from their teams
CREATE POLICY "Users see embeddings from their teams"
ON bot_embeddings FOR SELECT
USING (
  team_id IN (SELECT public.user_team_ids())
);

-- Policy: Users can create embeddings in their teams
CREATE POLICY "Users create embeddings in their teams"
ON bot_embeddings FOR INSERT
WITH CHECK (
  team_id IN (SELECT public.user_team_ids())
);

-- Policy: Team members can update embeddings in their teams
CREATE POLICY "Team members can update embeddings in their teams"
ON bot_embeddings FOR UPDATE
USING (
  team_id IN (SELECT public.user_team_ids())
)
WITH CHECK (
  team_id IN (SELECT public.user_team_ids())
);

-- Policy: Team members can delete embeddings in their teams
CREATE POLICY "Team members can delete embeddings in their teams"
ON bot_embeddings FOR DELETE
USING (
  team_id IN (SELECT public.user_team_ids())
);

-- Add comments for documentation
COMMENT ON POLICY "Users see collections from their teams" ON bot_collections IS 'Enforces team-based collection isolation. Collections are only visible to team members.';
COMMENT ON POLICY "Users see embeddings from their teams" ON bot_embeddings IS 'Enforces team-based embedding isolation. Embeddings are only accessible to team members for RAG queries.';

