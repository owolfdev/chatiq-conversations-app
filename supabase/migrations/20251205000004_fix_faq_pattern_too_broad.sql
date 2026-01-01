-- Fix FAQ canned response pattern to be more specific
-- The current pattern includes "help" and "questions" which are too generic
-- and match queries like "can you help?" which should go to the LLM
-- This migration updates the pattern to only match explicit FAQ requests

DO $$
DECLARE
  v_bot_id uuid;
  v_team_id uuid;
  v_bot_slug text := 'bangkok-filmmakers-chat-bot';
BEGIN
  -- Get bot_id and team_id by slug
  SELECT id, team_id INTO v_bot_id, v_team_id
  FROM bot_bots
  WHERE slug = v_bot_slug
  LIMIT 1;

  IF v_bot_id IS NULL THEN
    RAISE NOTICE 'Skipping FAQ pattern update: bot with slug % not found in this environment.', v_bot_slug;
    RETURN;
  END IF;

  -- Update the FAQ pattern to be more specific (remove "help" and "questions" which are too generic)
  -- Only match explicit FAQ requests: "faq", "frequently asked", "common questions"
  UPDATE bot_canned_responses
  SET 
    pattern = 'faq|frequently asked|frequently asked questions|common questions|faq page',
    updated_at = now()
  WHERE bot_id = v_bot_id
    AND pattern = 'faq|frequently asked|questions|help|common questions'
    AND pattern_type = 'keyword';

  IF FOUND THEN
    RAISE NOTICE 'Successfully updated FAQ pattern for bot: %', v_bot_slug;
  ELSE
    RAISE NOTICE 'FAQ response not found or already updated for bot: %', v_bot_slug;
  END IF;
END $$;
