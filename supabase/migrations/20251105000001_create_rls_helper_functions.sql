-- Helper functions for Row Level Security (RLS) policies
-- These functions improve performance and readability of RLS policies

-- Function: Check if user is a member of a team
-- Returns true if the authenticated user is a member of the specified team
CREATE OR REPLACE FUNCTION public.is_team_member(team_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM bot_team_members
    WHERE team_id = team_uuid
      AND user_id = auth.uid()
  );
$$;

-- Function: Get all team IDs where user is a member
-- Returns a set of team UUIDs for the authenticated user
CREATE OR REPLACE FUNCTION public.user_team_ids()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT team_id
  FROM bot_team_members
  WHERE user_id = auth.uid();
$$;

-- Function: Check if user is team owner or admin
-- Returns true if the authenticated user has owner or admin role in the team
CREATE OR REPLACE FUNCTION public.is_team_admin(team_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM bot_team_members
    WHERE team_id = team_uuid
      AND user_id = auth.uid()
      AND role IN ('owner', 'admin')
  );
$$;

-- Function: Check if user is team owner
-- Returns true if the authenticated user is the owner of the team
CREATE OR REPLACE FUNCTION public.is_team_owner(team_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM bot_team_members
    WHERE team_id = team_uuid
      AND user_id = auth.uid()
      AND role = 'owner'
  );
$$;

-- Add comments for documentation
COMMENT ON FUNCTION public.is_team_member(uuid) IS 'Returns true if the authenticated user is a member of the specified team. Used in RLS policies for team-based access control.';
COMMENT ON FUNCTION public.user_team_ids() IS 'Returns all team IDs where the authenticated user is a member. Used in RLS policies to filter by team membership.';
COMMENT ON FUNCTION public.is_team_admin(uuid) IS 'Returns true if the authenticated user has owner or admin role in the specified team. Used for write operations in RLS policies.';
COMMENT ON FUNCTION public.is_team_owner(uuid) IS 'Returns true if the authenticated user is the owner of the specified team. Used for sensitive operations like team deletion.';

