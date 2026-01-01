# Stripe Trials Guide

## Current Status

**No trials are currently configured.** The pricing page buttons say "Start Free Trial" but they create regular subscriptions immediately (no trial period).

## Do You Need Trials?

Since you have a **free tier**, trials are optional. Here's the difference:

### Free Tier
- ✅ No payment method required
- ✅ Users can try for 30 days
- ❌ Limited features (1 chatbot, 1,000 messages/month during the 30-day free period, 5MB storage)

### Trial (if added)
- ✅ Full paid features for X days
- ✅ Requires payment method upfront (higher commitment)
- ✅ Automatically converts to paid after trial
- ❌ More complex to set up and manage

## Recommendation

**Option 1: No Trials (Recommended)** ✅
- Simpler setup
- Free tier already serves as "trial"
- Users can upgrade when ready
- **Action:** Change button text to "Upgrade to Pro" / "Upgrade to Team"

**Option 2: Add Trials**
- Better conversion (payment method = commitment)
- Users get full features during trial
- **Action:** Set up trial periods in Stripe checkout

## How to Add Trials (If You Want Them)

### Step 1: Update Checkout API

Modify `src/app/api/billing/checkout/route.ts`:

```typescript
const session = await stripe.checkout.sessions.create({
  mode: "subscription",
  customer: customerId,
  line_items: [
    {
      price: priceId,
      quantity: 1,
    },
  ],
  subscription_data: {
    trial_period_days: 14, // 14-day free trial
    metadata: {
      team_id: team.id,
      app: "chatiq",
    },
  },
  // ... rest of config
});
```

### Step 2: Handle Trial Status

Your webhook already checks for `trialing` status (good!), but you may want to:

1. **Show trial status in billing page:**
   ```typescript
   const isTrialing = stripeSubscription?.status === "trialing";
   const trialEndsAt = stripeSubscription?.trial_end;
   ```

2. **Display trial info to users:**
   - "Your trial ends on [date]"
   - "You'll be charged $X on [date]"

### Step 3: Test Trial Flow

- Create subscription with trial
- Verify subscription status is "trialing"
- Wait for trial to end (or use Stripe test clock)
- Verify automatic conversion to "active"
- Verify first charge occurs

## Trial Best Practices

If you add trials:

1. **Trial Length:** 7-14 days is common
2. **Payment Method:** Require upfront (better conversion)
3. **Communication:** Email users 2 days before trial ends
4. **Cancellation:** Allow easy cancellation during trial
5. **Conversion:** Track trial → paid conversion rate

## Current Button Text

The buttons currently say "Start Free Trial" but should say:
- "Upgrade to Pro" (if no trial)
- "Start Free Trial" (if trial is added)

## Decision Matrix

| Scenario | Recommendation |
|----------|---------------|
| Want simple setup | No trials, change button text |
| Want higher conversion | Add 14-day trial |
| Free tier is sufficient | No trials needed |
| Want to test paid features | Add trial |

## Next Steps

1. **Decide:** Trial or no trial?
2. **If no trial:** Update button text (already done above)
3. **If trial:** Add `trial_period_days` to checkout API
4. **Test:** Verify trial flow works correctly
