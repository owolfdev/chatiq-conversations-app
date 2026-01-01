-- Improve production services pattern to include plural forms and more variations
-- Also make location pattern more specific to avoid false matches

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
    RAISE NOTICE 'Skipping production services pattern update: bot with slug % not found in this environment.', v_bot_slug;
    RETURN;
  END IF;

  -- Update production services pattern to include plural forms and more variations
  UPDATE bot_canned_responses
  SET 
    pattern = 'production services|production in thailand|foreign production|foreign productions|foreign production company|foreign production companies|overseas production|overseas productions|local production|local productions|work permit|work permits|production permit|production permits|film permit|film permits|shooting permit|shooting permits|foreign company|foreign companies|production company thailand|production companies thailand|film production thailand|film productions thailand|shoot in thailand|shooting in thailand|produce in thailand|producing in thailand|american team|american production|american company|foreign team|foreign teams',
    updated_at = now()
  WHERE bot_id = v_bot_id
    AND pattern LIKE '%production services%'
    AND pattern_type = 'keyword';

  -- Make location pattern more specific - only match explicit location questions
  -- Remove "thailand" and "bangkok" as standalone keywords since they appear in many contexts
  UPDATE bot_canned_responses
  SET 
    pattern = 'where are you|where is bangkok filmmakers|where are you located|where are you based|what is your location|where do you operate',
    updated_at = now()
  WHERE bot_id = v_bot_id
    AND pattern = 'where|location|based|thailand|bangkok|southeast asia'
    AND pattern_type = 'keyword';

  IF FOUND THEN
    RAISE NOTICE 'Successfully updated production services and location patterns for bot: %', v_bot_slug;
  ELSE
    RAISE NOTICE 'Responses not found or already updated for bot: %', v_bot_slug;
  END IF;
END $$;
