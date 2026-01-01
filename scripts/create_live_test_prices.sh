#!/usr/bin/env bash
set -euo pipefail

# This script creates low-cost test prices in Stripe LIVE mode for payment testing.
# These prices are meant to be used temporarily during live payment testing.
# After testing, you should replace these with your actual production prices.
#
# NOTE: This script creates MONTHLY prices only. The codebase currently only supports
# monthly subscriptions. Yearly prices exist in Stripe but are not yet integrated.
#
# Usage:
#   STRIPE_API_KEY=sk_live_xxx ./scripts/create_live_test_prices.sh
#
# IMPORTANT: This script uses LIVE mode Stripe keys. Be careful!

: "${STRIPE_API_KEY:?Set STRIPE_API_KEY=sk_live_xxx before running}"

# Verify we're using a live key
if [[ ! "$STRIPE_API_KEY" =~ ^sk_live_ ]]; then
  echo "ERROR: This script requires a LIVE Stripe API key (sk_live_...)"
  echo "You provided: ${STRIPE_API_KEY:0:10}..."
  exit 1
fi

echo "⚠️  WARNING: Creating prices in STRIPE LIVE MODE"
echo "These prices will charge REAL money (albeit small amounts)"
echo ""
read -p "Continue? (yes/no): " confirm
if [[ "$confirm" != "yes" ]]; then
  echo "Aborted."
  exit 1
fi

echo ""
echo "Creating test prices with low amounts for live payment testing..."
echo ""

# Look up product IDs by name (products may have different IDs in live vs test mode)
echo "Looking up product IDs..."
PRO_PRODUCT_ID=$(stripe products list --limit 100 | jq -r '.data[] | select(.name == "Pro") | .id' | head -1)
TEAM_PRODUCT_ID=$(stripe products list --limit 100 | jq -r '.data[] | select(.name == "Team") | .id' | head -1)

if [ -z "$PRO_PRODUCT_ID" ] || [ "$PRO_PRODUCT_ID" = "null" ]; then
  echo "ERROR: Could not find 'Pro' product in live mode"
  exit 1
fi

if [ -z "$TEAM_PRODUCT_ID" ] || [ "$TEAM_PRODUCT_ID" = "null" ]; then
  echo "ERROR: Could not find 'Team' product in live mode"
  exit 1
fi

echo "✅ Found Pro product: $PRO_PRODUCT_ID"
echo "✅ Found Team product: $TEAM_PRODUCT_ID"
echo ""

# Test prices: $0.50 USD and ฿20 THB (very low amounts for testing)
PRO_USD_AMOUNT=50      # $0.50
TEAM_USD_AMOUNT=100   # $1.00
PRO_THB_AMOUNT=2000   # ฿20.00
TEAM_THB_AMOUNT=4000  # ฿40.00

########################################
# PRO PLAN - USD
########################################

echo "Creating Pro Monthly USD test price ($(echo "scale=2; $PRO_USD_AMOUNT/100" | bc))..."
PRO_USD_PRICE=$(stripe prices create \
  -d "currency=usd" \
  -d "unit_amount=$PRO_USD_AMOUNT" \
  -d "recurring[interval]=month" \
  -d "product=$PRO_PRODUCT_ID" \
  -d "nickname=Pro Monthly USD (TEST)" \
  -d "lookup_key=pro_monthly_usd_test" \
  -d "metadata[tier]=pro" \
  -d "metadata[billing_period]=monthly" \
  -d "metadata[currency]=usd" \
  -d "metadata[test_price]=true" \
  | jq -r '.id')

echo "✅ Pro USD: $PRO_USD_PRICE"
echo ""

########################################
# TEAM PLAN - USD
########################################

echo "Creating Team Monthly USD test price ($(echo "scale=2; $TEAM_USD_AMOUNT/100" | bc))..."
TEAM_USD_PRICE=$(stripe prices create \
  -d "currency=usd" \
  -d "unit_amount=$TEAM_USD_AMOUNT" \
  -d "recurring[interval]=month" \
  -d "product=$TEAM_PRODUCT_ID" \
  -d "nickname=Team Monthly USD (TEST)" \
  -d "lookup_key=team_monthly_usd_test" \
  -d "metadata[tier]=team" \
  -d "metadata[billing_period]=monthly" \
  -d "metadata[currency]=usd" \
  -d "metadata[test_price]=true" \
  | jq -r '.id')

echo "✅ Team USD: $TEAM_USD_PRICE"
echo ""

########################################
# PRO PLAN - THB
########################################

echo "Creating Pro Monthly THB test price (฿$(echo "scale=2; $PRO_THB_AMOUNT/100" | bc))..."
PRO_THB_PRICE=$(stripe prices create \
  -d "currency=thb" \
  -d "unit_amount=$PRO_THB_AMOUNT" \
  -d "recurring[interval]=month" \
  -d "product=$PRO_PRODUCT_ID" \
  -d "nickname=Pro Monthly THB (TEST)" \
  -d "lookup_key=pro_monthly_thb_test" \
  -d "metadata[tier]=pro" \
  -d "metadata[billing_period]=monthly" \
  -d "metadata[currency]=thb" \
  -d "metadata[test_price]=true" \
  | jq -r '.id')

echo "✅ Pro THB: $PRO_THB_PRICE"
echo ""

########################################
# TEAM PLAN - THB
########################################

echo "Creating Team Monthly THB test price (฿$(echo "scale=2; $TEAM_THB_AMOUNT/100" | bc))..."
TEAM_THB_PRICE=$(stripe prices create \
  -d "currency=thb" \
  -d "unit_amount=$TEAM_THB_AMOUNT" \
  -d "recurring[interval]=month" \
  -d "product=$TEAM_PRODUCT_ID" \
  -d "nickname=Team Monthly THB (TEST)" \
  -d "lookup_key=team_monthly_thb_test" \
  -d "metadata[tier]=team" \
  -d "metadata[billing_period]=monthly" \
  -d "metadata[currency]=thb" \
  -d "metadata[test_price]=true" \
  | jq -r '.id')

echo "✅ Team THB: $TEAM_THB_PRICE"
echo ""

########################################
# OUTPUT ENVIRONMENT VARIABLES
########################################

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 Add these to your production environment variables (STRIPE_*_LIVE):"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "STRIPE_PRICE_PRO_USD_LIVE=$PRO_USD_PRICE"
echo "STRIPE_PRICE_TEAM_USD_LIVE=$TEAM_USD_PRICE"
echo "STRIPE_PRICE_PRO_THB_LIVE=$PRO_THB_PRICE"
echo "STRIPE_PRICE_TEAM_THB_LIVE=$TEAM_THB_PRICE"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "⚠️  IMPORTANT REMINDERS:"
echo "   1. These are TEST prices with very low amounts (\$0.50/\$1.00 USD)"
echo "   2. These are MONTHLY prices only (yearly billing not yet supported)"
echo "   3. After testing, replace with your actual production MONTHLY prices"
echo "   4. You can refund test transactions in Stripe Dashboard if needed"
echo "   5. Keep these price IDs for future testing if needed"
echo ""
echo "📝 NOTE: Your Stripe catalog has yearly prices, but the codebase currently"
echo "   only uses monthly prices. Only set the MONTHLY price IDs in env vars."
echo ""

