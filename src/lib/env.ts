// src/lib/env.ts
// Strict environment variable validation
// Validates all required environment variables at startup and provides type-safe access

const SUPABASE_CLIENT_KEY_VALUE =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_ADMIN_KEY_VALUE =
  process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Validates that all required environment variables are present.
 * Throws descriptive errors if any are missing.
 */
function validateEnv() {
  const errors: string[] = [];

  const supabaseClientKey = SUPABASE_CLIENT_KEY_VALUE;

  // Required for all environments
  const required = {
    // Supabase
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_CLIENT_KEY: supabaseClientKey,
    SUPABASE_ADMIN_KEY: SUPABASE_ADMIN_KEY_VALUE,
    RESEND_API_KEY: process.env.RESEND_API_KEY,

    // OpenAI
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,

    // Stripe (at least test keys required)
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    STRIPE_PRICE_PRO_USD: process.env.STRIPE_PRICE_PRO_USD,
    STRIPE_PRICE_TEAM_USD: process.env.STRIPE_PRICE_TEAM_USD,
    STRIPE_PRICE_PRO_THB: process.env.STRIPE_PRICE_PRO_THB,
    STRIPE_PRICE_TEAM_THB: process.env.STRIPE_PRICE_TEAM_THB,
  };

  // Check each required variable
  for (const [key, value] of Object.entries(required)) {
    if (!value || value.trim() === "") {
      errors.push(`Missing required environment variable: ${key}`);
    }
  }

  // Validate Supabase URL format
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    try {
      const url = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL);
      if (!url.hostname.includes("supabase.co")) {
        errors.push("NEXT_PUBLIC_SUPABASE_URL must be a valid Supabase URL");
      }
    } catch {
      errors.push("NEXT_PUBLIC_SUPABASE_URL is not a valid URL");
    }
  }

  // Validate Supabase publishable key format when provided
  if (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY &&
    !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.startsWith("sb_")
  ) {
    errors.push(
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY should start with 'sb_' (publishable key)"
    );
  }

  if (
    process.env.SUPABASE_SECRET_KEY &&
    !process.env.SUPABASE_SECRET_KEY.startsWith("sb_secret_")
  ) {
    errors.push("SUPABASE_SECRET_KEY should start with 'sb_secret_'");
  }

  // Validate OpenAI API key format
  if (
    process.env.OPENAI_API_KEY &&
    !process.env.OPENAI_API_KEY.startsWith("sk-")
  ) {
    errors.push("OPENAI_API_KEY should start with 'sk-'");
  }

  // Validate Stripe keys format
  if (
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY &&
    !process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.startsWith("pk_")
  ) {
    errors.push("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY should start with 'pk_'");
  }

  if (
    process.env.STRIPE_SECRET_KEY &&
    !process.env.STRIPE_SECRET_KEY.startsWith("sk_")
  ) {
    errors.push("STRIPE_SECRET_KEY should start with 'sk_'");
  }

  if (
    process.env.STRIPE_WEBHOOK_SECRET &&
    !process.env.STRIPE_WEBHOOK_SECRET.startsWith("whsec_")
  ) {
    errors.push("STRIPE_WEBHOOK_SECRET should start with 'whsec_'");
  }

  if (
    process.env.RESEND_API_KEY &&
    !process.env.RESEND_API_KEY.startsWith("re_")
  ) {
    errors.push("RESEND_API_KEY should start with 're_'");
  }

  const priceVars = [
    "STRIPE_PRICE_PRO_USD",
    "STRIPE_PRICE_TEAM_USD",
    "STRIPE_PRICE_PRO_THB",
    "STRIPE_PRICE_TEAM_THB",
  ] as const;

  priceVars.forEach((key) => {
    const value = process.env[key];
    if (value && !value.startsWith("price_")) {
      errors.push(`${key} should start with 'price_'`);
    }
  });

  if (errors.length > 0) {
    throw new Error(
      `Environment validation failed:\n${errors
        .map((e) => `  - ${e}`)
        .join("\n")}\n\n` +
        `Please check your .env.local file and ensure all required variables are set.`
    );
  }
}

// Validate on module load (server-side only)
if (typeof window === "undefined") {
  try {
    validateEnv();
  } catch (error) {
    // In development, log the error but don't crash
    if (process.env.NODE_ENV === "development") {
      console.error("⚠️  Environment validation warning:", error);
    } else {
      // In production, throw to prevent deployment with bad config
      throw error;
    }
  }
}

/**
 * Type-safe environment variables object
 * All variables are validated to exist (non-null) via validateEnv()
 */
export const env = {
  // Supabase
  SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  SUPABASE_CLIENT_KEY: SUPABASE_CLIENT_KEY_VALUE!,
  SUPABASE_ADMIN_KEY: SUPABASE_ADMIN_KEY_VALUE!,
  SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
  RESEND_API_KEY: process.env.RESEND_API_KEY!,

  // OpenAI
  OPENAI_API_KEY: process.env.OPENAI_API_KEY!,

  // Stripe (Test Mode)
  STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!,
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY!,
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET!,
  STRIPE_PRICE_PRO_USD: process.env.STRIPE_PRICE_PRO_USD!,
  STRIPE_PRICE_TEAM_USD: process.env.STRIPE_PRICE_TEAM_USD!,
  STRIPE_PRICE_PRO_THB: process.env.STRIPE_PRICE_PRO_THB!,
  STRIPE_PRICE_TEAM_THB: process.env.STRIPE_PRICE_TEAM_THB!,

  // Stripe (Live Mode) - Optional
  STRIPE_PUBLISHABLE_KEY_LIVE:
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_LIVE,
  STRIPE_SECRET_KEY_LIVE: process.env.STRIPE_SECRET_KEY_LIVE,
  STRIPE_WEBHOOK_SECRET_LIVE: process.env.STRIPE_WEBHOOK_SECRET_LIVE,
  STRIPE_PRICE_PRO_USD_LIVE: process.env.STRIPE_PRICE_PRO_USD_LIVE,
  STRIPE_PRICE_TEAM_USD_LIVE: process.env.STRIPE_PRICE_TEAM_USD_LIVE,
  STRIPE_PRICE_PRO_THB_LIVE: process.env.STRIPE_PRICE_PRO_THB_LIVE,
  STRIPE_PRICE_TEAM_THB_LIVE: process.env.STRIPE_PRICE_TEAM_THB_LIVE,

  // App Configuration
  NODE_ENV: process.env.NODE_ENV || "development",
  NEXT_PUBLIC_APP_URL:
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  EMBEDDING_WORKER_SECRET: process.env.EMBEDDING_WORKER_SECRET,
  LINE_INTEGRATION_WORKER_SECRET:
    process.env.LINE_INTEGRATION_WORKER_SECRET,
  TAKEOVER_WORKER_SECRET: process.env.TAKEOVER_WORKER_SECRET,
  ENABLE_VERCEL_ANALYTICS: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === "true",
  INVITE_EMAIL_FROM:
    process.env.INVITE_EMAIL_FROM || "ChatBot SaaS <noreply@chatbot.local>",
  
  // Beta Access Control
  BETA_MODE: process.env.BETA_MODE || "false",
  BETA_ALLOWLIST_EMAILS: process.env.BETA_ALLOWLIST_EMAILS || "",
  BETA_ACCESS_MESSAGE: process.env.BETA_ACCESS_MESSAGE,
  
  // Client-accessible beta mode (for UI indicators only)
  NEXT_PUBLIC_BETA_MODE: process.env.NEXT_PUBLIC_BETA_MODE || "false",
} as const;

/**
 * Check if Stripe live mode keys are configured
 */
export function isStripeLiveModeConfigured(): boolean {
  return !!(
    env.STRIPE_PUBLISHABLE_KEY_LIVE &&
    env.STRIPE_SECRET_KEY_LIVE &&
    env.STRIPE_WEBHOOK_SECRET_LIVE
  );
}

/**
 * Get Stripe keys based on environment
 * @param useLive - Whether to use live keys (default: false)
 * @returns Stripe keys object
 */
export function getStripeKeys(useLive: boolean = false) {
  if (useLive && isStripeLiveModeConfigured()) {
    return {
      publishableKey: env.STRIPE_PUBLISHABLE_KEY_LIVE!,
      secretKey: env.STRIPE_SECRET_KEY_LIVE!,
      webhookSecret: env.STRIPE_WEBHOOK_SECRET_LIVE!,
    };
  }

  return {
    publishableKey: env.STRIPE_PUBLISHABLE_KEY,
    secretKey: env.STRIPE_SECRET_KEY,
    webhookSecret: env.STRIPE_WEBHOOK_SECRET,
  };
}
