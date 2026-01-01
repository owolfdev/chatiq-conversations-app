-- Create bot_billing_events table (Stripe webhook event log)
-- Stores all Stripe webhook events for audit trail, debugging, and idempotency checks
-- This provides a complete history of all billing-related events from Stripe

CREATE TABLE IF NOT EXISTS bot_billing_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id text NOT NULL UNIQUE,
  type text NOT NULL,
  customer_id text,
  subscription_id text,
  payload jsonb NOT NULL,
  stripe_created_at timestamp without time zone,
  received_at timestamp without time zone DEFAULT now() NOT NULL,
  processed_at timestamp without time zone,
  processing_status text DEFAULT 'pending' CHECK (processing_status IN ('pending', 'success', 'failed')),
  error_message text
);

-- Create indexes for performance and common queries
CREATE INDEX IF NOT EXISTS idx_bot_billing_events_stripe_event_id ON bot_billing_events(stripe_event_id);
CREATE INDEX IF NOT EXISTS idx_bot_billing_events_customer_id ON bot_billing_events(customer_id) WHERE customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bot_billing_events_subscription_id ON bot_billing_events(subscription_id) WHERE subscription_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bot_billing_events_type ON bot_billing_events(type);
CREATE INDEX IF NOT EXISTS idx_bot_billing_events_received_at ON bot_billing_events(received_at DESC);
CREATE INDEX IF NOT EXISTS idx_bot_billing_events_processing_status ON bot_billing_events(processing_status) WHERE processing_status != 'success';

-- Add comments for documentation
COMMENT ON TABLE bot_billing_events IS 'Complete audit trail of all Stripe webhook events. Used for idempotency checks, debugging, and sync verification between DB state and Stripe events.';
COMMENT ON COLUMN bot_billing_events.stripe_event_id IS 'Unique Stripe event ID (evt_xxx). Used for idempotency checks to prevent duplicate processing.';
COMMENT ON COLUMN bot_billing_events.type IS 'Stripe event type (e.g., checkout.session.completed, customer.subscription.updated)';
COMMENT ON COLUMN bot_billing_events.customer_id IS 'Stripe customer ID (cus_xxx), extracted from event payload';
COMMENT ON COLUMN bot_billing_events.subscription_id IS 'Stripe subscription ID (sub_xxx), extracted from event payload';
COMMENT ON COLUMN bot_billing_events.payload IS 'Full JSON payload of the Stripe event as received';
COMMENT ON COLUMN bot_billing_events.stripe_created_at IS 'Timestamp when Stripe created the event (from event.created)';
COMMENT ON COLUMN bot_billing_events.received_at IS 'Timestamp when our webhook endpoint received the event';
COMMENT ON COLUMN bot_billing_events.processed_at IS 'Timestamp when event processing completed (success or failure)';
COMMENT ON COLUMN bot_billing_events.processing_status IS 'Status of event processing: pending (not yet processed), success (processed successfully), failed (processing failed)';
COMMENT ON COLUMN bot_billing_events.error_message IS 'Error message if processing failed';

