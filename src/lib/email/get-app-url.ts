// src/lib/email/get-app-url.ts
// Shared utility to get the correct app URL for emails
// Detects production vs development and returns appropriate URL

import { env } from "@/lib/env";

/**
 * Get the correct app URL for emails
 * - Uses NEXT_PUBLIC_APP_URL if set and not localhost
 * - Otherwise defaults to the production URL (we do not want localhost links in emails)
 */
export function getAppUrl(): string {
  // Use environment variable if set and not localhost
  if (
    env.NEXT_PUBLIC_APP_URL &&
    !env.NEXT_PUBLIC_APP_URL.includes("localhost")
  ) {
    return env.NEXT_PUBLIC_APP_URL;
  }

  // Always prefer production URL when no suitable env is provided
  return "https://www.chatiq.io";
}
