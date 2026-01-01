-- Add customization fields to bot_bots table for branded bot pages
-- These fields allow users to customize the appearance of their public bot pages

-- Add primary color (required for branding)
ALTER TABLE bot_bots 
  ADD COLUMN IF NOT EXISTS primary_color text;

-- Add secondary color (optional, for accent colors)
ALTER TABLE bot_bots 
  ADD COLUMN IF NOT EXISTS secondary_color text;

-- Add back link URL (where users should be redirected when clicking "Back to Site")
ALTER TABLE bot_bots 
  ADD COLUMN IF NOT EXISTS back_link_url text;

-- Add back link text (customizable text for the back link, e.g., "Back to Company Name")
ALTER TABLE bot_bots 
  ADD COLUMN IF NOT EXISTS back_link_text text;

-- Add validation constraint for primary_color (must be valid hex color)
-- Drop constraint first if it exists (for idempotency)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_primary_color_format'
  ) THEN
    ALTER TABLE bot_bots DROP CONSTRAINT check_primary_color_format;
  END IF;
END $$;

ALTER TABLE bot_bots 
  ADD CONSTRAINT check_primary_color_format 
  CHECK (primary_color IS NULL OR primary_color ~ '^#[0-9A-Fa-f]{6}$');

-- Add validation constraint for secondary_color (must be valid hex color)
-- Drop constraint first if it exists (for idempotency)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_secondary_color_format'
  ) THEN
    ALTER TABLE bot_bots DROP CONSTRAINT check_secondary_color_format;
  END IF;
END $$;

ALTER TABLE bot_bots 
  ADD CONSTRAINT check_secondary_color_format 
  CHECK (secondary_color IS NULL OR secondary_color ~ '^#[0-9A-Fa-f]{6}$');

-- Add comments for documentation
COMMENT ON COLUMN bot_bots.primary_color IS 'Primary brand color (hex format, e.g., #3B82F6) for customizing bot page appearance';
COMMENT ON COLUMN bot_bots.secondary_color IS 'Secondary/accent color (hex format, optional) for customizing bot page appearance';
COMMENT ON COLUMN bot_bots.back_link_url IS 'URL to redirect users when clicking the back link on the bot page';
COMMENT ON COLUMN bot_bots.back_link_text IS 'Customizable text for the back link (e.g., "Back to Company Name"). Defaults to "Back to Site" if not set';

