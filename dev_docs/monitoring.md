# Monitoring Guide

## Supabase Logs

1. Open your Supabase project → **Logs** → **Settings**.  
2. Enable both *API* and *Database* log streams and set a retention period (7 days works well to start).  
3. (Optional) Configure a destination such as Logflare, BigQuery, or an HTTPS webhook if you need long-term retention.  
4. Within the app, high-signal events already write to:
   - `bot_audit_log` via `logAuditEvent` (bot/document/API key/billing changes, moderation flags).  
   - `bot_user_activity_logs` for user-visible activity (API key lifecycle, rate-limit events, etc.).

### Local verification

- Use the Supabase dashboard to filter logs by team ID or route during debugging.  
- For ad-hoc analysis, run `supabase db remote commit --schema public` and query the `supabase_logs.*` tables in a local clone.

## Sentry (Deferred)

Sentry support is on hold until the SDK ships Next.js 16 compatibility. Once available, reinstating it will require:

1. Re-adding `@sentry/nextjs` (or the recommended SDK) to `package.json`.  
2. Restoring the configuration files that wrap `Sentry.init` on the client/server/edge.  
3. Setting `NEXT_PUBLIC_ENABLE_SENTRY=true` and `NEXT_PUBLIC_SENTRY_DSN=…` in the target environment.

For now, no Sentry-related env vars are needed.

