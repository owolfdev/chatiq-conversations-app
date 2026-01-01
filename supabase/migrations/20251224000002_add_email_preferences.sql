-- Add marketing email preferences and unsubscribe token for compliance

ALTER TABLE IF EXISTS bot_user_profiles
  ADD COLUMN IF NOT EXISTS marketing_emails boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS unsubscribe_token text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_bot_user_profiles_unsubscribe_token
  ON bot_user_profiles (unsubscribe_token)
  WHERE unsubscribe_token IS NOT NULL;
