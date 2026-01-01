#!/usr/bin/env bash
set -euo pipefail

# Must be a TEST key: sk_test_...
: "${STRIPE_API_KEY:?Set STRIPE_API_KEY=sk_test_REDACTED before running}"

echo "# TEST mode Stripe price IDs for .env.local"

fetch_price_id() {
  local lookup_key="$1"
  stripe prices list \
    -d "lookup_keys[]=$lookup_key" \
    -d "active=true" \
    -d "limit=1" \
  | jq -r '.data[0].id // empty'
}

PRO_USD=$(fetch_price_id "pro_monthly")
TEAM_USD=$(fetch_price_id "team_monthly")
PRO_THB=$(fetch_price_id "pro_monthly_thb")
TEAM_THB=$(fetch_price_id "team_monthly_thb")

echo "STRIPE_PRICE_PRO_USD=${PRO_USD}"
echo "STRIPE_PRICE_TEAM_USD=${TEAM_USD}"
echo "STRIPE_PRICE_PRO_THB=${PRO_THB}"
echo "STRIPE_PRICE_TEAM_THB=${TEAM_THB}"