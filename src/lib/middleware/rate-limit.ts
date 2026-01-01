import { createClient } from "@/utils/supabase/server";
import { resolvePlanRateLimit } from "@/config/plans";
import type { PlanId } from "@/lib/plans/quotas";
import { RateLimitExceededError } from "@/lib/errors/rate-limit";
import { createAdminClient } from "@/utils/supabase/admin";
import { AUDIT_ACTION, AUDIT_RESOURCE } from "@/lib/audit/constants";
import { logAuditEvent } from "@/lib/audit/log-event";

const RATE_LIMIT_WARNING_RATIO = 0.9;

export interface RateLimitContext {
  actorType?: "user" | "api_key" | "system";
  actorId?: string;
  botId?: string;
  route?: string;
  source?: string;
  requestId?: string;
  ip?: string;
}

export interface EnforceRateLimitOptions {
  teamId: string;
  plan: PlanId;
  increment?: number;
  context?: RateLimitContext;
  overrideLimit?: number | null;
}

export interface RateLimitResult {
  usage: number;
  remaining: number | null;
  limit: number | null;
  blocked: boolean;
}

export async function enforceRateLimit({
  teamId,
  plan,
  increment = 1,
  context,
  overrideLimit,
}: EnforceRateLimitOptions): Promise<RateLimitResult> {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const limit = overrideLimit ?? resolvePlanRateLimit(plan);

  if (limit === null) {
    return {
      usage: 0,
      remaining: null,
      limit: null,
      blocked: false,
    };
  }

  if (increment <= 0) {
    return {
      usage: 0,
      remaining: limit,
      limit,
      blocked: false,
    };
  }

  const { data, error } = await supabase
    .from("bot_rate_limits")
    .select("id, usage_count")
    .eq("team_id", teamId)
    .eq("date", today)
    .maybeSingle();

  if (error && error.code !== "PGRST116") {
    throw new Error("Rate limit check failed.");
  }

  const currentUsage = data?.usage_count ?? 0;

  if (currentUsage >= limit) {
    await logRateLimitEvent({
      teamId,
      plan,
      limit,
      usage: currentUsage,
      status: "blocked",
      context,
      today,
    });

    throw new RateLimitExceededError(
      "Daily chat limit reached. Please upgrade your plan.",
      {
        teamId,
        plan,
        limit,
        usage: currentUsage,
        increment,
      }
    );
  }

  const nextUsage = currentUsage + increment;

  if (nextUsage > limit) {
    await logRateLimitEvent({
      teamId,
      plan,
      limit,
      usage: currentUsage,
      status: "blocked",
      context,
      today,
    });

    throw new RateLimitExceededError(
      "Daily chat limit reached. Please upgrade your plan.",
      {
        teamId,
        plan,
        limit,
        usage: currentUsage,
        increment,
      }
    );
  }

  const remaining = Math.max(limit - nextUsage, 0);

  const updateOrInsert = data
    ? supabase
        .from("bot_rate_limits")
        .update({ usage_count: nextUsage })
        .eq("id", data.id)
    : supabase
        .from("bot_rate_limits")
        .insert({
          team_id: teamId,
          usage_count: nextUsage,
          date: today,
        });

  const { error: persistenceError } = await updateOrInsert;

  if (persistenceError) {
    throw new Error("Rate limit persistence failed.");
  }

  const warningThresholdRaw = limit * RATE_LIMIT_WARNING_RATIO;
  const warningThreshold = warningThresholdRaw > 0 ? Math.ceil(warningThresholdRaw) : 0;
  const crossedWarningThreshold =
    warningThreshold > 0 && currentUsage < warningThreshold && nextUsage >= warningThreshold;

  if (crossedWarningThreshold) {
    await logRateLimitEvent({
      teamId,
      plan,
      limit,
      usage: nextUsage,
      status: "warning",
      context,
      today,
    });
  }

  return {
    usage: nextUsage,
    remaining,
    limit,
    blocked: false,
  };
}

/**
 * Enforce IP-based rate limiting for public/unauthenticated requests
 * Each IP address gets its own rate limit pool (free plan limits)
 */
export async function enforceIpBasedRateLimit({
  ipAddress,
  plan = "free",
  increment = 1,
  context,
  overrideLimit,
}: {
  ipAddress: string;
  plan?: PlanId;
  increment?: number;
  context?: RateLimitContext;
  overrideLimit?: number | null;
}): Promise<RateLimitResult> {
  if (!ipAddress || ipAddress === "unknown") {
    // If no IP, skip rate limiting (shouldn't happen, but be safe)
    return {
      usage: 0,
      remaining: null,
      limit: null,
      blocked: false,
    };
  }

  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const limit = overrideLimit ?? resolvePlanRateLimit(plan);

  if (limit === null) {
    return {
      usage: 0,
      remaining: null,
      limit: null,
      blocked: false,
    };
  }

  if (increment <= 0) {
    return {
      usage: 0,
      remaining: limit,
      limit,
      blocked: false,
    };
  }

  // Look up rate limit by IP address and date
  const { data, error } = await supabase
    .from("bot_rate_limits")
    .select("id, usage_count")
    .eq("ip_address", ipAddress)
    .eq("date", today)
    .maybeSingle();

  if (error && error.code !== "PGRST116") {
    throw new Error("IP-based rate limit check failed.");
  }

  const currentUsage = data?.usage_count ?? 0;

  if (currentUsage >= limit) {
    // Log the rate limit event (use a placeholder team_id for audit logging)
    const admin = createAdminClient();
    await admin.from("bot_user_activity_logs").insert({
      team_id: null, // IP-based limits don't have a team
      type: "rate_limit.blocked",
      message: `IP-based rate limit reached for IP ${ipAddress}`,
      metadata: {
        plan,
        limit,
        usage: currentUsage,
        date: today,
        ipAddress,
        context,
      },
    });

    throw new RateLimitExceededError(
      "Daily chat limit reached. Please try again later.",
      {
        teamId: null,
        plan,
        limit,
        usage: currentUsage,
        increment,
      }
    );
  }

  const nextUsage = currentUsage + increment;

  if (nextUsage > limit) {
    const admin = createAdminClient();
    await admin.from("bot_user_activity_logs").insert({
      team_id: null,
      type: "rate_limit.blocked",
      message: `IP-based rate limit reached for IP ${ipAddress}`,
      metadata: {
        plan,
        limit,
        usage: currentUsage,
        date: today,
        ipAddress,
        context,
      },
    });

    throw new RateLimitExceededError(
      "Daily chat limit reached. Please try again later.",
      {
        teamId: null,
        plan,
        limit,
        usage: currentUsage,
        increment,
      }
    );
  }

  const remaining = Math.max(limit - nextUsage, 0);

  // Update or insert rate limit record for this IP
  const updateOrInsert = data
    ? supabase
        .from("bot_rate_limits")
        .update({ usage_count: nextUsage })
        .eq("id", data.id)
    : supabase
        .from("bot_rate_limits")
        .insert({
          ip_address: ipAddress,
          team_id: null, // IP-based limits don't have a team
          usage_count: nextUsage,
          date: today,
        });

  const { error: persistenceError } = await updateOrInsert;

  if (persistenceError) {
    throw new Error("IP-based rate limit persistence failed.");
  }

  const warningThresholdRaw = limit * RATE_LIMIT_WARNING_RATIO;
  const warningThreshold = warningThresholdRaw > 0 ? Math.ceil(warningThresholdRaw) : 0;
  const crossedWarningThreshold =
    warningThreshold > 0 && currentUsage < warningThreshold && nextUsage >= warningThreshold;

  if (crossedWarningThreshold) {
    const admin = createAdminClient();
    await admin.from("bot_user_activity_logs").insert({
      team_id: null,
      type: "rate_limit.warning",
      message: `IP-based rate limit at ${Math.round((nextUsage / limit) * 100)}% for IP ${ipAddress}`,
      metadata: {
        plan,
        limit,
        usage: nextUsage,
        date: today,
        ipAddress,
        context,
      },
    });
  }

  return {
    usage: nextUsage,
    remaining,
    limit,
    blocked: false,
  };
}

type RateLimitEventStatus = "warning" | "blocked";

async function logRateLimitEvent({
  teamId,
  plan,
  limit,
  usage,
  status,
  context,
  today,
}: {
  teamId: string;
  plan: PlanId;
  limit: number;
  usage: number;
  status: RateLimitEventStatus;
  context?: RateLimitContext;
  today: string;
}) {
  const percentage = limit > 0 ? Math.round((usage / limit) * 100) : 100;
  const remaining = limit > 0 ? Math.max(limit - usage, 0) : 0;
  const message =
    status === "blocked"
      ? `Rate limit reached for plan ${plan}`
      : `Rate limit at ${percentage}% for plan ${plan}`;

  await logAuditEvent({
    teamId,
    userId: context?.actorId,
    action:
      status === "blocked"
        ? AUDIT_ACTION.RATE_LIMIT_BLOCKED
        : AUDIT_ACTION.RATE_LIMIT_WARNING,
    resourceType: AUDIT_RESOURCE.RATE_LIMIT,
    resourceId: context?.botId ?? null,
    metadata: {
      plan,
      limit,
      usage,
      date: today,
      remaining,
      percentage,
      context,
      message,
    },
    ipAddress: context?.ip,
    userAgent: context?.source,
  });

  const admin = createAdminClient();
  const { error } = await admin.from("bot_user_activity_logs").insert({
    team_id: teamId,
    type: `rate_limit.${status}`,
    message,
    metadata: {
      plan,
      limit,
      usage,
      date: today,
      remaining,
      percentage,
      context,
    },
  });

  if (error) {
    console.error("Failed to log rate limit event", error);
  }
}
