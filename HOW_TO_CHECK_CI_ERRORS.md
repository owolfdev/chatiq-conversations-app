# How to Check CI/CD Error Messages

## Quick Steps to See What's Failing

1. **Go to GitHub Actions:**
   - Open: `https://github.com/owolfdev/chatiq/actions`

2. **Click on a failed workflow:**
   - Click "PR Checks #9" (or the most recent failed run)

3. **Click on the failed job:**
   - Look for a red ❌ next to a job name (e.g., "Build Check", "Lint", "Type Check")
   - Click on that job name

4. **Expand the failed step:**
   - Scroll down to see the steps
   - Click the arrow (▶) next to the failed step to expand it
   - Look for red error text

5. **Copy the error message:**
   - The error will show what's wrong
   - Common errors:
     - `Missing required environment variable: ...`
     - `Environment validation failed: ...`
     - Build errors
     - Test failures

## What to Look For

### Common Error Patterns:

1. **"Missing required environment variable"**
   - Example: `Missing required environment variable: RESEND_API_KEY`
   - **Fix:** Add that secret to GitHub Secrets

2. **"Environment validation failed"**
   - Lists all missing/invalid variables
   - **Fix:** Add all missing secrets or fix format

3. **Build errors**
   - TypeScript errors
   - Import errors
   - **Fix:** Usually code issues, not secrets

4. **Test failures**
   - Unit test failures
   - E2E test failures
   - **Fix:** Fix the test or test data

## Screenshot What You See

Once you expand the error, take a screenshot or copy the error message and share it!

## Quick Checklist

Make sure you have these secrets (check at `https://github.com/owolfdev/chatiq/settings/secrets/actions`):

- [ ] `TEST_USER_EMAIL`
- [ ] `TEST_USER_PASSWORD`
- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_URL`
- [ ] `SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `OPENAI_API_KEY`
- [ ] `RESEND_API_KEY`
- [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- [ ] `STRIPE_SECRET_KEY`
- [ ] `STRIPE_WEBHOOK_SECRET`
- [ ] `STRIPE_PRICE_PRO_USD`
- [ ] `STRIPE_PRICE_TEAM_USD`
- [ ] `STRIPE_PRICE_PRO_THB`
- [ ] `STRIPE_PRICE_TEAM_THB`

