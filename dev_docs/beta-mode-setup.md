# Beta Mode Setup Guide

This guide explains how to enable beta/developer-only access to protect your app while allowing logged-in developers to use it.

---

## Overview

Beta mode restricts access to your application to authenticated users only. This is useful when:
- Your app is deployed but not ready for public customers
- You want to limit access to developers and testers
- You need to control who can sign up and use the platform

---

## How It Works

1. **Beta Mode Enabled**: All routes (except auth pages) require authentication
2. **Optional Email Allowlist**: Restrict access to specific email addresses
3. **Public Routes**: Auth pages, API routes, and static assets remain accessible
4. **Beta Access Page**: Unauthenticated users see a "Beta Access Required" page

---

## Setup

### Step 1: Enable Beta Mode

Add to your `.env.local` (or environment variables):

```bash
# Enable beta mode (requires authentication for all routes)
BETA_MODE=true

# Also set this for the beta indicator badge in the header
NEXT_PUBLIC_BETA_MODE=true

# Optional: Restrict to specific emails (comma-separated)
# Leave empty to allow all authenticated users
BETA_ALLOWLIST_EMAILS=developer1@example.com,developer2@example.com

# Optional: Custom message for beta access page
BETA_ACCESS_MESSAGE="ChatIQ is currently in beta. Please sign in to access the platform."
```

**Note:** The `next.config.ts` automatically maps `BETA_MODE` to `NEXT_PUBLIC_BETA_MODE` for the UI indicator, but you can also set `NEXT_PUBLIC_BETA_MODE` directly if needed.

### Step 2: Deploy

The middleware will automatically:
- Check if beta mode is enabled
- Redirect unauthenticated users to `/beta-access`
- Allow authenticated users (or allowlisted emails) to access the app

---

## Configuration Options

### BETA_MODE

- `true` or `1`: Beta mode enabled (requires authentication)
- `false` or `0` or unset: Beta mode disabled (public access)

### BETA_ALLOWLIST_EMAILS

- **Empty or unset**: All authenticated users can access
- **Comma-separated emails**: Only these emails can access (case-insensitive)

Example:
```bash
BETA_ALLOWLIST_EMAILS=dev1@example.com,dev2@example.com,test@example.com
```

### BETA_ACCESS_MESSAGE

- Custom message shown on the beta access page
- Default: "ChatIQ is currently in beta. Please sign in to access the platform."

---

## Public Routes (Always Accessible)

These routes remain accessible even in beta mode:
- `/sign-in` - Sign in page
- `/sign-up` - Sign up page
- `/forgot-password` - Password reset
- `/auth/callback` - Auth callback
- `/beta-access` - Beta access page
- `/contact` - Contact page
- `/legal/*` - Legal pages
- `/api/*` - API routes
- `/_next/*` - Next.js static assets
- `/favicon.ico` - Favicon

---

## User Flow

### Unauthenticated User

1. Visits any page (e.g., `/` or `/dashboard`)
2. Redirected to `/beta-access`
3. Sees "Beta Access Required" message
4. Can click "Sign In" or "Request Access"

### Authenticated User (No Allowlist)

1. Visits any page
2. Middleware checks authentication
3. If authenticated → Access granted
4. If not authenticated → Redirected to `/beta-access`

### Authenticated User (With Allowlist)

1. Visits any page
2. Middleware checks authentication
3. If authenticated AND email in allowlist → Access granted
4. If authenticated but email NOT in allowlist → Redirected to `/beta-access`
5. If not authenticated → Redirected to `/beta-access`

---

## Disabling Beta Mode

To disable beta mode and allow public access:

```bash
# Option 1: Set to false
BETA_MODE=false

# Option 2: Remove the variable entirely
# (unset BETA_MODE)
```

After disabling, the app will be publicly accessible again.

---

## Testing

### Test Beta Mode

1. Enable beta mode: `BETA_MODE=true`
2. Visit homepage while logged out → Should redirect to `/beta-access`
3. Sign in → Should access the app normally
4. Sign out → Should redirect to `/beta-access` again

### Test Email Allowlist

1. Enable beta mode: `BETA_MODE=true`
2. Set allowlist: `BETA_ALLOWLIST_EMAILS=allowed@example.com`
3. Sign in with `allowed@example.com` → Should access the app
4. Sign in with `notallowed@example.com` → Should redirect to `/beta-access`

---

## Troubleshooting

### Issue: Can't access app even when logged in

**Solution:**
- Check that `BETA_MODE` is set correctly
- If using allowlist, verify your email is in `BETA_ALLOWLIST_EMAILS`
- Check browser console for errors
- Verify authentication is working (try `/sign-in`)

### Issue: Public routes are blocked

**Solution:**
- Check that public paths are correctly configured in middleware
- Verify route paths match exactly (case-sensitive)

### Issue: API routes are blocked

**Solution:**
- API routes should be accessible (they're in the public paths list)
- Check that `/api/*` is not being blocked by other middleware
- Verify API routes don't require authentication beyond beta mode

---

## Security Notes

1. **Email Allowlist**: The allowlist is checked server-side in middleware
2. **Case Insensitive**: Email comparisons are case-insensitive
3. **No Bypass**: Beta mode cannot be bypassed client-side
4. **API Routes**: API routes remain accessible (they have their own auth)

---

## Next Steps

- Customize the beta access page: `src/app/beta-access/page.tsx`
- Adjust public routes: `src/utils/supabase/middleware.ts`
- Add more sophisticated access control if needed

---

## Example Scenarios

### Scenario 1: Developer-Only Access

```bash
BETA_MODE=true
BETA_ALLOWLIST_EMAILS=dev1@company.com,dev2@company.com
```

Only these two developers can access the app.

### Scenario 2: All Authenticated Users

```bash
BETA_MODE=true
# BETA_ALLOWLIST_EMAILS not set or empty
```

Anyone who can sign up and authenticate can access.

### Scenario 3: Public Access

```bash
BETA_MODE=false
# or unset
```

App is publicly accessible (current behavior).

---

## Support

If you encounter issues:
1. Check environment variables are set correctly
2. Verify middleware is running (check logs)
3. Test authentication flow separately
4. Review middleware code: `src/utils/supabase/middleware.ts`

