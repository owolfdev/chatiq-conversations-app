// src/lib/config.ts
// Application configuration constants

/**
 * Default bot slug used on the homepage for public demo
 * Can be overridden via NEXT_PUBLIC_DEFAULT_BOT_SLUG environment variable
 */
export const DEFAULT_BOT_SLUG =
  process.env.NEXT_PUBLIC_DEFAULT_BOT_SLUG || "default-bot";

