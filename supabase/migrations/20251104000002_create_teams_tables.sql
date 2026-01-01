-- Create bot_teams table (root tenant entity)
-- This table represents the top-level tenant isolation boundary

CREATE TABLE IF NOT EXISTS bot_teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES bot_user_profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  plan text DEFAULT 'free' NOT NULL CHECK (plan IN ('free', 'pro', 'team', 'enterprise')),
  stripe_customer_id text,
  created_at timestamp without time zone DEFAULT now() NOT NULL,
  updated_at timestamp without time zone DEFAULT now()
);

-- Create bot_team_members table (team membership & roles)
-- Junction table for team membership with role-based access control

CREATE TABLE IF NOT EXISTS bot_team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid REFERENCES bot_teams(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES bot_user_profiles(id) ON DELETE CASCADE NOT NULL,
  role text DEFAULT 'member' NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
  created_at timestamp without time zone DEFAULT now() NOT NULL,
  UNIQUE(team_id, user_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_bot_teams_owner_id ON bot_teams(owner_id);
CREATE INDEX IF NOT EXISTS idx_bot_teams_stripe_customer_id ON bot_teams(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bot_team_members_team_id ON bot_team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_bot_team_members_user_id ON bot_team_members(user_id);

-- Add comments for documentation
COMMENT ON TABLE bot_teams IS 'Root tenant entity for multi-tenancy isolation. Each team is a separate tenant.';
COMMENT ON TABLE bot_team_members IS 'Junction table for team membership with role-based access control (owner, admin, member).';
COMMENT ON COLUMN bot_teams.plan IS 'Subscription plan: free, pro, team, or enterprise';
COMMENT ON COLUMN bot_team_members.role IS 'User role within the team: owner (full control), admin (manage team), member (read/write)';

