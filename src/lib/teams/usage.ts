// src/lib/teams/usage.ts
// Utilities for computing per-team resource usage and quota status

import { createAdminClient } from "@/utils/supabase/admin";
import {
  evaluateQuota,
  evaluateTeamQuotas,
  PLAN_SEAT_LIMITS,
  type PlanId,
  type PlanQuotaKey,
  type ResourceUsageSnapshot,
  type TeamQuotaStatus,
} from "@/lib/plans/quotas";
import { isFreeTierExpired } from "@/lib/plans/free-tier-expiry";

export type { PlanId };

function startOfCurrentUtcMonth(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
}

function startOfCurrentUtcMonthIso(): string {
  return startOfCurrentUtcMonth().toISOString();
}

function startOfNextUtcMonthIso(): string {
  const now = new Date();
  const nextMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0));
  return nextMonth.toISOString();
}

export interface PlanPeriod {
  start: string;
  end: string | null;
}

export interface TeamPlanDetails {
  plan: PlanId;
  createdAt: string | null;
  trialEndsAt: string | null;
  extraSeats: number;
  seatLimitOverride: number | null;
}

export function resolveTeamSeatLimit(
  plan: PlanId,
  extraSeats?: number | null,
  seatLimitOverride?: number | null
): number | null {
  if (seatLimitOverride !== null && seatLimitOverride !== undefined) {
    return Math.max(0, seatLimitOverride);
  }

  const baseSeats = PLAN_SEAT_LIMITS[plan] ?? null;
  if (baseSeats === null) {
    return null;
  }

  const safeExtra = Math.max(0, extraSeats ?? 0);
  return Math.max(0, baseSeats + safeExtra);
}

export function isTeamEvaluationExpired(details: TeamPlanDetails): boolean {
  if (details.plan !== "free" || !details.createdAt) {
    return false;
  }

  return isFreeTierExpired(details.createdAt, details.trialEndsAt);
}

export async function getTeamPlanDetails(teamId: string): Promise<TeamPlanDetails> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("bot_teams")
    .select("plan, created_at, trial_ends_at, extra_seats, seat_limit_override")
    .eq("id", teamId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load team plan details: ${error.message}`);
  }

  const plan = (data?.plan ?? "free") as PlanId;
  return {
    plan: ["free", "pro", "team", "enterprise", "admin"].includes(plan)
      ? plan
      : "free",
    createdAt: data?.created_at ?? null,
    trialEndsAt: data?.trial_ends_at ?? null,
    extraSeats: data?.extra_seats ?? 0,
    seatLimitOverride: data?.seat_limit_override ?? null,
  };
}

export function getPlanPeriod(plan: PlanId, teamCreatedAt?: string | null): PlanPeriod {
  if (plan === "free") {
    const start = teamCreatedAt ?? startOfCurrentUtcMonthIso();
    const startDate = new Date(start);
    const endDate = new Date(startDate.getTime() + 14 * 24 * 60 * 60 * 1000);
    return {
      start: startDate.toISOString(),
      end: endDate.toISOString(),
    };
  }

  // For Pro/Team/Admin, align to calendar month (fallback if Stripe anchor not stored)
  return {
    start: startOfCurrentUtcMonthIso(),
    end: startOfNextUtcMonthIso(),
  };
}

export async function getTeamUsage(
  teamId: string,
  plan: PlanId,
  teamCreatedAt?: string | null
): Promise<{ usage: ResourceUsageSnapshot; period: PlanPeriod }> {
  const admin = createAdminClient();
  const period = getPlanPeriod(plan, teamCreatedAt);

  const [documentsResult, embeddingsResult, quotaUsageResult] = await Promise.all([
    admin
      .from("bot_documents")
      .select("id", { count: "exact", head: true })
      .eq("team_id", teamId),
    admin
      .from("bot_doc_chunks")
      .select("id", { count: "exact", head: true })
      .eq("team_id", teamId),
    admin
      .from("bot_quota_usage")
      .select("openai_api_calls")
      .eq("team_id", teamId)
      .eq("month_start", period.start)
      .maybeSingle(),
  ]);

  const documents = documentsResult.count ?? 0;
  const embeddings = embeddingsResult.count ?? 0;
  // Use OpenAI API call count from quota_usage table (tracks actual API calls, not saved messages)
  const messagesMonthly = quotaUsageResult.data?.openai_api_calls ?? 0;

  return {
    period,
    usage: {
      documents,
      embeddings,
      messagesMonthly,
    },
  };
}

export async function getTeamQuotaStatus(
  teamId: string,
  plan: PlanId,
  teamCreatedAt?: string | null
): Promise<TeamQuotaStatus> {
  const { usage, period } = await getTeamUsage(teamId, plan, teamCreatedAt);
  return {
    ...evaluateTeamQuotas(plan, usage),
    period,
  };
}

export async function getTeamPlan(teamId: string): Promise<PlanId> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("bot_teams")
    .select("plan")
    .eq("id", teamId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load team plan: ${error.message}`);
  }

  const plan = (data?.plan ?? "free") as PlanId;
  if (!plan || !["free", "pro", "team", "enterprise", "admin"].includes(plan)) {
    return "free";
  }

  return plan;
}

export class QuotaExceededError extends Error {
  resource: PlanQuotaKey;
  limit: number | null;
  used: number;
  remaining: number | null;

  constructor(resource: PlanQuotaKey, status: ReturnType<typeof evaluateQuota>) {
    super(`Quota exceeded for ${resource}`);
    this.name = "QuotaExceededError";
    this.resource = resource;
    this.limit = status.limit;
    this.used = status.used;
    this.remaining = status.remaining;
  }
}

export async function ensureQuotaAllows(
  teamId: string,
  plan: PlanId,
  resource: PlanQuotaKey,
  delta: number = 0,
  teamCreatedAt?: string | null
) {
  const { usage, period } = await getTeamUsage(teamId, plan, teamCreatedAt);
  const projectedUsage = {
    ...usage,
    [resource]: usage[resource] + delta,
  } as ResourceUsageSnapshot;

  const status = evaluateQuota(plan, resource, projectedUsage[resource]);

  if (status.exceeded) {
    throw new QuotaExceededError(resource, status);
  }

  return {
    usage: projectedUsage,
    status,
    period,
  };
}

/**
 * Increment the OpenAI API call counter for a team
 * This tracks actual OpenAI API usage (not canned responses or cached messages)
 * Works for both private and non-private mode conversations
 */
export async function incrementOpenAiApiCallCount(
  teamId: string,
  plan: PlanId,
  teamCreatedAt?: string | null
): Promise<void> {
  const admin = createAdminClient();
  const period = getPlanPeriod(plan, teamCreatedAt);

  // Use database function for atomic increment
  const { error } = await admin.rpc("increment_quota_usage", {
    p_team_id: teamId,
    p_month_start: period.start,
  });

  if (error) {
    // Fallback: manual increment if RPC doesn't exist or fails
    const { data: existing } = await admin
      .from("bot_quota_usage")
      .select("openai_api_calls")
      .eq("team_id", teamId)
      .eq("month_start", period.start)
      .maybeSingle();

    if (existing) {
      await admin
        .from("bot_quota_usage")
        .update({
          openai_api_calls: (existing.openai_api_calls ?? 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("team_id", teamId)
        .eq("month_start", period.start);
    } else {
      await admin.from("bot_quota_usage").insert({
        team_id: teamId,
        month_start: period.start,
        openai_api_calls: 1,
      });
    }
  }
}
