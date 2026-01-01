// src/lib/pricing.ts
// Helpers for retrieving and formatting Stripe plan pricing details.

import type Stripe from "stripe";

import {
  BillingCurrency,
  BillingPlan,
  getStripeClient,
  getStripePriceId,
  isLiveMode,
} from "@/lib/stripe";
import { formatCurrency } from "@/lib/formatters";

export interface PlanPrice {
  priceId: string | null;
  unitAmount: number | null;
  currency: string | null;
  interval: Stripe.Price.Recurring.Interval | null;
}

type CacheEntry = {
  value: PlanPrice;
  expiresAt: number;
};

type PricingCache = Map<string, CacheEntry>;

const PRICING_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function getPricingCache(): PricingCache {
  const globalScope = globalThis as unknown as {
    __stripePricingCache?: PricingCache;
  };

  if (!globalScope.__stripePricingCache) {
    globalScope.__stripePricingCache = new Map();
  }

  return globalScope.__stripePricingCache;
}

function buildCacheKey(
  plan: BillingPlan,
  currency: BillingCurrency,
  useLive: boolean
): string {
  return `${useLive ? "live" : "test"}:${currency}:${plan}`;
}

export async function fetchPlanPrice({
  plan,
  currency = "usd",
  useLive = isLiveMode(),
}: {
  plan: BillingPlan;
  currency?: BillingCurrency;
  useLive?: boolean;
}): Promise<PlanPrice> {
  const cache = getPricingCache();
  const cacheKey = buildCacheKey(plan, currency, useLive);
  const now = Date.now();

  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return cached.value;
  }

  let priceId: string | null = null;

  try {
    priceId = getStripePriceId(plan, currency, useLive);
  } catch (error) {
    console.error("Stripe price ID not configured", {
      plan,
      currency,
      useLive,
      error,
    });

    const fallback: PlanPrice = {
      priceId,
      unitAmount: null,
      currency: null,
      interval: null,
    };

    cache.set(cacheKey, { value: fallback, expiresAt: now + PRICING_CACHE_TTL_MS });
    return fallback;
  }

  try {
    const stripe = getStripeClient(useLive);
    const price = await stripe.prices.retrieve(priceId);

    const value: PlanPrice = {
      priceId,
      unitAmount: price.unit_amount ?? null,
      currency: price.currency ?? null,
      interval: price.recurring?.interval ?? null,
    };

    cache.set(cacheKey, { value, expiresAt: now + PRICING_CACHE_TTL_MS });
    return value;
  } catch (error) {
    // During build time, silently use fallback values to avoid build errors
    // At runtime, log errors for debugging
    const isBuildTime = process.env.NEXT_PHASE === "phase-production-build";
    
    if (!isBuildTime) {
      console.error("Failed to retrieve Stripe price", {
        plan,
        currency,
        useLive,
        error,
      });
    }

    const fallback: PlanPrice = {
      priceId,
      unitAmount: null,
      currency: null,
      interval: null,
    };

    cache.set(cacheKey, { value: fallback, expiresAt: now + PRICING_CACHE_TTL_MS });
    return fallback;
  }
}

export function formatRecurringInterval(
  interval: Stripe.Price.Recurring.Interval | null
): string | null {
  if (!interval) {
    return null;
  }

  switch (interval) {
    case "day":
      return "/day";
    case "week":
      return "/week";
    case "month":
      return "/month";
    case "year":
      return "/year";
    default:
      return `/${interval}`;
  }
}

export function formatPriceDisplay(
  price: PlanPrice | null | undefined,
  { fallback }: { fallback?: string } = {}
): string | null {
  if (!price) {
    return fallback ?? null;
  }

  const amount = formatCurrency(price.unitAmount, price.currency);

  if (!amount) {
    return fallback ?? null;
  }

  const intervalSuffix = formatRecurringInterval(price.interval);

  return intervalSuffix ? `${amount} ${intervalSuffix}` : amount;
}
