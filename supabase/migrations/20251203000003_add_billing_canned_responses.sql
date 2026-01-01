-- Add billing/subscription canned responses to default bot
-- This provides helpful responses for subscription and billing questions

-- First, find the default bot (slug = 'default-bot')
-- Then add canned responses for billing/subscription questions

DO $$
DECLARE
  v_bot_id uuid;
  v_team_id uuid;
BEGIN
  -- Find the default bot
  SELECT id, team_id INTO v_bot_id, v_team_id
  FROM bot_bots
  WHERE slug = 'default-bot'
  LIMIT 1;

  -- Only proceed if default bot exists
  IF v_bot_id IS NOT NULL THEN
    -- Add billing/subscription canned responses (high priority)
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
    ) VALUES
      -- Cancel subscription (highest priority for cancellation questions)
      -- Pattern uses word boundaries: matches "cancel subscription", "how cancel subscription", "how do i cancel", etc.
      (
        v_bot_id,
        v_team_id,
        'cancel.*subscription|how.*cancel.*subscription|how do i cancel|unsubscribe|end.*subscription|stop.*subscription',
        'regex',
        'To cancel your subscription, go to your Billing & Subscription page at https://chatiq.io/dashboard/billing and click "Cancel Subscription". You can also manage your subscription, update payment methods, and view invoices through the billing portal. If you need help, contact support.',
        false,
        1,
        9, -- High priority (after greetings/thanks, before general billing)
        true
      ),
      -- Billing/subscription questions (lower priority, won't match if cancel pattern matches)
      (
        v_bot_id,
        v_team_id,
        'billing|subscription|payment|invoice|pricing|plan|upgrade|downgrade',
        'keyword',
        'For billing and subscription management, visit your Billing & Subscription page at https://chatiq.io/dashboard/billing. There you can view your current plan, manage your subscription, update payment methods, view invoices, and change your plan. Only team owners can manage billing settings.',
        false,
        1,
        7, -- Lower priority than cancel (so cancel matches first)
        true
      ),
      -- Use case questions: Ecommerce
      (
        v_bot_id,
        v_team_id,
        'ecommerce|e-commerce|online store|shopify|woocommerce|store|selling|products',
        'keyword',
        'Yes! ChatIQ is excellent for ecommerce. You can train your chatbot on product catalogs, FAQs, return policies, shipping information, and customer support docs. The bot can help customers find products, answer questions about orders, handle returns, and provide instant support 24/7. Upload your product documentation, policies, and FAQs to get started.',
        false,
        1,
        6, -- Medium-high priority
        true
      ),
      -- Use case questions: Customer support
      (
        v_bot_id,
        v_team_id,
        'customer support|customer service|help desk|support|ticket|faq',
        'keyword',
        'ChatIQ is perfect for customer support! Upload your support documentation, FAQs, knowledge base articles, and policy documents. The bot can answer common questions instantly, reducing support ticket volume and providing 24/7 assistance. It learns from your actual documentation to give accurate, context-aware responses.',
        false,
        1,
        6, -- Medium-high priority
        true
      ),
      -- Use case questions: Documentation/Knowledge base
      (
        v_bot_id,
        v_team_id,
        'documentation|docs|knowledge base|kb|wiki|guide|tutorial',
        'keyword',
        'ChatIQ excels at documentation and knowledge base queries! Upload your technical docs, user guides, API documentation, tutorials, and help articles. The bot uses semantic search to find the most relevant information and provides accurate answers based on your actual documentation. Perfect for developer portals, user guides, and internal knowledge bases.',
        false,
        1,
        6, -- Medium-high priority
        true
      )
    ON CONFLICT DO NOTHING; -- Don't create duplicates if they already exist
  END IF;
END $$;

-- Add comment
COMMENT ON TABLE bot_canned_responses IS 'Pre-LLM pattern matching responses for instant, zero-cost replies to common queries. Includes billing/subscription responses for default bot.';

