-- Create base user profile table used across the application
-- Placed at the end of the existing migration chain to avoid ordering conflicts on projects

CREATE TABLE IF NOT EXISTS bot_user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text,
  username text UNIQUE,
  bio text,
  avatar_url text,
  public_email text,
  website text,
  location text,
  twitter_handle text,
  github_handle text,
  plan text NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'team', 'enterprise', 'admin')),
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  is_verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_bot_user_profiles_email ON bot_user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_bot_user_profiles_username ON bot_user_profiles(username);

COMMENT ON TABLE bot_user_profiles IS 'User profile metadata linked to auth.users; drives plans, roles, and personalization.';
