# Time-Limited Free Tier Strategy (30 Days)

## Your Proposal: Time-Limited Free Tier

**Concept:**
- Free tier for 30 days (no credit card required)
- After 30 days, force upgrade to continue
- Lower barrier than trial (no credit card)
- Creates urgency (time pressure)
- Forces decision point

## Why This Works Better

### Conversion Psychology

1. **Lower Barrier:** No credit card = more signups
2. **Time Investment:** User has 30 days to build value (chatbots, documents)
3. **Urgency:** Countdown creates FOMO
4. **Commitment:** User is already invested (not just trying)
5. **Better Conversion:** Typically 15-25% (better than trial without card, similar to trial with card)

### Comparison

| Approach | Signups | Conversion | Barrier | Cost Control |
|----------|---------|------------|---------|--------------|
| **Time-Limited Free (30d)** | High | 15-25% | Low | ✅ Good |
| Trial with Credit Card | Medium | 20-40% | High | ✅ Excellent |
| Trial without Credit Card | Very High | 5-15% | Very Low | ❌ Poor |
| Unlimited Free Tier | Very High | 2-5% | Very Low | ❌ Poor |

**Your approach is the sweet spot!** ✅

## Implementation Plan

### Step 1: Track Account Age

Users already have `created_at` timestamp in:
- `bot_user_profiles.created_at`
- `bot_teams.created_at`

### Step 2: Create Helper Function

```typescript
// src/lib/plans/free-tier-expiry.ts

export function isFreeTierExpired(createdAt: string | Date): boolean {
  const accountAge = Date.now() - new Date(createdAt).getTime();
  const thirtyDays = 30 * 24 * 60 * 60 * 1000; // 30 days in ms
  return accountAge > thirtyDays;
}

export function getDaysRemaining(createdAt: string | Date): number {
  const accountAge = Date.now() - new Date(createdAt).getTime();
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;
  const remaining = thirtyDays - accountAge;
  return Math.max(0, Math.ceil(remaining / (24 * 60 * 60 * 1000)));
}
```

### Step 3: Add Middleware/Check

Add check in:
- Chat API endpoints
- Document creation
- Bot creation
- Dashboard access

```typescript
// In your API routes or middleware
if (plan === "free") {
  const team = await getTeam(teamId);
  if (isFreeTierExpired(team.created_at)) {
    throw new Error("Free tier expired. Please upgrade to continue.");
  }
}
```

### Step 4: Show Upgrade Prompt

Display in:
- Dashboard banner
- Chat interface
- Document upload
- Bot creation

```tsx
{plan === "free" && daysRemaining <= 7 && (
  <Alert>
    Your free trial ends in {daysRemaining} days. Upgrade to continue.
  </Alert>
)}
```

### Step 5: Block Access After 30 Days

After 30 days:
- Block chat requests
- Block document uploads
- Block bot creation
- Show upgrade modal (can't dismiss)

## Database Schema

No changes needed! You already have:
- `bot_teams.created_at` - Account creation date
- `bot_teams.plan` - Current plan

## User Experience Flow

### Day 1-23: Normal Usage
- Full free tier features
- No restrictions
- Subtle upgrade prompts

### Day 24-30: Warning Phase
- Banner: "Your free trial ends in X days"
- Email reminders (2 days before, 1 day before)
- Upgrade prompts more prominent

### Day 31+: Blocked
- All features blocked
- Upgrade modal (can't dismiss)
- "Upgrade to continue" message

## Email Campaign

Send automated emails:
- **Day 28:** "2 days left - Upgrade now"
- **Day 29:** "1 day left - Don't lose access"
- **Day 30:** "Last day - Upgrade to keep your chatbots"
- **Day 31:** "Your free trial has ended - Upgrade to continue"

## Conversion Optimization

### Best Practices:

1. **Countdown Timer:** Show days remaining prominently
2. **Value Reminder:** "You've created X chatbots, uploaded Y documents"
3. **Urgency:** "Upgrade in next 24 hours to keep everything"
4. **Social Proof:** "Join 1,000+ Pro users"
5. **Easy Upgrade:** One-click upgrade button

## Cost Analysis

### Current (Unlimited Free):
```
100 free users × $0.20/month = $20/month (recurring)
After 6 months: $120 total
Conversion: 2-5% = 2-5 paid users
```

### Time-Limited Free (30 days):
```
100 signups × $0.20 × (30/30) = $20 one-time
After 30 days: 15-25 convert = 15-25 paid users
Revenue: 15-25 × $19 = $285-475/month
Much better ROI!
```

## Implementation Checklist

- [ ] Create `isFreeTierExpired()` helper function
- [ ] Create `getDaysRemaining()` helper function
- [ ] Add expiry check to chat API
- [ ] Add expiry check to document API
- [ ] Add expiry check to bot creation API
- [ ] Add countdown banner to dashboard
- [ ] Add upgrade modal for expired accounts
- [ ] Set up email reminders (day 28, 29, 30)
- [ ] Update pricing page copy
- [ ] Test full flow (signup → 30 days → upgrade)

## Marketing Copy Updates

**Pricing Page:**
- "30-Day Free Trial" (instead of "Free Forever")
- "No credit card required"
- "Full features for 30 days"

**Dashboard:**
- "X days remaining in your free trial"
- "Upgrade to keep your chatbots"

## Advantages of This Approach

1. ✅ **Lower Barrier:** No credit card = more signups
2. ✅ **Better Conversion:** 15-25% (vs 2-5% unlimited)
3. ✅ **Cost Control:** Max 30 days of free usage
4. ✅ **Urgency:** Time pressure = better conversion
5. ✅ **User Investment:** 30 days to build value
6. ✅ **Practical:** Easy to implement
7. ✅ **Flexible:** Can adjust days (14, 21, 30, 45)

## Potential Issues & Solutions

### Issue: Users create multiple accounts
**Solution:** Track by email/IP, require email verification

### Issue: Users forget to upgrade
**Solution:** Email reminders, prominent banners

### Issue: Users lose data
**Solution:** Grace period (7 days) to upgrade and recover

### Issue: Support requests
**Solution:** Clear messaging, FAQ, automated emails

## Recommendation

**This is an excellent strategy!** ✅

It balances:
- Low barrier (no credit card)
- Good conversion (15-25%)
- Cost control (30-day limit)
- User experience (time to build value)

**Next Steps:**
1. Implement expiry checks
2. Add countdown UI
3. Set up email reminders
4. Test and launch!

