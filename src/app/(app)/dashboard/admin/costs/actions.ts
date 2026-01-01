// src/app/dashboard/admin/costs/actions.ts
"use server";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

export async function getCostData({
  timeRange,
}: {
  timeRange: "24h" | "7d" | "30d";
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  // Verify admin access
  const { data: profile } = await supabase
    .from("bot_user_profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.role !== "admin") {
    throw new Error("Admin access required");
  }

  // Use admin client to query cost tracking
  const admin = createAdminClient();

  // Calculate time range
  const now = new Date();
  const hoursAgo = timeRange === "24h" ? 24 : timeRange === "7d" ? 168 : 720;
  const startTime = new Date(now.getTime() - hoursAgo * 60 * 60 * 1000);

  // Get overview stats
  const { data: overviewData, error: overviewError } = await admin
    .from("admin_cost_tracking")
    .select("cost_usd, cache_hit, total_tokens, cost_type")
    .gte("timestamp", startTime.toISOString());

  // Handle case where table doesn't exist yet (migration not applied)
  if (overviewError) {
    if (
      overviewError.message.includes("does not exist") ||
      overviewError.code === "42P01"
    ) {
      // Return empty data structure if table doesn't exist
      return {
        overview: {
          totalCost: 0,
          totalTokens: 0,
          cacheHitRate: 0,
          projectedMonthly: 0,
          cacheHits: 0,
          cacheMisses: 0,
        },
        trends: [],
        breakdown: {
          teams: [],
          bots: [],
        },
        cache: {
          hitRate: 0,
          hits: 0,
          misses: 0,
          costSavings: 0,
        },
        models: [],
        error: "Cost tracking table not found. Please run: supabase db push",
      };
    }
    throw new Error(`Failed to fetch overview: ${overviewError.message}`);
  }

  const totalCost =
    overviewData?.reduce((sum, row) => sum + Number(row.cost_usd || 0), 0) || 0;
  const totalTokens =
    overviewData?.reduce(
      (sum, row) => sum + Number(row.total_tokens || 0),
      0
    ) || 0;
  const cacheHits = overviewData?.filter((row) => row.cache_hit).length || 0;
  const cacheMisses = overviewData?.filter((row) => !row.cache_hit).length || 0;
  const cacheHitRate =
    cacheHits + cacheMisses > 0
      ? (cacheHits / (cacheHits + cacheMisses)) * 100
      : 0;

  // Project monthly burn (extrapolate from current period)
  const daysInPeriod = hoursAgo / 24;
  const projectedMonthly = (totalCost / daysInPeriod) * 30;

  // Get hourly trends
  // Try to use RPC function if it exists, otherwise query directly
  let trendsData: any[] = [];
  let trendsError: any = null;

  try {
    const trendsResult = await admin.rpc("get_cost_trends", {
      p_start_time: startTime.toISOString(),
      p_interval: timeRange === "24h" ? "hour" : "day",
    });
    trendsData = trendsResult.data || [];
    trendsError = trendsResult.error;
  } catch (error) {
    // RPC function doesn't exist, query directly
    const fallbackResult = await admin
      .from("admin_cost_tracking")
      .select("timestamp, cost_usd")
      .gte("timestamp", startTime.toISOString())
      .order("timestamp", { ascending: true });
    trendsData = fallbackResult.data || [];
    trendsError = fallbackResult.error;
  }

  // Get breakdown by team
  const { data: teamBreakdown } = await admin
    .from("admin_cost_tracking")
    .select("team_id, cost_usd, total_tokens")
    .gte("timestamp", startTime.toISOString())
    .not("team_id", "is", null);

  // Get breakdown by bot
  const { data: botBreakdown } = await admin
    .from("admin_cost_tracking")
    .select("bot_id, cost_usd, total_tokens")
    .gte("timestamp", startTime.toISOString())
    .not("bot_id", "is", null);

  // Get cache metrics
  const { data: cacheData } = await admin
    .from("admin_cost_tracking")
    .select("cache_hit, cost_usd, cost_type")
    .gte("timestamp", startTime.toISOString());

  // Get model usage
  const { data: modelData } = await admin
    .from("admin_cost_tracking")
    .select("model, cost_usd, total_tokens, cost_type")
    .gte("timestamp", startTime.toISOString());

  return {
    overview: {
      totalCost,
      totalTokens,
      cacheHitRate,
      projectedMonthly,
      cacheHits,
      cacheMisses,
    },
    trends: trendsData || [],
    breakdown: {
      teams: teamBreakdown || [],
      bots: botBreakdown || [],
    },
    cache: {
      hitRate: cacheHitRate,
      hits: cacheHits,
      misses: cacheMisses,
      costSavings: (cacheHits / (cacheHits + cacheMisses || 1)) * totalCost,
    },
    models: modelData || [],
  };
}
