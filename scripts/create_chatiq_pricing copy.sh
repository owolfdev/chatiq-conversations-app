#!/usr/bin/env bash
set -euo pipefail

# Optional: override currency when running
# Usage: CURRENCY=eur ./scripts/create_chatiq_pricing.sh
CURRENCY="${CURRENCY:-usd}"

: "${STRIPE_API_KEY:?Set STRIPE_API_KEY=sk_test_xxx or sk_live_xxx before running}"

echo "Using currency: $CURRENCY"
echo "Creating products and prices for ChatIQ-style SaaS plans..."
echo

########################################
# FREE PLAN
########################################

echo "Creating Free product..."
FREE_PRODUCT_JSON=$(stripe products create \
  -d "id=plan_free" \
  -d "name=Free" \
  -d "description=Free tier for trying out the platform" \
  -d "metadata[tier]=free" \
  -d "metadata[chatbots]=1" \
  -d "metadata[messages_included]=100" \
  -d "metadata[storage_mb]=5" \
  -d "metadata[api_access]=false" \
  -d "metadata[priority_support]=false")

echo "$FREE_PRODUCT_JSON" > /tmp/chatiq_free_product.json

stripe prices create \
  -d "currency=$CURRENCY" \
  -d "unit_amount=0" \
  -d "recurring[interval]=month" \
  -d "product=plan_free" \
  -d "nickname=Free Monthly" \
  -d "lookup_key=free_monthly" \
  -d "metadata[tier]=free" \
  -d "metadata[plan_name]=Free" \
  -d "metadata[messages_included]=100" \
  -d "metadata[storage_mb]=5"

echo "Created Free product + monthly price"
echo

########################################
# PRO PLAN
########################################

echo "Creating Pro product..."
PRO_PRODUCT_JSON=$(stripe products create \
  -d "id=plan_pro" \
  -d "name=Pro" \
  -d "description=For serious chatbot builders" \
  -d "metadata[tier]=pro" \
  -d "metadata[chatbots]=unlimited" \
  -d "metadata[messages_included]=10000" \
  -d "metadata[storage_mb]=1024" \
  -d "metadata[api_access]=true" \
  -d "metadata[priority_support]=true")

echo "$PRO_PRODUCT_JSON" > /tmp/chatiq_pro_product.json

# Pro Monthly: $19 / month
stripe prices create \
  -d "currency=$CURRENCY" \
  -d "unit_amount=1900" \
  -d "recurring[interval]=month" \
  -d "product=plan_pro" \
  -d "nickname=Pro Monthly" \
  -d "lookup_key=pro_monthly" \
  -d "metadata[tier]=pro" \
  -d "metadata[billing_period]=monthly" \
  -d "metadata[messages_included]=10000" \
  -d "metadata[storage_mb]=1024"

# Pro Yearly: $190 / year
stripe prices create \
  -d "currency=$CURRENCY" \
  -d "unit_amount=19000" \
  -d "recurring[interval]=year" \
  -d "product=plan_pro" \
  -d "nickname=Pro Yearly" \
  -d "lookup_key=pro_yearly" \
  -d "metadata[tier]=pro" \
  -d "metadata[billing_period]=yearly" \
  -d "metadata[messages_included]=10000" \
  -d "metadata[storage_mb]=1024"

echo "Created Pro product + monthly/yearly prices"
echo

########################################
# TEAM PLAN
########################################

echo "Creating Team product..."
TEAM_PRODUCT_JSON=$(stripe products create \
  -d "id=plan_team" \
  -d "name=Team" \
  -d "description=For growing teams and advanced use cases" \
  -d "metadata[tier]=team" \
  -d "metadata[chatbots]=unlimited" \
  -d "metadata[messages_included]=50000" \
  -d "metadata[storage_gb]=10" \
  -d "metadata[collaboration]=true" \
  -d "metadata[analytics]=true" \
  -d "metadata[api_access]=true" \
  -d "metadata[priority_support]=true")

echo "$TEAM_PRODUCT_JSON" > /tmp/chatiq_team_product.json

# Team Monthly: $49 / month
stripe prices create \
  -d "currency=$CURRENCY" \
  -d "unit_amount=4900" \
  -d "recurring[interval]=month" \
  -d "product=plan_team" \
  -d "nickname=Team Monthly" \
  -d "lookup_key=team_monthly" \
  -d "metadata[tier]=team" \
  -d "metadata[billing_period]=monthly" \
  -d "metadata[messages_included]=50000" \
  -d "metadata[storage_gb]=10"

# Team Yearly: $490 / year
stripe prices create \
  -d "currency=$CURRENCY" \
  -d "unit_amount=49000" \
  -d "recurring[interval]=year" \
  -d "product=plan_team" \
  -d "nickname=Team Yearly" \
  -d "lookup_key=team_yearly" \
  -d "metadata[tier]=team" \
  -d "metadata[billing_period]=yearly" \
  -d "metadata[messages_included]=50000" \
  -d "metadata[storage_gb]=10"

echo "Created Team product + monthly/yearly prices"
echo

########################################
# ENTERPRISE PLAN
########################################

echo "Creating Enterprise product..."
ENTERPRISE_PRODUCT_JSON=$(stripe products create \
  -d "id=plan_enterprise" \
  -d "name=Enterprise" \
  -d "description=Custom high-volume plan with full customization" \
  -d "metadata[tier]=enterprise" \
  -d "metadata[custom_limits]=true" \
  -d "metadata[white_label]=true" \
  -d "metadata[sso_supported]=true" \
  -d "metadata[dedicated_support]=true")

echo "$ENTERPRISE_PRODUCT_JSON" > /tmp/chatiq_enterprise_product.json

# Placeholder subscription price (contract-based billing handled separately)
stripe prices create \
  -d "currency=$CURRENCY" \
  -d "unit_amount=0" \
  -d "recurring[interval]=month" \
  -d "product=plan_enterprise" \
  -d "nickname=Enterprise Contract (Placeholder)" \
  -d "lookup_key=enterprise_contract" \
  -d "metadata[tier]=enterprise" \
  -d "metadata[billing_period]=monthly" \
  -d "metadata[custom_contract]=true"

echo "Created Enterprise product + placeholder monthly price"
echo

########################################
# (OPTIONAL) METERED OVERAGE FOR MESSAGES
########################################
# Uncomment and adapt when you’re ready for overages; keep commented for now.
#
# echo "Creating Pro / Team metered overage prices..."
# stripe prices create \
#   -d "currency=$CURRENCY" \
#   -d "unit_amount=100" \
#   -d "recurring[interval]=month" \
#   -d "usage_type=metered" \
#   -d "product=plan_pro" \
#   -d "nickname=Pro Message Overage (per 1k)" \
#   -d "lookup_key=pro_messages_overage_1k" \
#   -d "metadata[tier]=pro" \
#   -d "metadata[metric]=messages" \
#   -d "metadata[unit]=1000_messages"
#
# stripe prices create \
#   -d "currency=$CURRENCY" \
#   -d "unit_amount=100" \
#   -d "recurring[interval]=month" \
#   -d "usage_type=metered" \
#   -d "product=plan_team" \
#   -d "nickname=Team Message Overage (per 1k)" \
#   -d "lookup_key=team_messages_overage_1k" \
#   -d "metadata[tier]=team" \
#   -d "metadata[metric]=messages" \
#   -d "metadata[unit]=1000_messages"

echo "All core products and prices created."
echo "You can now use lookup_keys (e.g. 'pro_monthly', 'team_yearly') in your app."