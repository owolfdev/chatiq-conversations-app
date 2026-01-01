-- Add integrations table for multi-channel support
CREATE TABLE IF NOT EXISTS bot_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES bot_teams(id),
  bot_id uuid NOT NULL REFERENCES bot_bots(id),
  provider text NOT NULL CHECK (provider IN ('line', 'facebook', 'whatsapp')),
  status text NOT NULL DEFAULT 'active',
  display_name text,
  credentials jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bot_integrations_team_id ON bot_integrations(team_id);
CREATE INDEX IF NOT EXISTS idx_bot_integrations_provider ON bot_integrations(provider);
CREATE UNIQUE INDEX IF NOT EXISTS ux_bot_integrations_team_provider_bot
  ON bot_integrations(team_id, provider, bot_id);

-- Inbound integration event queue (webhook ingress)
CREATE TABLE IF NOT EXISTS bot_integration_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id uuid NOT NULL REFERENCES bot_integrations(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES bot_teams(id),
  bot_id uuid NOT NULL REFERENCES bot_bots(id),
  provider text NOT NULL CHECK (provider IN ('line', 'facebook', 'whatsapp')),
  provider_event_id text,
  event_type text,
  conversation_key text,
  reply_token text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  received_at timestamp without time zone DEFAULT now(),
  processed_at timestamp without time zone
);

CREATE INDEX IF NOT EXISTS idx_bot_integration_events_integration_id
  ON bot_integration_events(integration_id);
CREATE INDEX IF NOT EXISTS idx_bot_integration_events_team_id
  ON bot_integration_events(team_id);
CREATE INDEX IF NOT EXISTS idx_bot_integration_events_status
  ON bot_integration_events(status);
CREATE UNIQUE INDEX IF NOT EXISTS ux_bot_integration_events_provider_event
  ON bot_integration_events(integration_id, provider_event_id);

-- Enable Row Level Security (RLS)
ALTER TABLE bot_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_integration_events ENABLE ROW LEVEL SECURITY;

-- Policies for bot_integrations
CREATE POLICY "Users see integrations from their teams"
ON bot_integrations FOR SELECT
USING (team_id IN (SELECT public.user_team_ids()));

CREATE POLICY "Users create integrations in their teams"
ON bot_integrations FOR INSERT
WITH CHECK (team_id IN (SELECT public.user_team_ids()));

CREATE POLICY "Users update integrations in their teams"
ON bot_integrations FOR UPDATE
USING (team_id IN (SELECT public.user_team_ids()))
WITH CHECK (team_id IN (SELECT public.user_team_ids()));

CREATE POLICY "Users delete integrations in their teams"
ON bot_integrations FOR DELETE
USING (team_id IN (SELECT public.user_team_ids()));

-- Policies for bot_integration_events
CREATE POLICY "Users see integration events from their teams"
ON bot_integration_events FOR SELECT
USING (team_id IN (SELECT public.user_team_ids()));

CREATE POLICY "Users create integration events in their teams"
ON bot_integration_events FOR INSERT
WITH CHECK (team_id IN (SELECT public.user_team_ids()));

CREATE POLICY "Users update integration events in their teams"
ON bot_integration_events FOR UPDATE
USING (team_id IN (SELECT public.user_team_ids()))
WITH CHECK (team_id IN (SELECT public.user_team_ids()));

CREATE POLICY "Users delete integration events in their teams"
ON bot_integration_events FOR DELETE
USING (team_id IN (SELECT public.user_team_ids()));

COMMENT ON TABLE bot_integrations IS 'Third-party channel integrations per team/bot.';
COMMENT ON TABLE bot_integration_events IS 'Inbound webhook events queued for processing.';
