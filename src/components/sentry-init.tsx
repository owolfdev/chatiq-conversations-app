// src/components/sentry-init.tsx
// Client-side Sentry initialization component

"use client";

import { useEffect } from "react";

export function SentryInit() {
  useEffect(() => {
    // Sentry client config is automatically loaded via sentry.client.config.ts
    // This component just ensures it's initialized on the client
    if (process.env.NEXT_PUBLIC_ENABLE_SENTRY === "true") {
      import("@sentry/nextjs").catch(() => {
        // Sentry not available, ignore
      });
    }
  }, []);

  return null;
}

