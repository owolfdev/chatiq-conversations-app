-- Enable Row Level Security (RLS) on core tenant-scoped tables
-- These tables require team-based isolation for multi-tenancy

-- Enable RLS on bot_teams
ALTER TABLE bot_teams ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see teams they are members of
CREATE POLICY "Users see only their teams"
ON bot_teams FOR SELECT
USING (public.is_team_member(id));

-- Policy: Users can create teams (they become owner automatically via team_members)
-- Only authenticated users can create teams
CREATE POLICY "Authenticated users can create teams"
ON bot_teams FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Policy: Only team owners can update team settings
CREATE POLICY "Team owners can update teams"
ON bot_teams FOR UPDATE
USING (public.is_team_owner(id))
WITH CHECK (public.is_team_owner(id));

-- Policy: Only team owners can delete teams
CREATE POLICY "Team owners can delete teams"
ON bot_teams FOR DELETE
USING (public.is_team_owner(id));

-- Enable RLS on bot_team_members
ALTER TABLE bot_team_members ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see team memberships for teams they belong to
CREATE POLICY "Users see team memberships for their teams"
ON bot_team_members FOR SELECT
USING (public.is_team_member(team_id));

-- Policy: Only team owners and admins can add members
CREATE POLICY "Team admins can add members"
ON bot_team_members FOR INSERT
WITH CHECK (public.is_team_admin(team_id));

-- Policy: Only team owners can change roles (prevent privilege escalation)
-- Admins can update but cannot change roles to owner/admin
CREATE POLICY "Team owners can update members, admins can update non-admin roles"
ON bot_team_members FOR UPDATE
USING (public.is_team_admin(team_id))
WITH CHECK (
  public.is_team_owner(team_id) OR
  (public.is_team_admin(team_id) AND role IN ('member'))
);

-- Policy: Only team owners can remove members
CREATE POLICY "Team owners can remove members"
ON bot_team_members FOR DELETE
USING (public.is_team_owner(team_id));

-- Enable RLS on bot_bots
ALTER TABLE bot_bots ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see bots from their teams
-- Public bots are visible to all authenticated users for read-only access
CREATE POLICY "Users see bots from their teams or public bots"
ON bot_bots FOR SELECT
USING (
  team_id IN (SELECT public.user_team_ids()) OR
  (is_public = true AND auth.uid() IS NOT NULL)
);

-- Policy: Users can create bots in their teams
CREATE POLICY "Users create bots in their teams"
ON bot_bots FOR INSERT
WITH CHECK (
  team_id IN (SELECT public.user_team_ids())
);

-- Policy: Team members can update bots in their teams
CREATE POLICY "Team members can update bots in their teams"
ON bot_bots FOR UPDATE
USING (
  team_id IN (SELECT public.user_team_ids())
)
WITH CHECK (
  team_id IN (SELECT public.user_team_ids())
);

-- Policy: Team members can delete bots in their teams
CREATE POLICY "Team members can delete bots in their teams"
ON bot_bots FOR DELETE
USING (
  team_id IN (SELECT public.user_team_ids())
);

-- Enable RLS on bot_documents
ALTER TABLE bot_documents ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see documents from their teams
CREATE POLICY "Users see documents from their teams"
ON bot_documents FOR SELECT
USING (
  team_id IN (SELECT public.user_team_ids())
);

-- Policy: Users can create documents in their teams
CREATE POLICY "Users create documents in their teams"
ON bot_documents FOR INSERT
WITH CHECK (
  team_id IN (SELECT public.user_team_ids())
);

-- Policy: Team members can update documents in their teams
CREATE POLICY "Team members can update documents in their teams"
ON bot_documents FOR UPDATE
USING (
  team_id IN (SELECT public.user_team_ids())
)
WITH CHECK (
  team_id IN (SELECT public.user_team_ids())
);

-- Policy: Team members can delete documents in their teams
CREATE POLICY "Team members can delete documents in their teams"
ON bot_documents FOR DELETE
USING (
  team_id IN (SELECT public.user_team_ids())
);

-- Enable RLS on bot_conversations
ALTER TABLE bot_conversations ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see conversations from their teams
CREATE POLICY "Users see conversations from their teams"
ON bot_conversations FOR SELECT
USING (
  team_id IN (SELECT public.user_team_ids())
);

-- Policy: Users can create conversations in their teams
CREATE POLICY "Users create conversations in their teams"
ON bot_conversations FOR INSERT
WITH CHECK (
  team_id IN (SELECT public.user_team_ids())
);

-- Policy: Team members can update conversations in their teams
CREATE POLICY "Team members can update conversations in their teams"
ON bot_conversations FOR UPDATE
USING (
  team_id IN (SELECT public.user_team_ids())
)
WITH CHECK (
  team_id IN (SELECT public.user_team_ids())
);

-- Policy: Team members can delete conversations in their teams
CREATE POLICY "Team members can delete conversations in their teams"
ON bot_conversations FOR DELETE
USING (
  team_id IN (SELECT public.user_team_ids())
);

-- Add comments for documentation
COMMENT ON POLICY "Users see only their teams" ON bot_teams IS 'Enforces team-based isolation. Users can only see teams they are members of.';
COMMENT ON POLICY "Users see bots from their teams or public bots" ON bot_bots IS 'Users can see bots from their teams. Public bots are visible to all authenticated users for read-only access.';
COMMENT ON POLICY "Users see documents from their teams" ON bot_documents IS 'Enforces team-based document isolation. Documents are only visible to team members.';

