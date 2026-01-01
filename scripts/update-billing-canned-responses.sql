-- Manual script to update billing canned responses for default-bot
-- Run this in Supabase SQL Editor if the migration already ran but pattern isn't working

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
    -- Delete existing billing and use case responses (if any)
    DELETE FROM bot_canned_responses 
    WHERE bot_id = v_bot_id 
    AND (
      pattern LIKE '%cancel%subscription%' 
      OR pattern LIKE '%billing%subscription%'
      OR pattern LIKE '%ecommerce%'
      OR pattern LIKE '%customer support%'
      OR pattern LIKE '%documentation%'
      OR response LIKE '%Billing & Subscription%'
      OR response LIKE '%ecommerce%'
      OR response LIKE '%customer support%'
    );

    -- Insert updated billing responses
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
      team_id,
      pattern,
      pattern_type,
      response,
      case_sensitive,
      fuzzy_threshold,
      priority,
      enabled
    FROM (VALUES
      -- Cancel subscription (highest priority)
      (
        v_bot_id,
        (SELECT team_id FROM bot_bots WHERE id = v_bot_id),
        'cancel.*subscription|how.*cancel.*subscription|how do i cancel|unsubscribe|end.*subscription|stop.*subscription',
        'regex',
        'To cancel your subscription, go to your Billing & Subscription page at https://chatiq.io/dashboard/billing and click "Cancel Subscription". You can also manage your subscription, update payment methods, and view invoices through the billing portal. If you need help, contact support.',
        false,
        1,
        9,
        true
      ),
      -- Billing/subscription questions (lower priority)
      (
        v_bot_id,
        (SELECT team_id FROM bot_bots WHERE id = v_bot_id),
        'billing|subscription|payment|invoice|pricing|plan|upgrade|downgrade',
        'keyword',
        'For billing and subscription management, visit your Billing & Subscription page at https://chatiq.io/dashboard/billing. There you can view your current plan, manage your subscription, update payment methods, view invoices, and change your plan. Only team owners can manage billing settings.',
        false,
        1,
        7,
        true
      ),
      -- Use case questions: Ecommerce
      (
        v_bot_id,
        (SELECT team_id FROM bot_bots WHERE id = v_bot_id),
        'ecommerce|e-commerce|online store|shopify|woocommerce|store|selling|products',
        'keyword',
        'Yes! ChatIQ is excellent for ecommerce. You can train your chatbot on product catalogs, FAQs, return policies, shipping information, and customer support docs. The bot can help customers find products, answer questions about orders, handle returns, and provide instant support 24/7. Upload your product documentation, policies, and FAQs to get started.',
        false,
        1,
        6,
        true
      ),
      -- Use case questions: Customer support
      (
        v_bot_id,
        (SELECT team_id FROM bot_bots WHERE id = v_bot_id),
        'customer support|customer service|help desk|support|ticket|faq',
        'keyword',
        'ChatIQ is perfect for customer support! Upload your support documentation, FAQs, knowledge base articles, and policy documents. The bot can answer common questions instantly, reducing support ticket volume and providing 24/7 assistance. It learns from your actual documentation to give accurate, context-aware responses.',
        false,
        1,
        6,
        true
      ),
      -- Use case questions: Documentation/Knowledge base
      (
        v_bot_id,
        (SELECT team_id FROM bot_bots WHERE id = v_bot_id),
        'documentation|docs|knowledge base|kb|wiki|guide|tutorial',
        'keyword',
        'ChatIQ excels at documentation and knowledge base queries! Upload your technical docs, user guides, API documentation, tutorials, and help articles. The bot uses semantic search to find the most relevant information and provides accurate answers based on your actual documentation. Perfect for developer portals, user guides, and internal knowledge bases.',
        false,
        1,
        6,
        true
      )
    ) AS t(bot_id, team_id, pattern, pattern_type, response, case_sensitive, fuzzy_threshold, priority, enabled)
    WHERE NOT EXISTS (
      SELECT 1 FROM bot_canned_responses 
      WHERE bot_id = v_bot_id 
      AND pattern = t.pattern
    );
  END IF;
END $$;

