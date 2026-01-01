-- Add Bangkok Filmmakers canned responses
-- This migration inserts canned responses for the Bangkok Filmmakers bot
-- Replace 'YOUR_BOT_SLUG' with your actual bot slug before running

-- Option 1: Insert by bot slug (recommended)
-- Replace 'YOUR_BOT_SLUG' with your bot slug (e.g., 'test-bot-oliver-wolfson')
DO $$
DECLARE
  v_bot_id uuid;
  v_team_id uuid;
  v_bot_slug text := 'bangkok-filmmakers-chat-bot'; -- 👈 REPLACE THIS with your bot slug (e.g., 'test-bot-oliver-wolfson')
BEGIN
  -- Get bot_id and team_id by slug
  SELECT id, team_id INTO v_bot_id, v_team_id
  FROM bot_bots
  WHERE slug = v_bot_slug
  LIMIT 1;

  -- If the bot doesn't exist in this environment (e.g., test), skip quietly
  IF v_bot_id IS NULL THEN
    RAISE NOTICE 'Skipping canned responses: bot with slug % not found in this environment.', v_bot_slug;
    RETURN;
  END IF;

  -- Insert canned responses (only if pattern doesn't already exist for this bot)
  WITH responses_to_insert AS (
    SELECT * FROM (VALUES
    -- 1. About / What is Bangkok Filmmakers
    (
      'what is bangkok filmmakers|about bangkok filmmakers|tell me about bangkok filmmakers|what does bangkok filmmakers do',
      'keyword',
      'Bangkok Filmmakers is a platform that connects filmmakers, production companies, and service providers in the film and video industry. For over ten years we have served as a meeting place for filmmakers in Thailand and Southeast Asia via our [Facebook group](https://www.facebook.com/groups/bangkokfilmmakers).

We are expanding our mission to include providing referrals between clients and film and video professionals, production companies, and other service providers.

Learn more: [About Bangkok Filmmakers](https://www.bangkokfilmmakers.com/about)',
      false,
      0,
      10,
      true
    ),
    
    -- 2. Facebook Group
    (
      'facebook|facebook group|fb group|join facebook|facebook page',
      'keyword',
      'You can find our Facebook group at [this link](https://www.facebook.com/groups/bangkokfilmmakers). It''s been our main community hub for over ten years, connecting filmmakers in Thailand and Southeast Asia.',
      false,
      0,
      9,
      true
    ),
    
    -- 3. Contact / How to Contact
    (
      'contact|how to contact|get in touch|reach out|contact information|email|phone',
      'keyword',
      'You can contact us through our [contact form](https://www.bangkokfilmmakers.com/contact). We''re here to help with your film or video project, or if you''d like to be included in our directory.

[Contact Bangkok Filmmakers](https://www.bangkokfilmmakers.com/contact)',
      false,
      0,
      8,
      true
    ),
    
    -- 4. Production Services in Thailand / Foreign Production Companies
    (
      'production services|production in thailand|foreign production|foreign production company|overseas production|local production|work permit|production permit|film permit|shooting permit|foreign company|production company thailand|film production thailand|shoot in thailand',
      'keyword',
      'Bangkok Filmmakers has strong connections to the local Thai film production industry. We can provide services and connect foreign film companies with production services for film and video projects in Thailand and Southeast Asia.

Whether you''re a foreign production company looking to work in Thailand, or a local company seeking production support, we can help with production services, permits, and connecting you with the right professionals.

Please [contact us](https://www.bangkokfilmmakers.com/contact) to discuss your production needs.',
      false,
      0,
      7,
      true
    ),
    
    -- 5. Services / Referrals / Directory
    (
      'services|referrals|directory|find filmmaker|find production company|hire filmmaker|need filmmaker|looking for filmmaker|service provider',
      'keyword',
      'Bangkok Filmmakers provides referrals between clients and film and video professionals, production companies, and other service providers.

If you need help with your film or video project, or if you''d like to be included in our directory, please [contact us](https://www.bangkokfilmmakers.com/contact).',
      false,
      0,
      6,
      true
    ),
    
    -- 6. Website / Main Site
    (
      'website|main site|homepage|bangkokfilmmakers.com|www.bangkokfilmmakers',
      'keyword',
      'You can visit our website at [bangkokfilmmakers.com](https://www.bangkokfilmmakers.com). It''s a hub for film and video services in Thailand, connecting filmmakers, production companies, and service providers across Thailand and Southeast Asia.',
      false,
      0,
      6,
      true
    ),
    
    -- 7. Blog
    (
      'blog|articles|posts|news|updates|latest news',
      'keyword',
      'Check out our blog for the latest updates on Bangkok''s filmmaking scene, industry news, and educational content: [Bangkok Filmmakers Blog](https://www.bangkokfilmmakers.com/blog)',
      false,
      0,
      5,
      true
    ),
    
    -- 8. FAQ
    (
      'faq|frequently asked|questions|help|common questions',
      'keyword',
      'You can find answers to common questions on our [FAQ page](https://www.bangkokfilmmakers.com/faq). If you have additional questions, feel free to [contact us](https://www.bangkokfilmmakers.com/contact).',
      false,
      0,
      4,
      true
    ),
    
    -- 9. Greeting / Hello
    (
      'hi|hello|hey|greetings|good morning|good afternoon|good evening',
      'keyword',
      'Hi! I''m here to help you learn about Bangkok Filmmakers and connect with our community. How can I assist you today?',
      false,
      0,
      3,
      true
    ),
    
    -- 10. Thanks / Thank You
    (
      'thank you|thanks|appreciate it|thank|grateful',
      'keyword',
      'You''re welcome! If you have any other questions about Bangkok Filmmakers, our services, or our community, feel free to ask.',
      false,
      0,
      2,
      true
    ),
    
    -- 11. Community / Network
    (
      'community|network|connect|meet filmmakers|filmmaking community|thailand filmmakers',
      'keyword',
      'Bangkok Filmmakers is a community hub designed to foster connections and collaborations. We provide commercial, creative, and community opportunities for film and video-makers across Thailand and Southeast Asia.

Join our [Facebook group](https://www.facebook.com/groups/bangkokfilmmakers) to connect with other filmmakers, or [contact us](https://www.bangkokfilmmakers.com/contact) to learn more about our services.',
      false,
      0,
      1,
      true
    ),
    
    -- 12. Location / Where
    (
      'where|location|based|thailand|bangkok|southeast asia',
      'keyword',
      'Bangkok Filmmakers serves filmmakers, production companies, and service providers across Thailand and Southeast Asia. We''re based in Bangkok but our community extends throughout the region.',
      false,
      0,
      0,
      true
    ),
    
    -- 13. Join / Become a Member
    (
      'join|become a member|sign up|register|membership|how to join',
      'keyword',
      'You can join our community by:
- Joining our [Facebook group](https://www.facebook.com/groups/bangkokfilmmakers)
- [Contacting us](https://www.bangkokfilmmakers.com/contact) to be included in our directory
- Following our [blog](https://www.bangkokfilmmakers.com/blog) for updates

We''d love to have you as part of our filmmaking community!',
      false,
      0,
      0,
      true
    )
    ) AS t(pattern, pattern_type, response, case_sensitive, fuzzy_threshold, priority, enabled)
  )
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
    r.pattern,
    r.pattern_type,
    r.response,
    r.case_sensitive,
    r.fuzzy_threshold,
    r.priority,
    r.enabled
  FROM responses_to_insert r
  WHERE NOT EXISTS (
    SELECT 1 FROM bot_canned_responses cr
    WHERE cr.bot_id = v_bot_id 
    AND cr.pattern = r.pattern
  );

  RAISE NOTICE 'Successfully inserted canned responses for bot: %', v_bot_slug;
END $$;
