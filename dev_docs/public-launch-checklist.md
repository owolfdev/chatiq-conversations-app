# Public Launch Checklist

This checklist covers the steps to disable beta mode and launch ChatIQ publicly.

---

## Pre-Launch Preparation

### Technical Readiness

- [ ] **API Documentation Complete**
  - [ ] OpenAPI spec published
  - [ ] Getting started guide complete
  - [ ] Streaming guide complete
  - [ ] Examples and templates ready

- [ ] **Core Features Verified**
  - [ ] Sign-up flow works end-to-end
  - [ ] Bot creation and editing
  - [ ] Document upload and processing
  - [ ] Chat functionality (streaming)
  - [ ] API endpoints functional
  - [ ] Billing and subscriptions

- [ ] **Security & Compliance**
  - [ ] Terms of Service published
  - [ ] Privacy Policy published
  - [ ] Security page published
  - [ ] Moderation working
  - [ ] Rate limiting configured

- [ ] **Monitoring & Support**
  - [ ] Error tracking configured (Sentry)
  - [ ] Analytics enabled (Vercel)
  - [ ] Support email/channel ready
  - [ ] Status page (optional)

---

## Launch Day Steps

### 1. Final Pre-Launch Checks

- [ ] Test sign-up flow as new user
- [ ] Test bot creation and document upload
- [ ] Test chat functionality
- [ ] Verify billing checkout flow
- [ ] Check all documentation links work
- [ ] Test API endpoints with fresh API key

### 2. Disable Beta Mode

**In Vercel Environment Variables:**

1. Set `BETA_MODE=false` (or remove it)
2. Set `NEXT_PUBLIC_BETA_MODE=false` (or remove it)
3. Clear `BETA_ALLOWLIST_EMAILS` (or remove it)

**Or via Vercel CLI:**
```bash
vercel env rm BETA_MODE production
vercel env rm NEXT_PUBLIC_BETA_MODE production
vercel env rm BETA_ALLOWLIST_EMAILS production
```

### 3. Deploy Changes

- [ ] Commit any final changes
- [ ] Push to main branch
- [ ] Verify deployment succeeds
- [ ] Test production site (verify beta mode is off)

### 4. Announce Launch

- [ ] **Product Hunt**
  - [ ] Submit launch post
  - [ ] Prepare screenshots and demo video
  - [ ] Write compelling description

- [ ] **Indie Hackers**
  - [ ] Post launch announcement
  - [ ] Share in relevant threads

- [ ] **Social Media**
  - [ ] Twitter/X announcement
  - [ ] LinkedIn post
  - [ ] Any relevant communities

- [ ] **Email**
  - [ ] Notify waitlist (if applicable)
  - [ ] Email existing beta users

### 5. Monitor Launch

- [ ] Watch error logs (Sentry/Vercel)
- [ ] Monitor sign-up rate
- [ ] Track API usage
- [ ] Monitor server performance
- [ ] Check support channels

---

## Post-Launch (First 24 Hours)

### Immediate Actions

- [ ] Respond to Product Hunt comments
- [ ] Answer questions in communities
- [ ] Monitor for bugs/issues
- [ ] Track sign-ups and conversions

### First Week

- [ ] Collect user feedback
- [ ] Fix any critical bugs
- [ ] Optimize based on traffic patterns
- [ ] Follow up with new sign-ups

---

## Rollback Plan

If critical issues arise:

1. **Re-enable Beta Mode** (temporary):
   ```bash
   vercel env add BETA_MODE production
   # Enter: true
   ```

2. **Add Emergency Allowlist**:
   ```bash
   vercel env add BETA_ALLOWLIST_EMAILS production
   # Enter: your-email@example.com
   ```

3. **Redeploy** to apply restrictions

4. **Fix Issues** before re-launching

---

## Success Metrics

Track these in the first week:

- **Sign-ups**: Target number of new users
- **Conversions**: Free → Paid conversion rate
- **Activation**: Users who create a bot + upload docs
- **Errors**: Error rate and types
- **Support**: Number of support requests

---

## Notes

- Keep beta mode infrastructure in place (easy to re-enable if needed)
- The beta indicator badge will automatically disappear when `BETA_MODE=false`
- All existing users will continue to work normally
- New users can sign up without restrictions

---

## Related Documentation

- [Beta Mode Setup Guide](./beta-mode-setup.md)
- [Technical Architecture](./technical-architecture.md)
- [Security Documentation](./security.md)

