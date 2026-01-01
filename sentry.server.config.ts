// sentry.server.config.ts
// Sentry configuration for server-side (Node.js)

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
      // Redact sensitive information from server-side errors
      if (event.request) {
        // Redact authorization headers
        if (event.request.headers) {
          const headers = event.request.headers as Record<string, string>;
          if (headers.authorization) {
            headers.authorization = "Bearer ***REDACTED***";
          }
          if (headers["x-api-key"]) {
            headers["x-api-key"] = "***REDACTED***";
          }
        }
        // Redact query parameters that might contain sensitive data
        if (event.request.query_string) {
          const queryString = event.request.query_string as string;
          if (queryString.includes("token=") || queryString.includes("key=")) {
            event.request.query_string = queryString.replace(
              /(token|key|api[_-]?key)=[^&]*/gi,
              "$1=***REDACTED***"
            );
          }
        }
      }
      // Redact sensitive data from extra context
      if (event.extra) {
        const extra = event.extra as Record<string, unknown>;
        Object.keys(extra).forEach((key) => {
          const lowerKey = key.toLowerCase();
          if (
            lowerKey.includes("password") ||
            lowerKey.includes("secret") ||
            lowerKey.includes("token") ||
            lowerKey.includes("api_key") ||
            lowerKey.includes("key")
          ) {
            extra[key] = "***REDACTED***";
          }
        });
      }
      return event;
    },
  });
}

