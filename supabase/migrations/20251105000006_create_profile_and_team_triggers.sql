-- Create database triggers for automatic profile bootstrap and team membership creation
-- These triggers run automatically when a new user signs up via Supabase Auth

-- Function: Create user profile when a new auth user is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert user profile
  INSERT INTO public.bot_user_profiles (id, email, plan, role, created_at)
  VALUES (
    NEW.id,
    NEW.email,
    'free',
    'user',
    NOW()
  )
  ON CONFLICT (id) DO NOTHING; -- Prevent duplicate inserts

  RETURN NEW;
END;
$$;

-- Trigger: Run handle_new_user() when a new user is created in auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Function: Create team and team membership when a user profile is created
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
  INSERT INTO public.bot_teams (owner_id, name, plan, created_at)
  VALUES (
    NEW.id,
    'My Team',
    COALESCE(NEW.plan, 'free'),
    NOW()
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

-- Trigger: Run handle_new_user_profile() when a user profile is created
DROP TRIGGER IF EXISTS on_user_profile_created ON public.bot_user_profiles;
CREATE TRIGGER on_user_profile_created
  AFTER INSERT ON public.bot_user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_profile();

-- Add comments for documentation
COMMENT ON FUNCTION public.handle_new_user() IS 'Automatically creates a user profile when a new user signs up via Supabase Auth.';
COMMENT ON FUNCTION public.handle_new_user_profile() IS 'Automatically creates a team and team membership when a user profile is created.';
-- Note: Cannot comment on trigger in auth schema due to permissions
-- Trigger on_auth_user_created fires when a new user is created in auth.users table (via Supabase Auth signup)
COMMENT ON TRIGGER on_user_profile_created ON public.bot_user_profiles IS 'Fires when a user profile is created, automatically creating a default team and team membership.';

