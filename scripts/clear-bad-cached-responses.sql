-- Clear cached responses that might be giving wrong answers
-- Run this to clear the response cache for the default bot

DO $$
DECLARE
  v_bot_id uuid;
BEGIN
  -- Find the default bot
  SELECT id INTO v_bot_id
  FROM bot_bots
  WHERE slug = 'default-bot'
  LIMIT 1;

  IF v_bot_id IS NOT NULL THEN
    -- Delete cached responses that might be giving generic/wrong answers
    -- This will force the bot to use canned responses or generate new responses
    DELETE FROM bot_response_cache 
    WHERE bot_id = v_bot_id
    AND (
      message LIKE '%ecommerce%'
      OR message LIKE '%cancel%subscription%'
      OR message LIKE '%billing%'
      OR response LIKE '%friendly assistant%'
      OR response LIKE '%embed a bot%'
    );
    
    RAISE NOTICE 'Cleared cached responses for default bot (ID: %)', v_bot_id;
  ELSE
    RAISE NOTICE 'Default bot not found';
  END IF;
END $$;

