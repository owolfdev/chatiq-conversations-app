-- Create bot_team_invites table to track pending invitations
CREATE TABLE IF NOT EXISTS bot_team_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES bot_teams(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  inviter_id uuid REFERENCES bot_user_profiles(id) ON DELETE SET NULL,
  token text NOT NULL,
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at timestamp with time zone,
  cancelled_at timestamp with time zone,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Ensure tokens are unique for acceptance links
CREATE UNIQUE INDEX IF NOT EXISTS idx_bot_team_invites_token_unique
ON bot_team_invites(token);

-- Prevent duplicate active invites per team/email combination
CREATE UNIQUE INDEX IF NOT EXISTS idx_bot_team_invites_unique_active_email
ON bot_team_invites (team_id, lower(email))
WHERE accepted_at IS NULL AND cancelled_at IS NULL;

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_bot_team_invites_team_id
ON bot_team_invites(team_id);

CREATE INDEX IF NOT EXISTS idx_bot_team_invites_email
ON bot_team_invites(lower(email));

-- Comments for documentation
COMMENT ON TABLE bot_team_invites IS 'Pending invitations for team membership, scoped by team and email.';
COMMENT ON COLUMN bot_team_invites.role IS 'Role granted to the invitee once they accept (admin or member).';
COMMENT ON COLUMN bot_team_invites.token IS 'Secure token embedded in invite links for acceptance.';
COMMENT ON COLUMN bot_team_invites.expires_at IS 'Expiration timestamp after which the invite becomes invalid.';

-- Enable Row Level Security
ALTER TABLE bot_team_invites ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Team admins can view invites"
ON bot_team_invites FOR SELECT
USING (public.is_team_admin(team_id));

CREATE POLICY "Team admins can create invites"
ON bot_team_invites FOR INSERT
WITH CHECK (public.is_team_admin(team_id));

CREATE POLICY "Team admins can update invites"
ON bot_team_invites FOR UPDATE
USING (public.is_team_admin(team_id))
WITH CHECK (public.is_team_admin(team_id));

CREATE POLICY "Team admins can delete invites"
ON bot_team_invites FOR DELETE
USING (public.is_team_admin(team_id));

