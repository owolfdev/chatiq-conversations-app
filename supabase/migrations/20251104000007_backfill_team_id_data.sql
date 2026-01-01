-- Backfill team_id data for existing records
-- This migration creates default teams for existing users and assigns existing data to teams

-- Step 1: Create default teams for all existing users who don't have a team
-- Each user gets a default team named "My Team"
INSERT INTO bot_teams (owner_id, name, plan)
SELECT 
  id as owner_id,
  'My Team' as name,
  COALESCE(plan, 'free') as plan
FROM bot_user_profiles
WHERE NOT EXISTS (
  SELECT 1 FROM bot_teams WHERE owner_id = bot_user_profiles.id
)
ON CONFLICT DO NOTHING;

-- Step 2: Create team_member records for all team owners
INSERT INTO bot_team_members (team_id, user_id, role)
SELECT 
  t.id as team_id,
  t.owner_id as user_id,
  'owner' as role
FROM bot_teams t
WHERE NOT EXISTS (
  SELECT 1 FROM bot_team_members 
  WHERE team_id = t.id AND user_id = t.owner_id
)
ON CONFLICT (team_id, user_id) DO NOTHING;

-- Step 3: Backfill team_id in bot_bots from user_id
-- Assign each bot to the team owned by the bot's user_id
UPDATE bot_bots
SET team_id = (
  SELECT t.id 
  FROM bot_teams t 
  WHERE t.owner_id = bot_bots.user_id
  LIMIT 1
)
WHERE team_id IS NULL AND user_id IS NOT NULL;

-- Step 4: Backfill team_id in bot_documents from bot_id or user_id
-- First try to get team_id from bot_id, then fall back to user_id
UPDATE bot_documents
SET team_id = (
  SELECT COALESCE(
    (SELECT b.team_id FROM bot_bots b WHERE b.id = bot_documents.bot_id),
    (SELECT t.id FROM bot_teams t WHERE t.owner_id = bot_documents.user_id)
  )
  LIMIT 1
)
WHERE team_id IS NULL AND (bot_id IS NOT NULL OR user_id IS NOT NULL);

-- Step 5: Backfill team_id in bot_conversations from bot_id
UPDATE bot_conversations
SET team_id = (
  SELECT b.team_id 
  FROM bot_bots b 
  WHERE b.id = bot_conversations.bot_id
  LIMIT 1
)
WHERE team_id IS NULL AND bot_id IS NOT NULL;

-- Step 6: Backfill team_id in bot_api_keys from bot_id
UPDATE bot_api_keys
SET team_id = (
  SELECT b.team_id 
  FROM bot_bots b 
  WHERE b.id = bot_api_keys.bot_id
  LIMIT 1
)
WHERE team_id IS NULL AND bot_id IS NOT NULL;

-- Step 7: Backfill team_id in bot_logs from bot_id
UPDATE bot_logs
SET team_id = (
  SELECT b.team_id 
  FROM bot_bots b 
  WHERE b.id = bot_logs.bot_id
  LIMIT 1
)
WHERE team_id IS NULL AND bot_id IS NOT NULL;

-- Step 8: Backfill team_id in bot_user_activity_logs from user_id
-- Assign to the user's primary team (first team they own or are a member of)
UPDATE bot_user_activity_logs
SET team_id = (
  SELECT COALESCE(
    (SELECT t.id FROM bot_teams t WHERE t.owner_id = bot_user_activity_logs.user_id LIMIT 1),
    (SELECT tm.team_id FROM bot_team_members tm WHERE tm.user_id = bot_user_activity_logs.user_id LIMIT 1)
  )
  LIMIT 1
)
WHERE team_id IS NULL AND user_id IS NOT NULL;

-- Step 9: Set NOT NULL constraints after backfilling
-- Only set NOT NULL if all records have been backfilled successfully
-- We'll check if there are any NULL values first

DO $$
BEGIN
  -- Check and set NOT NULL for bot_bots.team_id
  IF NOT EXISTS (SELECT 1 FROM bot_bots WHERE team_id IS NULL) THEN
    ALTER TABLE bot_bots ALTER COLUMN team_id SET NOT NULL;
  END IF;

  -- Check and set NOT NULL for bot_documents.team_id
  IF NOT EXISTS (SELECT 1 FROM bot_documents WHERE team_id IS NULL) THEN
    ALTER TABLE bot_documents ALTER COLUMN team_id SET NOT NULL;
  END IF;

  -- Check and set NOT NULL for bot_conversations.team_id
  IF NOT EXISTS (SELECT 1 FROM bot_conversations WHERE team_id IS NULL) THEN
    ALTER TABLE bot_conversations ALTER COLUMN team_id SET NOT NULL;
  END IF;

  -- Check and set NOT NULL for bot_api_keys.team_id
  IF NOT EXISTS (SELECT 1 FROM bot_api_keys WHERE team_id IS NULL) THEN
    ALTER TABLE bot_api_keys ALTER COLUMN team_id SET NOT NULL;
  END IF;

  -- Check and set NOT NULL for bot_logs.team_id
  IF NOT EXISTS (SELECT 1 FROM bot_logs WHERE team_id IS NULL) THEN
    ALTER TABLE bot_logs ALTER COLUMN team_id SET NOT NULL;
  END IF;
END $$;

-- Note: bot_user_activity_logs.team_id can remain nullable since some activities
-- might not have a team context (e.g., global user actions)

