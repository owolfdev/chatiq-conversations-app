-- Add production services canned response for Bangkok Filmmakers bot
-- This migration adds a specific response for inquiries about production services in Thailand

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
    RAISE NOTICE 'Skipping canned response: bot with slug % not found in this environment.', v_bot_slug;
    RETURN;
  END IF;

  -- Insert production services canned response (only if pattern doesn't already exist)
  INSERT INTO bot_canned_responses (
    bot_id, 
    team_id, 
    pattern, 
    pattern_type, 
    response, 
    case_sensitive, 
    fuzzy_threshold, 
    priority, 
    enabled
  )
  SELECT 
    v_bot_id,
    v_team_id,
    'production services|production in thailand|foreign production|foreign production company|overseas production|local production|work permit|production permit|film permit|shooting permit|foreign company|production company thailand|film production thailand|shoot in thailand',
    'keyword',
    'Bangkok Filmmakers has strong connections to the local Thai film production industry. We can provide services and connect foreign film companies with production services for film and video projects in Thailand and Southeast Asia.

Whether you''re a foreign production company looking to work in Thailand, or a local company seeking production support, we can help with production services, permits, and connecting you with the right professionals.

Please [contact us](https://www.bangkokfilmmakers.com/contact) to discuss your production needs.',
    false,
    0,
    7,
    true
  WHERE NOT EXISTS (
    SELECT 1 FROM bot_canned_responses cr
    WHERE cr.bot_id = v_bot_id 
    AND cr.pattern = 'production services|production in thailand|foreign production|foreign production company|overseas production|local production|work permit|production permit|film permit|shooting permit|foreign company|production company thailand|film production thailand|shoot in thailand'
  );

  RAISE NOTICE 'Successfully added production services canned response for bot: %', v_bot_slug;
END $$;
