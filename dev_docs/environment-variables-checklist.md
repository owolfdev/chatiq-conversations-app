# Environment Variables Checklist

This document lists all required and optional environment variables for ChatIQ, organized by category.

## Critical for Middleware (Required for App to Function)

These are the **minimum** variables needed for the middleware to work:

```bash
# Supabase (Required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

**If these are missing**, the middleware will fail and you'll see 500 errors on protected routes.

---

## Required for Full Application Functionality

### Supabase
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

### OpenAI
```bash
OPENAI_API_KEY=sk-your-openai-key-here
```

### Stripe (Test Mode - Required)
```bash
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_PRO_USD=price_...
STRIPE_PRICE_TEAM_USD=price_...
STRIPE_PRICE_PRO_THB=price_...
STRIPE_PRICE_TEAM_THB=price_...
```

### Resend (Email)
```bash
RESEND_API_KEY=re_...
```

---

## Optional but Recommended

### App Configuration
```bash
NEXT_PUBLIC_APP_URL=https://www.chatiq.io
```

### Beta Mode (Optional)
```bash
BETA_MODE=true
BETA_ALLOWLIST_EMAILS=email1@example.com,email2@example.com
BETA_ACCESS_MESSAGE=Custom beta access message
NEXT_PUBLIC_BETA_MODE=true  # For UI indicator
```

### Stripe Live Mode (Required for Production Payments)
```bash
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_LIVE=pk_live_...
STRIPE_SECRET_KEY_LIVE=sk_live_...
STRIPE_WEBHOOK_SECRET_LIVE=whsec_...
STRIPE_PRICE_PRO_USD_LIVE=price_...
STRIPE_PRICE_TEAM_USD_LIVE=price_...
STRIPE_PRICE_PRO_THB_LIVE=price_...
STRIPE_PRICE_TEAM_THB_LIVE=price_...
```

### Other Optional
```bash
EMBEDDING_WORKER_SECRET=your-secret-here
INVITE_EMAIL_FROM=ChatIQ <noreply@chatiq.io>
NEXT_PUBLIC_ENABLE_ANALYTICS=true
```

---

## How to Check What's Missing in Vercel

1. **Go to your Vercel project dashboard**
2. **Navigate to Settings → Environment Variables**
3. **Compare with the list above**

## Common Issues

### Middleware 500 Error
**Cause:** Missing `NEXT_PUBLIC_SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_ANON_KEY`

**Solution:** Add these to Vercel environment variables

### Build Fails with "Missing required environment variable"
**Cause:** One or more required variables from the "Required" section above are missing

**Solution:** Add all required variables to Vercel

### Prices Show Fallback Values ($29, $79)
**Cause:** 
- Stripe price IDs are missing or invalid
- Live mode prices not configured in production

**Solution:** 
- Verify all `STRIPE_PRICE_*` variables are set
- For production, ensure `STRIPE_PRICE_*_LIVE` variables are set
- Check Stripe Diagnostics page at `/dashboard/admin/stripe`

### Beta Mode Not Working
**Cause:** `BETA_MODE` not set or `BETA_ALLOWLIST_EMAILS` not configured

**Solution:** Set `BETA_MODE=true` and optionally `BETA_ALLOWLIST_EMAILS`

---

## Quick Diagnostic

Use the Stripe Diagnostics page at `/dashboard/admin/stripe` to check:
- ✅ Environment variable status
- ✅ API connectivity
- ✅ Price validation
- ✅ System status

This will show you exactly what's configured and what's missing.

