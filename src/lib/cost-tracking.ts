// lib/cost-tracking.ts
// Cost tracking utilities for platform admin monitoring

import { createAdminClient } from "@/utils/supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";

// Fallback pricing per 1M tokens (used if database pricing is unavailable)
// These should match the default values in the database migration
const FALLBACK_PRICING = {
  "gpt-3.5-turbo": {
    input: 0.5 / 1_000_000, // $0.50 per 1M tokens
    output: 1.5 / 1_000_000, // $1.50 per 1M tokens
  },
  "gpt-4o-mini": {
    input: 0.15 / 1_000_000, // $0.15 per 1M tokens
    output: 0.6 / 1_000_000, // $0.60 per 1M tokens
  },
  "gpt-4o": {
    input: 2.5 / 1_000_000, // $2.50 per 1M tokens
    output: 10.0 / 1_000_000, // $10.00 per 1M tokens
  },
  "text-embedding-3-small": {
    input: 0.02 / 1_000_000, // $0.02 per 1M tokens
    output: 0, // Embeddings don't have output tokens
  },
  "text-embedding-3-large": {
    input: 0.13 / 1_000_000, // $0.13 per 1M tokens
    output: 0,
  },
  "text-moderation-latest": {
    input: 0.1 / 1_000_000, // $0.10 per 1M tokens
    output: 0,
  },
} as const;

// Cache for pricing data (refreshed periodically)
let pricingCache: Map<string, { input: number; output: number }> | null = null;
let pricingCacheExpiry: number = 0;
const PRICING_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Clear pricing cache (useful after admin updates pricing)
 * This forces the next cost calculation to fetch fresh pricing from database
 */
export function clearPricingCache(): void {
  pricingCache = null;
  pricingCacheExpiry = 0;
}

/**
 * Fetch current pricing from database (with caching)
 * Falls back to hardcoded defaults if database is unavailable
 */
async function getPricingFromDatabase(
  supabase?: SupabaseClient
): Promise<Map<string, { input: number; output: number }>> {
  const now = Date.now();

  // Return cached pricing if still valid
  if (pricingCache && now < pricingCacheExpiry) {
    return pricingCache;
  }

  try {
    const client = supabase || createAdminClient();

    // Get current active pricing (effective_until IS NULL)
    const { data, error } = await client
      .from("admin_pricing")
      .select("model, input_price_per_1m_tokens, output_price_per_1m_tokens")
      .is("effective_until", null);

    if (error || !data || data.length === 0) {
      console.warn(
        "Failed to fetch pricing from database, using fallback:",
        error
      );
      // Return fallback pricing
      return new Map(
        Object.entries(FALLBACK_PRICING).map(([model, prices]) => [
          model,
          { input: prices.input, output: prices.output },
        ])
      );
    }

    // Build pricing map from database
    const pricingMap = new Map<string, { input: number; output: number }>();
    for (const row of data) {
      pricingMap.set(row.model, {
        input: Number(row.input_price_per_1m_tokens) / 1_000_000,
        output: Number(row.output_price_per_1m_tokens) / 1_000_000,
      });
    }

    // Cache the result
    pricingCache = pricingMap;
    pricingCacheExpiry = now + PRICING_CACHE_TTL;

    return pricingMap;
  } catch (error) {
    console.error(
      "Error fetching pricing from database, using fallback:",
      error
    );
    // Return fallback pricing
    return new Map(
      Object.entries(FALLBACK_PRICING).map(([model, prices]) => [
        model,
        { input: prices.input, output: prices.output },
      ])
    );
  }
}

export type CostType = "chat" | "embedding" | "moderation";
export type ModelName =
  | "gpt-3.5-turbo"
  | "gpt-4o-mini"
  | "gpt-4o"
  | "text-embedding-3-small"
  | "text-embedding-3-large"
  | "text-moderation-latest";

export interface CostTrackingData {
  team_id?: string | null;
  bot_id?: string | null;
  user_id?: string | null;
  cost_type: CostType;
  model: ModelName | string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  cost_usd: number;
  cache_hit: boolean;
  ip_address?: string | null;
  metadata?: Record<string, unknown>;
}

/**
 * Calculate cost in USD based on model and token counts
 * Uses database pricing if available, falls back to hardcoded defaults
 */
export async function calculateCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
  supabase?: SupabaseClient
): Promise<number> {
  try {
    const pricingMap = await getPricingFromDatabase(supabase);
    const pricing = pricingMap.get(model);

    if (pricing) {
      return inputTokens * pricing.input + outputTokens * pricing.output;
    }

    // Model not found in database, try fallback
    const fallbackKey = model as keyof typeof FALLBACK_PRICING;
    const fallbackPricing = FALLBACK_PRICING[fallbackKey];

    if (fallbackPricing) {
      console.warn(
        `Model ${model} not found in database pricing, using fallback pricing`
      );
      return (
        inputTokens * fallbackPricing.input +
        outputTokens * fallbackPricing.output
      );
    }

    // Unknown model - use gpt-3.5-turbo pricing as last resort
    console.warn(
      `Unknown model pricing for ${model}, using gpt-3.5-turbo pricing as fallback`
    );
    const lastResort = FALLBACK_PRICING["gpt-3.5-turbo"];
    return inputTokens * lastResort.input + outputTokens * lastResort.output;
  } catch (error) {
    console.error("Error calculating cost, using fallback:", error);
    // Fallback to hardcoded pricing on error
    const fallbackKey = model as keyof typeof FALLBACK_PRICING;
    const fallbackPricing =
      FALLBACK_PRICING[fallbackKey] || FALLBACK_PRICING["gpt-3.5-turbo"];
    return (
      inputTokens * fallbackPricing.input +
      outputTokens * fallbackPricing.output
    );
  }
}

/**
 * Log cost tracking entry (async, fire-and-forget to avoid blocking requests)
 * Uses admin client to bypass RLS for inserts
 */
export async function logCostTracking(
  data: CostTrackingData,
  supabase?: SupabaseClient
): Promise<void> {
  try {
    const client = supabase || createAdminClient();

    const { error } = await client.from("admin_cost_tracking").insert({
      team_id: data.team_id || null,
      bot_id: data.bot_id || null,
      user_id: data.user_id || null,
      cost_type: data.cost_type,
      model: data.model,
      input_tokens: data.input_tokens,
      output_tokens: data.output_tokens,
      total_tokens: data.total_tokens,
      cost_usd: data.cost_usd,
      cache_hit: data.cache_hit,
      ip_address: data.ip_address || null,
      metadata: data.metadata || null,
      timestamp: new Date().toISOString(),
    });

    if (error) {
      console.error("Failed to log cost tracking:", error);
      // Don't throw - cost tracking shouldn't break the request flow
    }
  } catch (error) {
    console.error("Error in logCostTracking:", error);
    // Don't throw - cost tracking is non-critical
  }
}

/**
 * Log cost tracking asynchronously (fire-and-forget)
 * This ensures cost tracking never blocks the main request flow
 */
export function logCostTrackingAsync(
  data: CostTrackingData,
  supabase?: SupabaseClient
): void {
  // Fire and forget - don't await
  logCostTracking(data, supabase).catch((error) => {
    console.error("Async cost tracking failed:", error);
  });
}
