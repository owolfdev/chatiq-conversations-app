# CI/CD Troubleshooting Guide

## Current Status

All three workflows are failing quickly (16-20 seconds), which suggests early failures during setup or build.

## Missing Secret

You're missing one required secret:
- **`RESEND_API_KEY`** - Required for email functionality (password resets, invites, etc.)

## How to Check What's Failing

1. **Go to your GitHub repository**
2. **Click "Actions" tab**
3. **Click on a failed workflow run** (e.g., "PR Checks #8")
4. **Click on the failed job** (e.g., "Build Check")
5. **Expand the failed step** to see the error message

The error message will tell us exactly what's wrong!

## Common Issues

### 1. Missing RESEND_API_KEY

**Error:** `Missing required environment variable: RESEND_API_KEY`

**Solution:** Add `RESEND_API_KEY` as a GitHub Secret:
- Go to: `https://github.com/owolfdev/chatiq/settings/secrets/actions`
- Click "New repository secret"
- Name: `RESEND_API_KEY`
- Value: Your Resend API key (starts with `re_`)

### 2. Build Validation Failures

**Error:** `Environment validation failed: ...`

**Solution:** Check that all required environment variables are:
1. Set as GitHub Secrets
2. Have the correct format (see validation errors)

### 3. Workflow Syntax Errors

**Error:** Workflow file parsing errors

**Solution:** Check YAML syntax in workflow files

## Required Secrets Checklist

Make sure you have ALL of these:

- [x] `TEST_USER_EMAIL`
- [x] `TEST_USER_PASSWORD`
- [x] `NEXT_PUBLIC_SUPABASE_URL`
- [x] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [x] `SUPABASE_URL`
- [x] `SUPABASE_ANON_KEY`
- [x] `SUPABASE_SERVICE_ROLE_KEY`
- [x] `OPENAI_API_KEY`
- [x] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- [x] `STRIPE_SECRET_KEY`
- [x] `STRIPE_WEBHOOK_SECRET`
- [x] `STRIPE_PRICE_PRO_USD`
- [x] `STRIPE_PRICE_TEAM_USD`
- [x] `STRIPE_PRICE_PRO_THB`
- [x] `STRIPE_PRICE_TEAM_THB`
- [ ] `RESEND_API_KEY` ⚠️ **MISSING**

## Next Steps

1. **Check the actual error messages** in the failed workflow runs
2. **Add `RESEND_API_KEY` secret** if it's missing
3. **Share the error messages** so we can fix any other issues

