# Subscription Upgrade Fix

## Problem

When a user with an active subscription (e.g., Pro) tried to upgrade to a higher tier (e.g., Team), the system was creating a **new subscription** instead of updating the existing one. This resulted in:

- ❌ **Two active subscriptions** for the same customer
- ❌ **Double billing** (user charged for both plans)
- ❌ **Confusion** about which subscription is active
- ❌ **Database inconsistency** (team plan might not reflect the correct subscription)

## Solution

Updated the checkout API (`src/app/api/billing/checkout/route.ts`) to:

1. **Check for existing active subscriptions** before creating a new checkout session
2. **Update the existing subscription** if one is found (instead of creating a new one)
3. **Handle proration automatically** using Stripe's subscription update API
4. **Redirect appropriately** based on whether it's a new subscription or an upgrade

## Implementation Details

### Before (Problematic Flow):
```
User clicks "Upgrade to Team" (has Pro subscription)
  ↓
Checkout API creates NEW checkout session
  ↓
User completes checkout
  ↓
NEW Team subscription created
  ↓
User now has BOTH Pro and Team subscriptions ❌
```

### After (Fixed Flow):
```
User clicks "Upgrade to Team" (has Pro subscription)
  ↓
Checkout API checks for existing subscription
  ↓
Finds active Pro subscription
  ↓
Updates subscription to Team plan (prorated)
  ↓
User has ONE Team subscription ✅
```

## Code Changes

### 1. Checkout API (`src/app/api/billing/checkout/route.ts`)

Added logic to:
- Check for existing active subscriptions before creating checkout
- Update subscription if found using `stripe.subscriptions.update()`
- Return appropriate response (upgrade vs new checkout)

```typescript
// Check if user already has an active subscription
if (existingSubscription) {
  // Update existing subscription instead of creating new one
  const updatedSubscription = await stripe.subscriptions.update(
    existingSubscription.id,
    {
      items: [{ id: existingSubscription.items.data[0]?.id, price: priceId }],
      proration_behavior: "always_invoice",
    }
  );
  // Redirect to billing page with success
  return NextResponse.json({ url: `${appUrl}/dashboard/billing?upgrade=success` });
}
```

### 2. Frontend Components

Updated both checkout button components to handle the new response format:
- `src/components/billing/checkout-button.tsx`
- `src/components/home/pricing-card-button.tsx`

## Benefits

✅ **No duplicate subscriptions** - Users only have one active subscription  
✅ **Automatic proration** - Stripe handles prorated charges automatically  
✅ **Immediate upgrade** - No need to go through checkout for upgrades  
✅ **Better UX** - Users see upgrade success immediately  
✅ **Database consistency** - Team plan always matches active subscription  

## Testing Checklist

When testing upgrades (Item 44), verify:

- [ ] Upgrading from Free → Pro creates new subscription (no existing sub)
- [ ] Upgrading from Pro → Team updates existing subscription (no duplicate)
- [ ] Prorated charges are calculated correctly
- [ ] Webhook events fire correctly (`customer.subscription.updated`)
- [ ] Database plan updates correctly
- [ ] User sees success message after upgrade
- [ ] Only one active subscription exists in Stripe Dashboard
- [ ] Billing page shows correct plan after upgrade

## Edge Cases Handled

1. **User already on target plan** - Returns `alreadySubscribed: true`, redirects to billing page
2. **Different currency** - Uses existing subscription's currency (or team's billing_currency)
3. **Failed subscription update** - Falls back to error message, doesn't create duplicate
4. **No existing subscription** - Creates new checkout session as before

## Related Files

- `src/app/api/billing/checkout/route.ts` - Main fix
- `src/components/billing/checkout-button.tsx` - Frontend handler
- `src/components/home/pricing-card-button.tsx` - Frontend handler
- `src/app/api/stripe/webhook/route.ts` - Webhook handler (already handles `customer.subscription.updated`)

## Notes

- Stripe automatically handles proration when updating subscriptions
- The `proration_behavior: "always_invoice"` setting charges the prorated amount immediately
- Webhook `customer.subscription.updated` will fire after the update, which our webhook handler already processes correctly
- This fix only applies to upgrades - downgrades should still go through the billing portal or a separate flow

