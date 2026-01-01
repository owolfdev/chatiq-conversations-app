-- Create table to queue embedding jobs for document chunks
-- Workers pick up jobs, generate embeddings, and populate bot_embeddings

CREATE TABLE IF NOT EXISTS bot_embedding_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chunk_id uuid UNIQUE REFERENCES bot_doc_chunks(id) ON DELETE CASCADE NOT NULL,
  team_id uuid REFERENCES bot_teams(id) ON DELETE CASCADE NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  attempts integer NOT NULL DEFAULT 0,
  error text,
  locked_at timestamp without time zone,
  locked_by text,
  created_at timestamp without time zone DEFAULT now() NOT NULL,
  updated_at timestamp without time zone DEFAULT now() NOT NULL
);

-- Indexes for efficient worker lookups
CREATE INDEX IF NOT EXISTS idx_bot_embedding_jobs_status ON bot_embedding_jobs(status);
CREATE INDEX IF NOT EXISTS idx_bot_embedding_jobs_team_id ON bot_embedding_jobs(team_id);
CREATE INDEX IF NOT EXISTS idx_bot_embedding_jobs_locked_at ON bot_embedding_jobs(locked_at);

-- Trigger to keep updated_at fresh
CREATE OR REPLACE FUNCTION public.touch_bot_embedding_jobs()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_touch_bot_embedding_jobs ON bot_embedding_jobs;
CREATE TRIGGER trg_touch_bot_embedding_jobs
BEFORE UPDATE ON bot_embedding_jobs
FOR EACH ROW
EXECUTE FUNCTION public.touch_bot_embedding_jobs();

-- Enable RLS and add team-based policies
ALTER TABLE bot_embedding_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see embedding jobs for their teams"
ON bot_embedding_jobs FOR SELECT
USING (
  team_id IN (SELECT public.user_team_ids())
);

CREATE POLICY "Users create embedding jobs for their teams"
ON bot_embedding_jobs FOR INSERT
WITH CHECK (
  team_id IN (SELECT public.user_team_ids())
);

CREATE POLICY "Users update embedding jobs for their teams"
ON bot_embedding_jobs FOR UPDATE
USING (
  team_id IN (SELECT public.user_team_ids())
)
WITH CHECK (
  team_id IN (SELECT public.user_team_ids())
);

CREATE POLICY "Users delete embedding jobs for their teams"
ON bot_embedding_jobs FOR DELETE
USING (
  team_id IN (SELECT public.user_team_ids())
);

COMMENT ON TABLE bot_embedding_jobs IS 'Queue of pending embeddings for document chunks. Workers generate vectors and populate bot_embeddings.';
COMMENT ON COLUMN bot_embedding_jobs.chunk_id IS 'Document chunk awaiting embedding.';
COMMENT ON COLUMN bot_embedding_jobs.status IS 'Job lifecycle status: pending, processing, completed, or failed.';
COMMENT ON COLUMN bot_embedding_jobs.locked_by IS 'Identifier for worker currently processing the job.';


