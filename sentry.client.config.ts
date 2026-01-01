// sentry.client.config.ts
// Sentry configuration for client-side (browser)

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
    replaysOnErrorSampleRate: 1.0,
    // This sets the sample rate to be 10%. You may want this to be 100% while
    // in development and sample at a lower rate in production
    replaysSessionSampleRate: 0.1,
    // You can remove this option if you're not planning to use the Sentry Session Replay feature:
    integrations: [
      Sentry.replayIntegration({
        // Additional Replay configuration goes in here, for example:
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    environment: process.env.NODE_ENV,
    // Filter out sensitive data
    beforeSend(event, hint) {
      // Redact sensitive information
      if (event.request) {
        // Redact authorization headers
        if (event.request.headers) {
          const headers = event.request.headers as Record<string, string>;
          if (headers.authorization) {
            headers.authorization = "Bearer ***REDACTED***";
          }
        }
        // Redact cookies
        if (event.request.cookies) {
          const cookies = event.request.cookies as Record<string, string>;
          Object.keys(cookies).forEach((key) => {
            if (key.toLowerCase().includes("token") || key.toLowerCase().includes("session")) {
              cookies[key] = "***REDACTED***";
            }
          });
        }
      }
      return event;
    },
  });
}

