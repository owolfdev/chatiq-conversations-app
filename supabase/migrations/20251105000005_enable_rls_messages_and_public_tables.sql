-- Enable Row Level Security (RLS) on messages and public-facing tables
-- These tables support conversations and public features

-- Enable RLS on bot_messages
ALTER TABLE bot_messages ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see messages from conversations in their teams
-- Derive team_id from conversation_id → bot_id → team_id
CREATE POLICY "Users see messages from their teams"
ON bot_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM bot_conversations conv
    JOIN bot_bots b ON b.id = conv.bot_id
    WHERE conv.id = bot_messages.conversation_id
      AND b.team_id IN (SELECT public.user_team_ids())
  )
);

-- Policy: Users can create messages in conversations from their teams
CREATE POLICY "Users create messages in their teams"
ON bot_messages FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM bot_conversations conv
    JOIN bot_bots b ON b.id = conv.bot_id
    WHERE conv.id = bot_messages.conversation_id
      AND b.team_id IN (SELECT public.user_team_ids())
  )
);

-- Policy: Team members can update messages in their teams
CREATE POLICY "Team members can update messages in their teams"
ON bot_messages FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM bot_conversations conv
    JOIN bot_bots b ON b.id = conv.bot_id
    WHERE conv.id = bot_messages.conversation_id
      AND b.team_id IN (SELECT public.user_team_ids())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM bot_conversations conv
    JOIN bot_bots b ON b.id = conv.bot_id
    WHERE conv.id = bot_messages.conversation_id
      AND b.team_id IN (SELECT public.user_team_ids())
  )
);

-- Policy: Team members can delete messages in their teams
CREATE POLICY "Team members can delete messages in their teams"
ON bot_messages FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM bot_conversations conv
    JOIN bot_bots b ON b.id = conv.bot_id
    WHERE conv.id = bot_messages.conversation_id
      AND b.team_id IN (SELECT public.user_team_ids())
  )
);

-- Note: bot_contact_messages is a public contact form, no RLS needed
-- It's accessible to unauthenticated users for support inquiries

-- Note: bot_rate_limits doesn't need RLS - it's system-managed
-- Access is controlled via application logic, not RLS

-- Note: bot_user_profiles doesn't need RLS for basic access
-- Users can see their own profile and public profiles
-- However, we can add RLS if needed for additional privacy

-- Enable RLS on bot_user_profiles (optional, for privacy)
ALTER TABLE bot_user_profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see their own profile
CREATE POLICY "Users see their own profile"
ON bot_user_profiles FOR SELECT
USING (id = auth.uid());

-- Policy: Users can update their own profile
CREATE POLICY "Users update their own profile"
ON bot_user_profiles FOR UPDATE
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Policy: Profile creation is handled by Supabase Auth triggers
-- Users cannot directly insert profiles (handled server-side)

-- Add comments for documentation
COMMENT ON POLICY "Users see messages from their teams" ON bot_messages IS 'Enforces team-based message isolation. Messages are accessible via conversation → bot → team relationship.';
COMMENT ON POLICY "Users see their own profile" ON bot_user_profiles IS 'Enforces privacy - users can only see and update their own profile.';

