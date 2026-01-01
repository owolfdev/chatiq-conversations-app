// src/lib/stripe.ts
// Centralised Stripe client + helpers

import Stripe from "stripe";
import { env, getStripeKeys, isStripeLiveModeConfigured } from "@/lib/env";

const clients: { test?: Stripe; live?: Stripe } = {};

export function getStripeClient(useLive: boolean = false) {
  const mode: "test" | "live" =
    useLive && isStripeLiveModeConfigured() ? "live" : "test";

  if (!clients[mode]) {
    const { secretKey } = getStripeKeys(mode === "live");
    if (!secretKey) {
      throw new Error(
        `Stripe secret key for ${mode} mode is not configured. Check environment variables.`
      );
    }

    clients[mode] = new Stripe(secretKey, {
      apiVersion: "2025-10-29.clover",
    });
  }

  return clients[mode]!;
}

export type BillingPlan = "pro" | "team";
export type BillingCurrency = "usd" | "thb";

export function getStripePriceId(
  plan: BillingPlan,
  currency: BillingCurrency,
  useLive: boolean = false
) {
  const isLive = useLive && isStripeLiveModeConfigured();

  const lookup: Record<
    BillingCurrency,
    Record<BillingPlan, string | undefined>
  > = {
    usd: {
      pro: isLive ? env.STRIPE_PRICE_PRO_USD_LIVE : env.STRIPE_PRICE_PRO_USD,
      team: isLive ? env.STRIPE_PRICE_TEAM_USD_LIVE : env.STRIPE_PRICE_TEAM_USD,
    },
    thb: {
      pro: isLive ? env.STRIPE_PRICE_PRO_THB_LIVE : env.STRIPE_PRICE_PRO_THB,
      team: isLive ? env.STRIPE_PRICE_TEAM_THB_LIVE : env.STRIPE_PRICE_TEAM_THB,
    },
  };

  const priceId = lookup[currency][plan];

  if (!priceId) {
    throw new Error(
      `Stripe price ID not configured for plan "${plan}" in currency "${currency}" (mode: ${
        isLive ? "live" : "test"
      }).`
    );
  }

  return priceId;
}

export function isLiveMode(): boolean {
  // During build time, always use test mode to avoid missing price errors
  // Live mode should only be used at runtime when processing actual payments
  // NEXT_PHASE is set by Next.js during build (automatically, don't set manually)
  if (process.env.NEXT_PHASE === "phase-production-build") {
    return false;
  }
  // Only use live mode in production runtime (not during build)
  return process.env.NODE_ENV === "production" && isStripeLiveModeConfigured();
}

export function getPlanFromPriceId(priceId: string): BillingPlan | null {
  const mappings: Array<[string | undefined, BillingPlan]> = [
    [env.STRIPE_PRICE_PRO_USD, "pro"],
    [env.STRIPE_PRICE_PRO_THB, "pro"],
    [env.STRIPE_PRICE_TEAM_USD, "team"],
    [env.STRIPE_PRICE_TEAM_THB, "team"],
    [env.STRIPE_PRICE_PRO_USD_LIVE, "pro"],
    [env.STRIPE_PRICE_PRO_THB_LIVE, "pro"],
    [env.STRIPE_PRICE_TEAM_USD_LIVE, "team"],
    [env.STRIPE_PRICE_TEAM_THB_LIVE, "team"],
  ];

  for (const [id, plan] of mappings) {
    if (id && id === priceId) {
      return plan;
    }
  }

  return null;
}
