-- Create tables for documentation site import jobs

CREATE TABLE IF NOT EXISTS bot_document_import_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid REFERENCES bot_teams(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id),
  base_url text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  total_count integer NOT NULL DEFAULT 0,
  processed_count integer NOT NULL DEFAULT 0,
  success_count integer NOT NULL DEFAULT 0,
  failure_count integer NOT NULL DEFAULT 0,
  is_global boolean NOT NULL DEFAULT false,
  linked_bot_ids uuid[],
  tags text[],
  created_at timestamp without time zone DEFAULT now() NOT NULL,
  updated_at timestamp without time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS bot_document_import_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid REFERENCES bot_document_import_jobs(id) ON DELETE CASCADE NOT NULL,
  team_id uuid REFERENCES bot_teams(id) ON DELETE CASCADE NOT NULL,
  url text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  attempts integer NOT NULL DEFAULT 0,
  error text,
  document_id uuid REFERENCES bot_documents(id) ON DELETE SET NULL,
  title text,
  locked_at timestamp without time zone,
  locked_by text,
  created_at timestamp without time zone DEFAULT now() NOT NULL,
  updated_at timestamp without time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_bot_document_import_jobs_team_id ON bot_document_import_jobs(team_id);
CREATE INDEX IF NOT EXISTS idx_bot_document_import_jobs_status ON bot_document_import_jobs(status);
CREATE INDEX IF NOT EXISTS idx_bot_document_import_items_job_id ON bot_document_import_items(job_id);
CREATE INDEX IF NOT EXISTS idx_bot_document_import_items_status ON bot_document_import_items(status);
CREATE INDEX IF NOT EXISTS idx_bot_document_import_items_team_id ON bot_document_import_items(team_id);

CREATE OR REPLACE FUNCTION public.touch_bot_document_import_jobs()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_touch_bot_document_import_jobs ON bot_document_import_jobs;
CREATE TRIGGER trg_touch_bot_document_import_jobs
BEFORE UPDATE ON bot_document_import_jobs
FOR EACH ROW
EXECUTE FUNCTION public.touch_bot_document_import_jobs();

CREATE OR REPLACE FUNCTION public.touch_bot_document_import_items()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_touch_bot_document_import_items ON bot_document_import_items;
CREATE TRIGGER trg_touch_bot_document_import_items
BEFORE UPDATE ON bot_document_import_items
FOR EACH ROW
EXECUTE FUNCTION public.touch_bot_document_import_items();

ALTER TABLE bot_document_import_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_document_import_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see document import jobs for their teams"
ON bot_document_import_jobs FOR SELECT
USING (
  team_id IN (SELECT public.user_team_ids())
);

CREATE POLICY "Users create document import jobs for their teams"
ON bot_document_import_jobs FOR INSERT
WITH CHECK (
  team_id IN (SELECT public.user_team_ids())
);

CREATE POLICY "Users update document import jobs for their teams"
ON bot_document_import_jobs FOR UPDATE
USING (
  team_id IN (SELECT public.user_team_ids())
)
WITH CHECK (
  team_id IN (SELECT public.user_team_ids())
);

CREATE POLICY "Users delete document import jobs for their teams"
ON bot_document_import_jobs FOR DELETE
USING (
  team_id IN (SELECT public.user_team_ids())
);

CREATE POLICY "Users see document import items for their teams"
ON bot_document_import_items FOR SELECT
USING (
  team_id IN (SELECT public.user_team_ids())
);

CREATE POLICY "Users create document import items for their teams"
ON bot_document_import_items FOR INSERT
WITH CHECK (
  team_id IN (SELECT public.user_team_ids())
);

CREATE POLICY "Users update document import items for their teams"
ON bot_document_import_items FOR UPDATE
USING (
  team_id IN (SELECT public.user_team_ids())
)
WITH CHECK (
  team_id IN (SELECT public.user_team_ids())
);

CREATE POLICY "Users delete document import items for their teams"
ON bot_document_import_items FOR DELETE
USING (
  team_id IN (SELECT public.user_team_ids())
);

COMMENT ON TABLE bot_document_import_jobs IS 'Queues for multi-page documentation imports.';
COMMENT ON TABLE bot_document_import_items IS 'Individual URL imports queued under a documentation import job.';
