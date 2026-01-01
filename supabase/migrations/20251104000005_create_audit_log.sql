-- Create bot_audit_log table (security audit trail)
-- Tracks all security-relevant events for compliance and debugging

CREATE TABLE IF NOT EXISTS bot_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid REFERENCES bot_teams(id) ON DELETE CASCADE,
  user_id uuid REFERENCES bot_user_profiles(id) ON DELETE SET NULL,
  action text NOT NULL,
  resource_type text NOT NULL, -- 'bot', 'document', 'api_key', 'team', 'conversation', etc.
  resource_id uuid,
  metadata jsonb,
  ip_address text,
  user_agent text,
  created_at timestamp without time zone DEFAULT now() NOT NULL
);

-- Create indexes for performance and common queries
CREATE INDEX IF NOT EXISTS idx_bot_audit_log_team_id ON bot_audit_log(team_id) WHERE team_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bot_audit_log_user_id ON bot_audit_log(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bot_audit_log_action ON bot_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_bot_audit_log_resource_type ON bot_audit_log(resource_type);
CREATE INDEX IF NOT EXISTS idx_bot_audit_log_created_at ON bot_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bot_audit_log_resource ON bot_audit_log(resource_type, resource_id) WHERE resource_id IS NOT NULL;

-- Add comments for documentation
COMMENT ON TABLE bot_audit_log IS 'Security audit trail logging all security-relevant events for compliance and debugging.';
COMMENT ON COLUMN bot_audit_log.action IS 'Action performed: create, update, delete, read, login, logout, etc.';
COMMENT ON COLUMN bot_audit_log.resource_type IS 'Type of resource affected: bot, document, api_key, team, conversation, etc.';
COMMENT ON COLUMN bot_audit_log.metadata IS 'Additional context about the action in JSON format';
COMMENT ON COLUMN bot_audit_log.ip_address IS 'IP address of the user who performed the action';
COMMENT ON COLUMN bot_audit_log.user_agent IS 'User agent string of the client';

