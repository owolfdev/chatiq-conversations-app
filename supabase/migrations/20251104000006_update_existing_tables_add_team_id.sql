-- Update existing tables to add team_id and other required columns
-- This migration adds team_id to all tenant-scoped tables

-- Add team_id to bot_bots
ALTER TABLE bot_bots 
  ADD COLUMN IF NOT EXISTS team_id uuid REFERENCES bot_teams(id) ON DELETE CASCADE;

-- Add team_id to bot_documents along with other required fields
ALTER TABLE bot_documents 
  ADD COLUMN IF NOT EXISTS team_id uuid REFERENCES bot_teams(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS collection_id uuid REFERENCES bot_collections(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS canonical_url text,
  ADD COLUMN IF NOT EXISTS version integer DEFAULT 1 NOT NULL,
  ADD COLUMN IF NOT EXISTS is_flagged boolean DEFAULT false NOT NULL;

-- Add team_id to bot_conversations
ALTER TABLE bot_conversations 
  ADD COLUMN IF NOT EXISTS team_id uuid REFERENCES bot_teams(id) ON DELETE CASCADE;

-- Add team_id to bot_api_keys
ALTER TABLE bot_api_keys 
  ADD COLUMN IF NOT EXISTS team_id uuid REFERENCES bot_teams(id) ON DELETE CASCADE;

-- Add team_id to bot_logs
ALTER TABLE bot_logs 
  ADD COLUMN IF NOT EXISTS team_id uuid REFERENCES bot_teams(id) ON DELETE CASCADE;

-- Add team_id to bot_user_activity_logs
ALTER TABLE bot_user_activity_logs 
  ADD COLUMN IF NOT EXISTS team_id uuid REFERENCES bot_teams(id) ON DELETE CASCADE;

-- Create indexes for team_id columns (critical for RLS performance)
CREATE INDEX IF NOT EXISTS idx_bot_bots_team_id ON bot_bots(team_id);
CREATE INDEX IF NOT EXISTS idx_bot_documents_team_id ON bot_documents(team_id);
CREATE INDEX IF NOT EXISTS idx_bot_documents_collection_id ON bot_documents(collection_id) WHERE collection_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bot_conversations_team_id ON bot_conversations(team_id);
CREATE INDEX IF NOT EXISTS idx_bot_api_keys_team_id ON bot_api_keys(team_id);
CREATE INDEX IF NOT EXISTS idx_bot_logs_team_id ON bot_logs(team_id);
CREATE INDEX IF NOT EXISTS idx_bot_user_activity_logs_team_id ON bot_user_activity_logs(team_id);

-- Add comments for documentation
COMMENT ON COLUMN bot_bots.team_id IS 'Team that owns this bot. Required for multi-tenant isolation.';
COMMENT ON COLUMN bot_documents.team_id IS 'Team that owns this document. Required for multi-tenant isolation.';
COMMENT ON COLUMN bot_documents.collection_id IS 'Optional collection this document belongs to. Documents can exist without a collection.';
COMMENT ON COLUMN bot_documents.canonical_url IS 'Canonical URL for source citation in chat responses';
COMMENT ON COLUMN bot_documents.version IS 'Document version number for tracking changes';
COMMENT ON COLUMN bot_documents.is_flagged IS 'Flag for content moderation. Flagged documents are excluded from retrieval.';
COMMENT ON COLUMN bot_conversations.team_id IS 'Team that owns this conversation. Required for multi-tenant isolation.';
COMMENT ON COLUMN bot_api_keys.team_id IS 'Team that owns this API key. Required for multi-tenant isolation.';
COMMENT ON COLUMN bot_logs.team_id IS 'Team that owns this log entry. Required for multi-tenant isolation.';
COMMENT ON COLUMN bot_user_activity_logs.team_id IS 'Team context for this activity log. Required for team-scoped analytics.';

