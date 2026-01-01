-- Get team ID(s) from auth user email
-- This query returns the team where the user is the owner, and optionally all teams they're a member of

-- Option 1: Get the team where user is the owner (most common case)
SELECT 
  t.id AS team_id,
  t.name AS team_name,
  t.plan,
  t.created_at AS team_created_at,
  u.email,
  u.id AS user_id,
  'owner' AS role
FROM auth.users u
INNER JOIN bot_user_profiles p ON u.id = p.id
INNER JOIN bot_teams t ON t.owner_id = p.id
WHERE u.email = 'user@example.com';  -- Replace with actual email

-- Option 2: Get all teams where user is a member (including owned teams)
SELECT 
  t.id AS team_id,
  t.name AS team_name,
  t.plan,
  t.created_at AS team_created_at,
  u.email,
  u.id AS user_id,
  COALESCE(tm.role, 'owner') AS role,
  CASE 
    WHEN t.owner_id = p.id THEN true 
    ELSE false 
  END AS is_owner
FROM auth.users u
INNER JOIN bot_user_profiles p ON u.id = p.id
LEFT JOIN bot_teams t ON t.owner_id = p.id
LEFT JOIN bot_team_members tm ON tm.user_id = p.id AND tm.team_id = t.id
WHERE u.email = 'user@example.com'  -- Replace with actual email
UNION
SELECT 
  t.id AS team_id,
  t.name AS team_name,
  t.plan,
  t.created_at AS team_created_at,
  u.email,
  u.id AS user_id,
  tm.role,
  false AS is_owner
FROM auth.users u
INNER JOIN bot_user_profiles p ON u.id = p.id
INNER JOIN bot_team_members tm ON tm.user_id = p.id
INNER JOIN bot_teams t ON t.id = tm.team_id
WHERE u.email = 'user@example.com'  -- Replace with actual email
  AND t.owner_id != p.id  -- Exclude teams where they're already the owner (from first part)
ORDER BY is_owner DESC, team_name;

-- Option 3: Simple query - just get the primary team ID (where user is owner)
-- This is the most common use case since each user gets their own team on signup
SELECT t.id AS team_id
FROM auth.users u
INNER JOIN bot_user_profiles p ON u.id = p.id
INNER JOIN bot_teams t ON t.owner_id = p.id
WHERE u.email = 'user@example.com'  -- Replace with actual email
LIMIT 1;

