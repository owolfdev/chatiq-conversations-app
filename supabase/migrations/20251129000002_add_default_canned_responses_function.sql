-- Function to create default canned responses for a bot
-- This can be called when creating a new bot or manually to add defaults

CREATE OR REPLACE FUNCTION create_default_canned_responses(p_bot_id uuid, p_team_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only create if bot exists and belongs to the team
  IF NOT EXISTS (
    SELECT 1 FROM bot_bots 
    WHERE id = p_bot_id AND team_id = p_team_id
  ) THEN
    RAISE EXCEPTION 'Bot not found or team mismatch';
  END IF;

  -- Don't create duplicates if responses already exist
  IF EXISTS (
    SELECT 1 FROM bot_canned_responses WHERE bot_id = p_bot_id
  ) THEN
    RETURN;
  END IF;

  -- Insert default canned responses
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
    -- Greetings (highest priority) - only this one enabled by default
    (
      p_bot_id,
      p_team_id,
      '^(hi|hello|hey|greetings|good morning|good afternoon|good evening)',
      'regex',
      'Hello! How can I help you today?',
      false,
      1,
      10,
      true
    ),
    -- Thanks (disabled by default)
    (
      p_bot_id,
      p_team_id,
      '^(thanks|thank you|ty|thx|appreciate it)',
      'regex',
      'You''re welcome! Is there anything else I can help with?',
      false,
      1,
      9,
      false
    ),
    -- Goodbye (disabled by default)
    (
      p_bot_id,
      p_team_id,
      '^(bye|goodbye|see you|cya|farewell|later)',
      'regex',
      'Goodbye! Have a great day!',
      false,
      1,
      8,
      false
    ),
    -- Help request (disabled by default)
    (
      p_bot_id,
      p_team_id,
      'help|what can you do|what do you do',
      'keyword',
      'I can help answer questions and provide information. What would you like to know?',
      false,
      1,
      7,
      false
    ),
    -- System unavailable fallback (for error handling) - keep enabled for system use
    (
      p_bot_id,
      p_team_id,
      'system_unavailable',
      'exact',
      'I apologize, but I''m experiencing some technical difficulties right now. Please try again in a moment.',
      false,
      0,
      0,
      true
    ),
    -- Quota exceeded (for public users when bot owner's quota is exceeded) - keep enabled for system use
    (
      p_bot_id,
      p_team_id,
      'quota_exceeded',
      'exact',
      'I apologize, but I''m temporarily unavailable right now due to high demand. Our team is working to restore full service as soon as possible. In the meantime, you can find helpful information in our documentation at https://chatiq.io/docs, or feel free to reach out to our support team. Thank you for your patience!',
      false,
      0,
      0,
      true
    ),
    -- Cancel subscription (disabled by default)
    (
      p_bot_id,
      p_team_id,
      'cancel.*subscription|how.*cancel.*subscription|how do i cancel|unsubscribe|end.*subscription|stop.*subscription',
      'regex',
      'To cancel your subscription, go to your Billing & Subscription page at https://chatiq.io/dashboard/billing and click "Cancel Subscription". You can also manage your subscription, update payment methods, and view invoices through the billing portal. If you need help, contact support.',
      false,
      1,
      9, -- High priority (after greetings/thanks, before general billing)
      false
    ),
    -- Billing/subscription questions (disabled by default)
    (
      p_bot_id,
      p_team_id,
      'billing|subscription|payment|invoice|pricing|plan|upgrade|downgrade',
      'keyword',
      'For billing and subscription management, visit your Billing & Subscription page at https://chatiq.io/dashboard/billing. There you can view your current plan, manage your subscription, update payment methods, view invoices, and change your plan. Only team owners can manage billing settings.',
      false,
      1,
      7, -- Lower priority than cancel (so cancel matches first)
      false
    ),
    -- Use case questions: Ecommerce (disabled by default)
    (
      p_bot_id,
      p_team_id,
      'ecommerce|e-commerce|online store|shopify|woocommerce|store|selling|products',
      'keyword',
      'Yes! ChatIQ is excellent for ecommerce. You can train your chatbot on product catalogs, FAQs, return policies, shipping information, and customer support docs. The bot can help customers find products, answer questions about orders, handle returns, and provide instant support 24/7. Upload your product documentation, policies, and FAQs to get started.',
      false,
      1,
      6, -- Medium-high priority
      false
    ),
    -- Use case questions: Customer support (disabled by default)
    (
      p_bot_id,
      p_team_id,
      'customer support|customer service|help desk|support|ticket|faq',
      'keyword',
      'ChatIQ is perfect for customer support! Upload your support documentation, FAQs, knowledge base articles, and policy documents. The bot can answer common questions instantly, reducing support ticket volume and providing 24/7 assistance. It learns from your actual documentation to give accurate, context-aware responses.',
      false,
      1,
      6, -- Medium-high priority
      false
    ),
    -- Use case questions: Documentation/Knowledge base (disabled by default)
    (
      p_bot_id,
      p_team_id,
      'documentation|docs|knowledge base|kb|wiki|guide|tutorial',
      'keyword',
      'ChatIQ excels at documentation and knowledge base queries! Upload your technical docs, user guides, API documentation, tutorials, and help articles. The bot uses semantic search to find the most relevant information and provides accurate answers based on your actual documentation. Perfect for developer portals, user guides, and internal knowledge bases.',
      false,
      1,
      6, -- Medium-high priority
      false
    );
END;
$$;

-- Add comment
COMMENT ON FUNCTION create_default_canned_responses IS 'Creates default canned responses for a bot (greetings, thanks, goodbye, help, and system unavailable fallback)';

