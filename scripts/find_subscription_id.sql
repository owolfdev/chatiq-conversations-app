-- Query to find your subscription ID from the database
-- Run this in your Supabase SQL editor or via psql

-- Option 1: Get subscription ID from billing events (most recent)
SELECT 
  subscription_id,
  type,
  customer_id,
  received_at,
  payload->>'id' as event_id
FROM bot_billing_events
WHERE subscription_id IS NOT NULL
ORDER BY received_at DESC
LIMIT 5;

-- Option 2: Get subscription ID for a specific customer
-- Replace 'cus_xxxxx' with your customer ID from bot_teams table
SELECT 
  subscription_id,
  type,
  customer_id,
  received_at
FROM bot_billing_events
WHERE customer_id = 'cus_xxxxx'  -- Replace with your customer ID
  AND subscription_id IS NOT NULL
ORDER BY received_at DESC
LIMIT 5;

-- Option 3: Get customer ID first, then subscription
SELECT 
  t.id as team_id,
  t.name as team_name,
  t.stripe_customer_id,
  be.subscription_id,
  be.type,
  be.received_at
FROM bot_teams t
LEFT JOIN bot_billing_events be ON be.customer_id = t.stripe_customer_id
WHERE t.stripe_customer_id IS NOT NULL
  AND be.subscription_id IS NOT NULL
ORDER BY be.received_at DESC
LIMIT 10;

