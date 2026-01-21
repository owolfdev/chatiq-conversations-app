-- Create push subscriptions and notification preferences

CREATE TABLE IF NOT EXISTS bot_push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  team_id uuid NOT NULL REFERENCES bot_teams(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen timestamptz NOT NULL DEFAULT now(),
  disabled_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_bot_push_subscriptions_endpoint
  ON bot_push_subscriptions (endpoint);

CREATE INDEX IF NOT EXISTS idx_bot_push_subscriptions_user
  ON bot_push_subscriptions (user_id);

CREATE INDEX IF NOT EXISTS idx_bot_push_subscriptions_team
  ON bot_push_subscriptions (team_id);

ALTER TABLE bot_push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see their push subscriptions"
  ON bot_push_subscriptions FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users create their push subscriptions"
  ON bot_push_subscriptions FOR INSERT
  WITH CHECK (user_id = auth.uid() AND is_team_member(team_id));

CREATE POLICY "Users update their push subscriptions"
  ON bot_push_subscriptions FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users delete their push subscriptions"
  ON bot_push_subscriptions FOR DELETE
  USING (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS bot_notification_preferences (
  user_id uuid NOT NULL,
  team_id uuid NOT NULL REFERENCES bot_teams(id) ON DELETE CASCADE,
  push_enabled boolean NOT NULL DEFAULT false,
  notify_conversations boolean NOT NULL DEFAULT false,
  notify_bookings boolean NOT NULL DEFAULT false,
  quiet_hours jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, team_id)
);

ALTER TABLE bot_notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see their notification preferences"
  ON bot_notification_preferences FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users create their notification preferences"
  ON bot_notification_preferences FOR INSERT
  WITH CHECK (user_id = auth.uid() AND is_team_member(team_id));

CREATE POLICY "Users update their notification preferences"
  ON bot_notification_preferences FOR UPDATE
  USING (user_id = auth.uid() AND is_team_member(team_id));

CREATE POLICY "Users delete their notification preferences"
  ON bot_notification_preferences FOR DELETE
  USING (user_id = auth.uid() AND is_team_member(team_id));
