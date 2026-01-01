-- Handle user deletion cascade from auth.users to bot_user_profiles
-- When a user is deleted from auth.users, we need to clean up their profile and related data

-- Function: Clean up user profile and related data when auth user is deleted
CREATE OR REPLACE FUNCTION public.handle_user_deletion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete user profile (this will cascade to teams, team_members, etc. due to foreign keys)
  DELETE FROM public.bot_user_profiles WHERE id = OLD.id;
  
  RETURN OLD;
END;
$$;

-- Trigger: Run handle_user_deletion() when a user is deleted from auth.users
-- Note: This is a BEFORE DELETE trigger to ensure cleanup happens before auth.users deletion
DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;
CREATE TRIGGER on_auth_user_deleted
  BEFORE DELETE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_user_deletion();

-- Add comment for documentation
COMMENT ON FUNCTION public.handle_user_deletion() IS 'Automatically deletes user profile and all related data (teams, bots, documents, etc.) when a user is deleted from auth.users. Cascades through foreign key relationships.';

