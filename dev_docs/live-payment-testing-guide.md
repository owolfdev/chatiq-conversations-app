# Live Payment Testing Guide

This guide explains how to safely test Stripe payments in **live mode** before public launch without charging full production prices.

## Why Test in Live Mode?

While Stripe's test mode is excellent for development, you need to verify:
- Real credit card processing works
- Webhook delivery in production environment
- Production database integration
- Actual payment method validation
- Real-world edge cases

## Recommended Approach: Low-Cost Test Prices

**✅ DO:** Create separate test prices with very low amounts ($0.50/$1.00 USD)  
**❌ DON'T:** Temporarily lower your actual production prices

### Benefits:
- No risk of leaving low prices in production
- Can keep test prices for future testing
- Easy to switch between test and production prices
- Minimal cost if you need to test multiple times

## Step-by-Step Process

### 1. Create Test Prices

Run the script to create low-cost test prices in Stripe live mode:

```bash
STRIPE_API_KEY=sk_live_xxx ./scripts/create_live_test_prices.sh
```

This creates:
- Pro USD: $0.50/month
- Team USD: $1.00/month
- Pro THB: ฿20.00/month
- Team THB: ฿40.00/month

The script will output the price IDs you need.

### 2. Set Environment Variables

Add the test price IDs to your production environment:

```bash
STRIPE_PRICE_PRO_USD_LIVE=price_xxx_test
STRIPE_PRICE_TEAM_USD_LIVE=price_xxx_test
STRIPE_PRICE_PRO_THB_LIVE=price_xxx_test
STRIPE_PRICE_TEAM_THB_LIVE=price_xxx_test
```

Also ensure these are set:
```bash
STRIPE_SECRET_KEY_LIVE=sk_live_xxx
STRIPE_WEBHOOK_SECRET_LIVE=whsec_xxx
```

### 3. Perform Testing

Follow the comprehensive testing checklist in `docs/90-day-todo.md` (item #42):

- ✅ Checkout flow (Pro and Team)
- ✅ Subscription upgrades/downgrades
- ✅ Cancellation and reactivation
- ✅ Billing portal access
- ✅ Webhook event logging
- ✅ Edge cases (expired cards, declined payments)

### 4. Refund Test Transactions (Optional)

If you want to recover the small test charges:

1. Go to Stripe Dashboard → Payments
2. Find test transactions
3. Click "Refund" for each one

Or use the Stripe CLI:
```bash
stripe refunds create --payment-intent pi_xxx
```

### 5. Switch to Production Prices

After testing is complete, replace the test price IDs with your actual production prices:

```bash
STRIPE_PRICE_PRO_USD_LIVE=price_production_pro_usd
STRIPE_PRICE_TEAM_USD_LIVE=price_production_team_usd
STRIPE_PRICE_PRO_THB_LIVE=price_production_pro_thb
STRIPE_PRICE_TEAM_THB_LIVE=price_production_team_thb
```

**Important:** Keep the test price IDs documented somewhere safe for future testing needs.

## Alternative: Use Real Cards with Immediate Refunds

If you prefer to test with actual production prices:

1. Use real credit cards for testing
2. Immediately refund each transaction after verification
3. Document the refund process for accounting

**Note:** This approach is more complex and requires careful tracking.

## Safety Checklist

Before starting live testing:

- [ ] Verify you're using live Stripe keys (not test keys)
- [ ] Confirm test price amounts are correct ($0.50/$1.00)
- [ ] Set up monitoring/alerts for payment failures
- [ ] Have Stripe Dashboard open to monitor transactions
- [ ] Document all test transactions for accounting
- [ ] Plan refund process if needed
- [ ] Have rollback plan (switch back to test prices if issues found)

## Troubleshooting

### Issue: Test prices not appearing in checkout
- Verify `STRIPE_PRICE_*_LIVE` environment variables are set correctly
- Check that `isStripeLiveModeConfigured()` returns true
- Ensure production environment has been restarted after setting env vars

### Issue: Webhooks not receiving events
- Verify `STRIPE_WEBHOOK_SECRET_LIVE` matches your live webhook endpoint
- Check webhook endpoint is accessible from Stripe's servers
- Review webhook logs in Stripe Dashboard

### Issue: Subscription not activating
- Check database for `stripe_customer_id` linkage
- Verify webhook handler is processing `customer.subscription.created`
- Review application logs for errors

## Post-Testing

After completing all tests:

1. ✅ Replace test prices with production prices
2. ✅ Document any issues found and fixes applied
3. ✅ Verify production prices are correct
4. ✅ Test one final transaction with production prices
5. ✅ Update documentation with any learnings

## Questions?

If you encounter issues during live testing:
- Review Stripe Dashboard for transaction details
- Check application logs for errors
- Verify webhook event processing
- Test in Stripe test mode first to isolate issues

