# Stripe Pricing Setup Analysis

## Current Product Catalog

### ✅ Free Plan
- **Product**: Free
- **Prices**: None (correct - $0 plan)
- **Status**: ✅ Correctly configured

### ✅ Pro Plan
- **Product**: Pro
- **Prices**: 4 prices total
  - $19.00 USD/month (Pro Monthly) ← **USED BY CODEBASE**
  - $190.00 USD/year (Pro Yearly) ← **NOT YET INTEGRATED**
  - ฿699.00 THB/month (Pro Monthly THB) ← **USED BY CODEBASE**
  - ฿6,990.00 THB/year (Pro Yearly THB) ← **NOT YET INTEGRATED**
- **Status**: ✅ Monthly prices configured correctly

### ✅ Team Plan
- **Product**: Team
- **Prices**: 4 prices total
  - $49.00 USD/month (Team Monthly) ← **USED BY CODEBASE**
  - $490.00 USD/year (Team Yearly) ← **NOT YET INTEGRATED**
  - ฿1,699.00 THB/month (Team Monthly THB) ← **USED BY CODEBASE**
  - ฿16,990.00 THB/year (Team Yearly THB) ← **NOT YET INTEGRATED**
- **Status**: ✅ Monthly prices configured correctly

### ✅ Enterprise Plan
- **Product**: Enterprise
- **Prices**: None (correct - custom pricing, contact-based)
- **Status**: ✅ Correctly configured (handled via `/contact` page, not Stripe)

## Codebase Analysis

### What the Code Uses

The codebase currently **only supports monthly subscriptions**. The checkout API (`/api/billing/checkout`) accepts:
- `plan`: "pro" or "team"
- `currency`: "usd" or "thb"

It does **NOT** accept a billing period parameter, so it always uses the monthly price IDs.

### Environment Variables Needed

For **test mode**:
```bash
STRIPE_PRICE_PRO_USD=price_xxx          # Monthly Pro USD
STRIPE_PRICE_TEAM_USD=price_xxx         # Monthly Team USD
STRIPE_PRICE_PRO_THB=price_xxx          # Monthly Pro THB
STRIPE_PRICE_TEAM_THB=price_xxx         # Monthly Team THB
```

For **live mode**:
```bash
STRIPE_PRICE_PRO_USD_LIVE=price_xxx     # Monthly Pro USD
STRIPE_PRICE_TEAM_USD_LIVE=price_xxx    # Monthly Team USD
STRIPE_PRICE_PRO_THB_LIVE=price_xxx     # Monthly Pro THB
STRIPE_PRICE_TEAM_THB_LIVE=price_xxx    # Monthly Team THB
```

### Yearly Prices

**Status**: Yearly prices exist in Stripe but are **not yet integrated** into the codebase.

**To add yearly support**, you would need to:
1. Add a `billingPeriod` parameter to the checkout API
2. Update `getStripePriceId()` to accept billing period
3. Add environment variables for yearly prices (e.g., `STRIPE_PRICE_PRO_USD_YEARLY`)
4. Update UI to let users choose monthly vs yearly
5. Update test price script to create yearly test prices

**For now**: Only use the **monthly price IDs** in your environment variables.

## Recommendations for Testing

### ✅ What to Test

1. **Monthly subscriptions only** (Pro and Team, USD and THB)
2. **Free plan** (no payment needed, just verify it works)
3. **Enterprise plan** (verify it redirects to `/contact`)

### ⚠️ What NOT to Test Yet

- Yearly subscriptions (not integrated)
- Enterprise checkout (it's contact-based, not Stripe-based)

### Test Price Strategy

When creating test prices for live mode testing:

1. **Create monthly test prices only** ($0.50/$1.00 USD)
2. **Use the monthly price IDs** in your `STRIPE_PRICE_*_LIVE` variables
3. **Ignore yearly prices** for now (they're not used)

The test price script (`scripts/create_live_test_prices.sh`) creates monthly prices, which is correct.

## Verification Checklist

Before starting live payment testing:

- [ ] Verify you have 4 monthly price IDs (Pro USD, Team USD, Pro THB, Team THB)
- [ ] Confirm these are the **monthly** prices, not yearly
- [ ] Set environment variables with monthly price IDs only
- [ ] Verify Enterprise plan redirects to contact (not Stripe checkout)
- [ ] Verify Free plan works without payment
- [ ] Yearly prices can be ignored for now (future feature)

## Future Enhancements

When ready to add yearly billing:

1. Update checkout API to accept `billingPeriod: "month" | "year"`
2. Add yearly price ID environment variables
3. Update `getStripePriceId()` function
4. Add UI toggle for monthly/yearly selection
5. Update test price script to create yearly test prices
6. Test yearly subscription flow end-to-end

