#!/bin/bash
# Script to find subscription ID using Stripe CLI
# Usage: ./scripts/find_subscription_id.sh [customer_id]

set -e

CUSTOMER_ID="$1"

if [ -z "$STRIPE_API_KEY" ]; then
  echo "Error: STRIPE_API_KEY environment variable not set."
  echo ""
  echo "For LIVE mode, set it to your live secret key:"
  echo "  export STRIPE_API_KEY=sk_live_..."
  echo ""
  exit 1
fi

if [ -z "$CUSTOMER_ID" ]; then
  echo "Usage: $0 <customer_id>"
  echo ""
  echo "To find your customer ID:"
  echo "  1. Check your Supabase database: SELECT stripe_customer_id FROM bot_teams WHERE ..."
  echo "  2. Or check Stripe Dashboard → Customers"
  echo ""
  echo "Example:"
  echo "  STRIPE_API_KEY=sk_live_xxx $0 cus_xxxxx"
  exit 1
fi

echo "Finding subscriptions for customer: $CUSTOMER_ID"
echo ""

# List subscriptions
stripe subscriptions list \
  --customer "$CUSTOMER_ID" \
  --api-key "$STRIPE_API_KEY" \
  --limit 10

echo ""
echo "✅ Use the 'id' field (sub_xxxxx) from the output above."

