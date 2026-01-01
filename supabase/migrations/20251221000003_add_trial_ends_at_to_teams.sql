-- Add trial_ends_at to bot_teams for explicit free trial expiry control
ALTER TABLE bot_teams
  ADD COLUMN IF NOT EXISTS trial_ends_at timestamp without time zone;

-- Backfill existing teams with a 30-day trial window if missing
UPDATE bot_teams
SET trial_ends_at = created_at + interval '30 days'
WHERE trial_ends_at IS NULL;

-- Ensure new teams get a default trial end timestamp
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_team_id uuid;
BEGIN
  -- Create a default team for the new user
  INSERT INTO public.bot_teams (owner_id, name, plan, created_at, trial_ends_at)
  VALUES (
    NEW.id,
    'My Team',
    COALESCE(NEW.plan, 'free'),
    NOW(),
    NOW() + interval '30 days'
  )
  RETURNING id INTO new_team_id;

  -- Create team membership with owner role
  INSERT INTO public.bot_team_members (team_id, user_id, role, created_at)
  VALUES (
    new_team_id,
    NEW.id,
    'owner',
    NOW()
  )
  ON CONFLICT (team_id, user_id) DO NOTHING; -- Prevent duplicate inserts

  RETURN NEW;
END;
$$;

COMMENT ON COLUMN bot_teams.trial_ends_at IS 'Explicit free trial end timestamp; overrides created_at-based trial length.';
