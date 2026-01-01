-- Enable Row Level Security (RLS) on API keys, logs, and audit tables
-- These tables support API access, logging, and security auditing

-- Enable RLS on bot_api_keys
ALTER TABLE bot_api_keys ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see API keys from their teams
CREATE POLICY "Users see API keys from their teams"
ON bot_api_keys FOR SELECT
USING (
  team_id IN (SELECT public.user_team_ids())
);

-- Policy: Users can create API keys in their teams
CREATE POLICY "Users create API keys in their teams"
ON bot_api_keys FOR INSERT
WITH CHECK (
  team_id IN (SELECT public.user_team_ids())
);

-- Policy: Team members can update API keys in their teams
CREATE POLICY "Team members can update API keys in their teams"
ON bot_api_keys FOR UPDATE
USING (
  team_id IN (SELECT public.user_team_ids())
)
WITH CHECK (
  team_id IN (SELECT public.user_team_ids())
);

-- Policy: Team members can delete API keys in their teams
CREATE POLICY "Team members can delete API keys in their teams"
ON bot_api_keys FOR DELETE
USING (
  team_id IN (SELECT public.user_team_ids())
);

-- Enable RLS on bot_logs
ALTER TABLE bot_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see logs from their teams
CREATE POLICY "Users see logs from their teams"
ON bot_logs FOR SELECT
USING (
  team_id IN (SELECT public.user_team_ids())
);

-- Policy: System can create logs (this is typically done via service role, not RLS)
-- For regular users, logs are created via triggers or server-side code
-- This policy allows authenticated users to insert logs for their teams
CREATE POLICY "Users can create logs in their teams"
ON bot_logs FOR INSERT
WITH CHECK (
  team_id IN (SELECT public.user_team_ids())
);

-- Policy: Team members can update logs in their teams (rare, but allowed)
CREATE POLICY "Team members can update logs in their teams"
ON bot_logs FOR UPDATE
USING (
  team_id IN (SELECT public.user_team_ids())
)
WITH CHECK (
  team_id IN (SELECT public.user_team_ids())
);

-- Policy: Team admins can delete logs in their teams
CREATE POLICY "Team admins can delete logs in their teams"
ON bot_logs FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM bot_team_members
    WHERE team_id = bot_logs.team_id
      AND user_id = auth.uid()
      AND role IN ('owner', 'admin')
  )
);

-- Enable RLS on bot_user_activity_logs
ALTER TABLE bot_user_activity_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see their own activity logs or logs from their teams
CREATE POLICY "Users see their activity logs or team activity logs"
ON bot_user_activity_logs FOR SELECT
USING (
  user_id = auth.uid() OR
  (team_id IS NOT NULL AND team_id IN (SELECT public.user_team_ids()))
);

-- Policy: System can create activity logs
-- Activity logs are typically created server-side
CREATE POLICY "Users can create activity logs"
ON bot_user_activity_logs FOR INSERT
WITH CHECK (
  user_id = auth.uid() OR
  (team_id IS NOT NULL AND team_id IN (SELECT public.user_team_ids()))
);

-- Policy: Activity logs are typically read-only, but allow updates for corrections
CREATE POLICY "Users can update their own activity logs"
ON bot_user_activity_logs FOR UPDATE
USING (
  user_id = auth.uid()
)
WITH CHECK (
  user_id = auth.uid()
);

-- Enable RLS on bot_audit_log
ALTER TABLE bot_audit_log ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see audit logs from their teams
-- Audit logs are critical for security, so team members can view them
CREATE POLICY "Users see audit logs from their teams"
ON bot_audit_log FOR SELECT
USING (
  team_id IS NULL OR
  team_id IN (SELECT public.user_team_ids())
);

-- Policy: System can create audit logs (typically via service role)
-- Authenticated users can also insert audit logs for their teams
CREATE POLICY "Users can create audit logs for their teams"
ON bot_audit_log FOR INSERT
WITH CHECK (
  team_id IS NULL OR
  team_id IN (SELECT public.user_team_ids())
);

-- Policy: Audit logs should be immutable (no updates allowed)
-- Only allow deletion by team admins for compliance/privacy reasons
CREATE POLICY "Team admins can delete audit logs from their teams"
ON bot_audit_log FOR DELETE
USING (
  team_id IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM bot_team_members
    WHERE team_id = bot_audit_log.team_id
      AND user_id = auth.uid()
      AND role IN ('owner', 'admin')
  )
);

-- Add comments for documentation
COMMENT ON POLICY "Users see API keys from their teams" ON bot_api_keys IS 'Enforces team-based API key isolation. API keys are only visible to team members.';
COMMENT ON POLICY "Users see audit logs from their teams" ON bot_audit_log IS 'Enforces team-based audit log access. Audit logs are visible to team members for security transparency.';

