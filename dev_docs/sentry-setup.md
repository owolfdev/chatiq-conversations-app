# Sentry Setup Guide

## Overview

Sentry has been integrated into the ChatIQ application for error tracking and monitoring. This document outlines the setup, configuration, and usage.

## Environment Variables

Add these to your `.env.local` (already added):

```bash
NEXT_PUBLIC_SENTRY_DSN=https://your-dsn@sentry.io/project-id
NEXT_PUBLIC_ENABLE_SENTRY=true
```

## Files Created

1. **`src/lib/logger.ts`** - Structured logger with sensitive data redaction
2. **`sentry.client.config.ts`** - Client-side Sentry configuration
3. **`sentry.server.config.ts`** - Server-side Sentry configuration
4. **`sentry.edge.config.ts`** - Edge runtime Sentry configuration
5. **`instrumentation.ts`** - Next.js 16 instrumentation hook
6. **`src/components/sentry-init.tsx`** - Client-side Sentry initialization

## Usage

### Basic Logging

```typescript
import { logger } from "@/lib/logger";

// Info log (development only)
logger.info("User logged in", { userId: "123" });

// Warning (sent to Sentry)
logger.warn("Rate limit approaching", { usage: 80, limit: 100 });

// Error (sent to Sentry)
logger.error("Failed to process payment", error, {
  orderId: "order_123",
  amount: 100,
});

// Exception with context
logger.captureException(error, {
  tags: { component: "checkout" },
  user: { id: "user_123" },
  level: "error",
});
```

### Sensitive Data Redaction

The logger automatically redacts:
- API keys (Bearer tokens, OpenAI keys, Stripe keys)
- Passwords and secrets
- JWT tokens
- Credit card numbers

**Note**: Email addresses are NOT redacted by default. To enable email redaction, uncomment the pattern in `src/lib/logger.ts`.

## Sentry Alert Thresholds

### Recommended Alerts (Set up in Sentry Dashboard)

1. **Error Rate Alert**
   - Trigger: >10 errors per minute
   - Action: Email/Slack notification
   - Severity: High

2. **New Issue Alert**
   - Trigger: Any new error type
   - Action: Slack notification
   - Severity: Medium

3. **Critical Error Alert**
   - Trigger: Errors tagged with `critical:true`
   - Action: PagerDuty/Email
   - Severity: Critical

4. **Performance Degradation**
   - Trigger: P95 latency >2 seconds
   - Action: Email notification
   - Severity: Medium

### Setting Up Alerts in Sentry

1. Go to your Sentry project dashboard
2. Navigate to **Alerts** → **Create Alert Rule**
3. Configure:
   - **Condition**: Error rate, new issue, etc.
   - **Action**: Email, Slack, PagerDuty
   - **Threshold**: Set appropriate values
4. Save the alert rule

## Migration Status

### ✅ Migrated to Structured Logger

- `src/lib/audit/log-event.ts` - Audit logging
- `src/app/api/chat/route.ts` - Chat API errors
- `src/lib/billing/log-event.ts` - Billing event logging
- `src/lib/middleware/moderation.ts` - Moderation flags

### 🔄 Remaining Console Logs

There are ~249 `console.log/error` calls remaining. These can be migrated incrementally:

1. **Priority 1**: API routes (`src/app/api/**`)
2. **Priority 2**: Server actions (`src/app/actions/**`)
3. **Priority 3**: Client components (optional)

## Testing

1. **Test Error Logging**:
   ```typescript
   // In any API route or server action
   logger.error("Test error", new Error("Test"), { test: true });
   ```

2. **Check Sentry Dashboard**:
   - Go to your Sentry project
   - Navigate to **Issues**
   - Verify the error appears with redacted sensitive data

3. **Test Redaction**:
   ```typescript
   logger.error("Test with API key", null, {
     apiKey: "sk_live_1234567890abcdef",
     message: "Bearer token_abc123",
   });
   // Should see "sk_live_1234...cdef" and "Bearer ***REDACTED***" in logs
   ```

## Troubleshooting

### Sentry Not Capturing Errors

1. Check `NEXT_PUBLIC_ENABLE_SENTRY=true` is set
2. Verify DSN is correct
3. Check browser console for Sentry initialization errors
4. Verify `instrumentation.ts` is in the root directory

### Errors in Production Only

- Check Sentry is enabled in production environment variables
- Verify DSN is set in Vercel environment variables
- Check Sentry project settings for correct environment

### Too Many Errors

- Adjust `tracesSampleRate` in Sentry config files (currently 1.0 = 100%)
- Set up filters in Sentry dashboard to ignore known issues
- Use `beforeSend` hook to filter specific errors

## Next Steps

1. ✅ Set up alert thresholds in Sentry dashboard
2. ✅ Test error capture in development
3. 🔄 Migrate remaining critical error paths
4. 🔄 Set up performance monitoring
5. 🔄 Configure release tracking

## Resources

- [Sentry Next.js Documentation](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [Sentry Alert Rules](https://docs.sentry.io/product/alerts/)
- [Sentry Performance Monitoring](https://docs.sentry.io/product/performance/)

