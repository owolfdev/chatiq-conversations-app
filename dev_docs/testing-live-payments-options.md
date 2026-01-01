# Testing Live Payments - Options

## Current Behavior

The codebase uses live mode **only** when:
1. `NODE_ENV === "production"` (i.e., on Vercel)
2. AND live Stripe keys are configured

In development (`npm run dev`), it **always** uses test mode.

## Option 1: Deploy to Vercel (Recommended) ✅

**Best for:** Final, comprehensive testing before launch

### Steps:
1. Add all live Stripe keys to Vercel environment variables:
   ```
   STRIPE_SECRET_KEY_LIVE=sk_live_xxx
   STRIPE_WEBHOOK_SECRET_LIVE=whsec_xxx
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_LIVE=pk_live_xxx
   STRIPE_PRICE_PRO_USD_LIVE=price_xxx (test prices)
   STRIPE_PRICE_TEAM_USD_LIVE=price_xxx (test prices)
   STRIPE_PRICE_PRO_THB_LIVE=price_xxx (test prices)
   STRIPE_PRICE_TEAM_THB_LIVE=price_xxx (test prices)
   ```

2. Deploy to Vercel (production environment)

3. Test on the live URL

4. After testing, replace test price IDs with production prices

**Pros:**
- Tests in real production environment
- Webhooks work correctly
- Database integration is real
- Most accurate testing scenario

**Cons:**
- Requires deployment
- Slightly slower iteration

## Option 2: Temporarily Enable Live Mode in Development

**Best for:** Quick local testing before deploying

### Steps:

1. **Temporarily modify `src/lib/stripe.ts`:**

   Change `isLiveMode()` function:
   ```typescript
   export function isLiveMode(): boolean {
     // TEMPORARY: Allow live mode in development for testing
     // TODO: Remove this before committing
     if (process.env.ENABLE_LIVE_MODE_IN_DEV === "true") {
       return isStripeLiveModeConfigured();
     }
     
     // Original logic
     if (process.env.NEXT_PHASE === "phase-production-build") {
       return false;
     }
     return process.env.NODE_ENV === "production" && isStripeLiveModeConfigured();
   }
   ```

2. **Add to `.env.local`:**
   ```bash
   ENABLE_LIVE_MODE_IN_DEV=true
   STRIPE_SECRET_KEY_LIVE=sk_live_xxx
   STRIPE_WEBHOOK_SECRET_LIVE=whsec_xxx
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_LIVE=pk_live_xxx
   STRIPE_PRICE_PRO_USD_LIVE=price_xxx (test prices)
   STRIPE_PRICE_TEAM_USD_LIVE=price_xxx (test prices)
   STRIPE_PRICE_PRO_THB_LIVE=price_xxx (test prices)
   STRIPE_PRICE_TEAM_THB_LIVE=price_xxx (test prices)
   ```

3. **Restart dev server:**
   ```bash
   npm run dev
   ```

4. **⚠️ IMPORTANT:** Revert the code change before committing!

**Pros:**
- Fast iteration
- Test locally without deploying
- Good for initial testing

**Cons:**
- Webhooks won't work (localhost not accessible)
- Not the same as production environment
- Easy to forget to revert code changes
- Risk of committing live mode code

## Recommendation

**For comprehensive testing:** Use Option 1 (Vercel deployment)

**For quick checks:** Use Option 2 temporarily, then do final testing on Vercel

## Testing Checklist

Regardless of which option you choose:

- [ ] Test Pro plan checkout (USD)
- [ ] Test Team plan checkout (USD)
- [ ] Test Pro plan checkout (THB)
- [ ] Test Team plan checkout (THB)
- [ ] Verify subscription activates correctly
- [ ] Test upgrade from Pro to Team
- [ ] Test downgrade from Team to Pro
- [ ] Test cancellation
- [ ] Test reactivation
- [ ] Verify webhook events are received (Vercel only)
- [ ] Check database records are correct
- [ ] Test billing portal access
- [ ] Test edge cases (expired cards, declined payments)

