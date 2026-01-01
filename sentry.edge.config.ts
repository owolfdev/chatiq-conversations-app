// sentry.edge.config.ts
// Sentry configuration for Edge runtime

import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
const enableSentry = process.env.NEXT_PUBLIC_ENABLE_SENTRY === "true";

if (enableSentry && dsn) {
  Sentry.init({
    dsn,
    // Adjust this value in production, or use tracesSampler for greater control
    tracesSampleRate: 1.0,
    // Setting this option to true will print useful information to the console while you're setting up Sentry.
    debug: false,
    environment: process.env.NODE_ENV,
    // Filter out sensitive data
    beforeSend(event, hint) {
      // Redact sensitive information from edge runtime errors
      if (event.request) {
        if (event.request.headers) {
          const headers = event.request.headers as Record<string, string>;
          if (headers.authorization) {
            headers.authorization = "Bearer ***REDACTED***";
          }
        }
      }
      return event;
    },
  });
}

