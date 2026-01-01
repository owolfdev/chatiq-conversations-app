# Stripe Email Notifications Guide

This document explains which Stripe actions and webhooks result in emails being sent to users.

## Overview

There are **two sources** of emails related to Stripe:

1. **Stripe's Default Emails** (sent automatically by Stripe)
2. **ChatIQ Application Emails** (sent by your application code)

---

## 1. Stripe's Default Email Notifications

Stripe automatically sends emails for certain events. These are configured in your Stripe Dashboard under **Settings → Emails** and can be customized or disabled.

### Events That Trigger Stripe Emails:

#### ✅ **Invoice Events** (Default: Enabled)
- **`invoice.payment_succeeded`** - Sent when a payment is successfully charged
  - Includes invoice PDF attachment
  - Contains payment details, subscription info, and receipt
  
- **`invoice.payment_failed`** - Sent when a payment attempt fails
  - Alerts user to update payment method
  - Includes retry information
  
- **`invoice.created`** - Sent when an invoice is generated
  - Usually sent before payment attempt
  - Includes invoice details and due date

- **`invoice.finalized`** - Sent when invoice is finalized (before payment)

#### ✅ **Subscription Events** (Default: Enabled)
- **`customer.subscription.created`** - Sent when subscription is first created
  - Welcome email with subscription details
  - Includes plan information and billing cycle
  
- **`customer.subscription.updated`** - Sent when subscription changes
  - Plan upgrades/downgrades
  - Billing cycle changes
  - Quantity changes
  
- **`customer.subscription.deleted`** - Sent when subscription is canceled
  - Confirmation of cancellation
  - Access end date information

#### ✅ **Payment Method Events** (Default: Enabled)
- **`customer.subscription.trial_will_end`** - Sent 3 days before trial ends
  - Reminder to update payment method if needed
  - Trial expiration warning

- **`payment_method.attached`** - Sent when payment method is added

#### ✅ **Customer Portal Events** (Default: Enabled)
- **`customer.updated`** - Sent when customer info is updated via portal

### How to Check/Modify Stripe Email Settings:

1. Go to **Stripe Dashboard → Settings → Emails**
2. Review enabled/disabled email types
3. Customize email templates (if needed)
4. Test emails using Stripe's test mode

### Important Notes:

- **Stripe emails are sent automatically** - Your webhook handler doesn't control these
- **Can be disabled** - You can turn off specific email types in Stripe Dashboard
- **Customizable** - Email templates can be branded in Stripe Dashboard
- **Language** - Stripe emails are sent in the customer's preferred language (if set)

---

## 2. ChatIQ Application Emails

Your application sends emails through **Resend** for specific user actions. These are **NOT** triggered by Stripe webhooks.

### Application Emails:

#### ✅ **Welcome Email**
- **Trigger**: User signs up (`signUpAction` in `src/app/actions/auth/auth-actions.ts`)
- **When**: Immediately after successful account creation
- **Content**: Welcome message, getting started guide
- **Not related to Stripe**: Sent regardless of plan

#### ✅ **Setup Guide Email**
- **Trigger**: User creates their first bot (`createBot` in `src/app/actions/bots/create-bot.ts`)
- **When**: When `botCount === 1` (first bot creation)
- **Content**: Bot setup instructions, tips
- **Not related to Stripe**: Sent regardless of plan

#### ✅ **Upgrade Nudge Email**
- **Trigger**: Manual call to `sendUpgradeNudgeToFreeUsers()` 
- **When**: Can be called from:
  - Scheduled jobs
  - When free users hit limits
  - When free users try premium features
- **Content**: Encourages upgrade from free to paid plan
- **Not related to Stripe**: Sent to free plan users

### Email Functions (Not Webhook-Triggered):

```typescript
// These are NOT called from webhook handlers:
- sendWelcomeEmail()        // Called on signup
- sendSetupGuideEmail()      // Called on first bot creation
- sendUpgradeNudgeEmail()    // Called manually or via scheduled jobs
```

---

## 3. Webhook Handler Analysis

Your webhook handler (`src/app/api/stripe/webhook/route.ts`) processes these events:

### Processed Events:
- `checkout.session.completed` - Links customer to team, updates billing currency
- `customer.subscription.created` - Updates team plan in database
- `customer.subscription.updated` - Updates team plan in database
- `customer.subscription.deleted` - Downgrades team to free plan

### What Webhook Handler Does:
✅ Updates database (team plan, billing currency)  
✅ Logs audit events  
✅ Logs billing events for idempotency  
❌ **Does NOT send emails**

---

## 4. Email Flow Summary

### When User Subscribes (Pro/Team):

1. **User completes checkout** → Stripe processes payment
2. **Stripe sends emails automatically**:
   - `customer.subscription.created` email
   - `invoice.payment_succeeded` email (with receipt)
3. **Your webhook receives** `checkout.session.completed`
4. **Your webhook updates database** (no email sent)
5. **User receives Stripe's emails** (not yours)

### When Subscription Updates:

1. **User upgrades/downgrades** → Stripe processes change
2. **Stripe sends emails automatically**:
   - `customer.subscription.updated` email
   - `invoice.payment_succeeded` email (if prorated charge)
3. **Your webhook receives** `customer.subscription.updated`
4. **Your webhook updates database** (no email sent)

### When Subscription Cancels:

1. **User cancels subscription** → Stripe processes cancellation
2. **Stripe sends emails automatically**:
   - `customer.subscription.deleted` email
   - Confirmation of cancellation
3. **Your webhook receives** `customer.subscription.deleted`
4. **Your webhook downgrades team to free** (no email sent)

### When Payment Fails:

1. **Stripe attempts payment** → Payment fails
2. **Stripe sends emails automatically**:
   - `invoice.payment_failed` email
   - Alert to update payment method
3. **No webhook event** (unless you subscribe to `invoice.payment_failed`)
4. **Your application doesn't send email**

---

## 5. Testing Email Notifications

### For Stripe Emails:

1. **Test Mode**: Use Stripe test cards to trigger events
2. **Check Stripe Dashboard**: View sent emails in **Customers → [Customer] → Emails**
3. **Test Events**: Use Stripe CLI to trigger test webhooks
   ```bash
   stripe trigger invoice.payment_succeeded
   stripe trigger customer.subscription.created
   ```

### For Application Emails:

1. **Check Resend Dashboard**: View sent emails in Resend dashboard
2. **Check Logs**: Application logs email sending errors
3. **Test Functions**: Call email functions directly in development

---

## 6. Recommendations for Testing (Item 44)

When testing live payments, you should verify:

### ✅ Stripe Emails (Automatic):
- [ ] Subscription created email received
- [ ] Invoice payment succeeded email received (with receipt)
- [ ] Subscription updated email received (on upgrade/downgrade)
- [ ] Subscription deleted email received (on cancellation)
- [ ] Payment failed email received (if testing failed payments)

### ✅ Application Emails (Separate):
- [ ] Welcome email sent on signup (not Stripe-related)
- [ ] Setup guide email sent on first bot (not Stripe-related)
- [ ] Upgrade nudge emails work (if testing free tier)

### ⚠️ Important:
- **Stripe emails are automatic** - You don't need to implement them
- **Your webhooks don't send emails** - They only update the database
- **Check Stripe Dashboard** to verify email delivery
- **Customize Stripe email templates** if needed for branding

---

## 7. Disabling Stripe Emails (If Needed)

If you want to disable specific Stripe emails:

1. Go to **Stripe Dashboard → Settings → Emails**
2. Toggle off specific email types
3. **Note**: Some emails (like receipts) may be required by law in some jurisdictions

**Recommended**: Keep payment receipts enabled for compliance and user trust.

---

## Summary

| Event | Stripe Email? | ChatIQ Email? | Webhook Action |
|-------|--------------|---------------|----------------|
| `checkout.session.completed` | ✅ Yes (subscription created) | ❌ No | Updates database |
| `customer.subscription.created` | ✅ Yes | ❌ No | Updates database |
| `customer.subscription.updated` | ✅ Yes | ❌ No | Updates database |
| `customer.subscription.deleted` | ✅ Yes | ❌ No | Downgrades to free |
| `invoice.payment_succeeded` | ✅ Yes (receipt) | ❌ No | Not processed |
| `invoice.payment_failed` | ✅ Yes | ❌ No | Not processed |
| User signup | ❌ No | ✅ Yes (welcome) | N/A |
| First bot creation | ❌ No | ✅ Yes (setup guide) | N/A |

**Key Takeaway**: Stripe handles all billing-related emails automatically. Your application only sends onboarding/engagement emails, not billing emails.

