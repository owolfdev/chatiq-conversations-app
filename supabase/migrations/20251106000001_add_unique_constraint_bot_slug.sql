-- Add unique constraint on bot_bots.slug to enforce uniqueness at database level
-- This prevents duplicate slugs even if application-level checks fail or race conditions occur

-- First, check if there are any existing duplicate slugs (shouldn't be, but safe to check)
DO $$
DECLARE
  duplicate_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO duplicate_count
  FROM (
    SELECT slug, COUNT(*) as cnt
    FROM bot_bots
    GROUP BY slug
    HAVING COUNT(*) > 1
  ) duplicates;

  IF duplicate_count > 0 THEN
    RAISE EXCEPTION 'Cannot add unique constraint: % duplicate slug(s) found. Please resolve duplicates first.', duplicate_count;
  END IF;
END $$;

-- Create unique index on slug
-- Using CREATE UNIQUE INDEX instead of ALTER TABLE to avoid issues if constraint already exists
CREATE UNIQUE INDEX IF NOT EXISTS idx_bot_bots_slug_unique ON bot_bots(slug);

-- Add comment for documentation
COMMENT ON INDEX idx_bot_bots_slug_unique IS 'Ensures bot slugs are globally unique for public URL routing';

