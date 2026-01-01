#!/bin/bash
# Script to delete/cancel a Stripe subscription for testing purposes
# Usage: ./scripts/delete_stripe_subscription.sh <subscription_id> [--immediately]

set -e

SUBSCRIPTION_ID="$1"
IMMEDIATELY="$2"

if [ -z "$SUBSCRIPTION_ID" ]; then
  echo "Usage: $0 <subscription_id> [--immediately]"
  echo ""
  echo "Options:"
  echo "  <subscription_id>  - The Stripe subscription ID (starts with 'sub_')"
  echo "  --immediately      - Cancel immediately instead of at period end"
  echo ""
  echo "Examples:"
  echo "  $0 sub_1234567890              # Cancel at period end"
  echo "  $0 sub_1234567890 --immediately # Cancel immediately"
  echo ""
  echo "To find your subscription ID:"
  echo "  1. Check /dashboard/billing in your app"
  echo "  2. Or list subscriptions: stripe subscriptions list --customer <customer_id>"
  exit 1
fi

# Get API key from environment or prompt
if [ -z "$STRIPE_API_KEY" ]; then
  echo "Error: STRIPE_API_KEY environment variable not set."
  echo ""
  echo "For LIVE mode testing, set it to your live secret key:"
  echo "  export STRIPE_API_KEY=sk_live_..."
  echo ""
  echo "⚠️  WARNING: This will use LIVE mode. Make sure you want to delete a LIVE subscription!"
  exit 1
fi

# Detect if this is a live key
if [[ "$STRIPE_API_KEY" == sk_live_* ]]; then
  echo "⚠️  WARNING: Using LIVE Stripe API key!"
  echo "   Subscription ID: $SUBSCRIPTION_ID"
  read -p "   Are you sure you want to proceed? (yes/no): " confirm
  if [ "$confirm" != "yes" ]; then
    echo "Cancelled."
    exit 1
  fi
fi

echo "Processing subscription: $SUBSCRIPTION_ID"

# Check subscription status first
echo "Checking subscription status..."
SUBSCRIPTION=$(stripe subscriptions retrieve "$SUBSCRIPTION_ID" --api-key "$STRIPE_API_KEY" 2>/dev/null || echo "")

if [ -z "$SUBSCRIPTION" ]; then
  echo "Error: Could not retrieve subscription. Check the ID and API key."
  exit 1
fi

STATUS=$(echo "$SUBSCRIPTION" | grep -o '"status":"[^"]*"' | cut -d'"' -f4 || echo "unknown")
echo "Current status: $STATUS"

if [ "$IMMEDIATELY" = "--immediately" ]; then
  echo "Canceling subscription immediately..."
  # To cancel immediately, we use the Stripe API DELETE endpoint
  # The CLI doesn't support immediate cancellation, so we use curl
  RESPONSE=$(curl -s -w "\n%{http_code}" \
    "https://api.stripe.com/v1/subscriptions/$SUBSCRIPTION_ID" \
    -u "$STRIPE_API_KEY:" \
    -X DELETE)
  
  HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
  BODY=$(echo "$RESPONSE" | sed '$d')
  
  if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "204" ]; then
    echo "✅ Subscription deleted immediately."
  else
    echo "❌ Error: HTTP $HTTP_CODE"
    echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
    exit 1
  fi
else
  # If already canceled, try to delete it
  if [ "$STATUS" = "canceled" ] || [ "$STATUS" = "unpaid" ]; then
    echo "Subscription is already canceled. Deleting..."
    stripe subscriptions delete "$SUBSCRIPTION_ID" \
      --api-key "$STRIPE_API_KEY"
    echo "✅ Subscription deleted."
  else
    echo "Canceling subscription at period end..."
    stripe subscriptions cancel "$SUBSCRIPTION_ID" \
      --api-key "$STRIPE_API_KEY"
    echo "✅ Subscription will be canceled at period end."
    echo "   To cancel immediately, run: $0 $SUBSCRIPTION_ID --immediately"
  fi
fi

echo ""
echo "Done! You can now create a fresh subscription for testing."

