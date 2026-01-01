// src/lib/plans/quotas.ts
// Central definition of per-plan quotas and helpers for computing warning thresholds.

export type PlanQuotaKey = "documents" | "embeddings" | "messagesMonthly";

export interface PlanQuota {
  documents: number | null;
  embeddings: number | null;
  messagesMonthly: number | null;
  warningRatio: number;
}

export type PlanId = "free" | "pro" | "team" | "enterprise" | "admin";

export const PLAN_QUOTAS: Record<PlanId, PlanQuota> = {
  free: {
    documents: 1,
    embeddings: null,
    messagesMonthly: 100,
    warningRatio: 0.8,
  },
  pro: {
    documents: 50,
    embeddings: null,
    messagesMonthly: 2000,
    warningRatio: 0.8,
  },
  team: {
    documents: 200,
    embeddings: null,
    messagesMonthly: 10000,
    warningRatio: 0.8,
  },
  enterprise: {
    documents: null,
    embeddings: null,
    messagesMonthly: null,
    warningRatio: 1,
  },
  admin: {
    // Admin plan has generous limits but no Stripe subscription required
    documents: 1000,
    embeddings: null,
    messagesMonthly: 100000,
    warningRatio: 1,
  },
};

export const PLAN_SEAT_LIMITS: Record<PlanId, number | null> = {
  free: 1,
  pro: 1,
  team: 5,
  enterprise: null,
  admin: null,
};

export interface ResourceUsageSnapshot {
  documents: number;
  embeddings: number;
  messagesMonthly: number;
}

export interface QuotaStatus {
  limit: number | null;
  used: number;
  remaining: number | null;
  warning: boolean;
  exceeded: boolean;
}

export function evaluateQuota(
  plan: PlanId,
  quotaKey: PlanQuotaKey,
  used: number
): QuotaStatus {
  const planQuota = PLAN_QUOTAS[plan];
  const limit = planQuota[quotaKey];

  if (limit === null) {
    return {
      limit: null,
      used,
      remaining: null,
      warning: false,
      exceeded: false,
    };
  }

  const remaining = Math.max(limit - used, 0);
  const ratio = limit > 0 ? used / limit : 0;
  const warning = ratio >= planQuota.warningRatio && remaining > 0;
  const exceeded = used > limit;

  return {
    limit,
    used,
    remaining,
    warning,
    exceeded,
  };
}

export interface TeamQuotaStatus {
  plan: PlanId;
  quotas: Record<PlanQuotaKey, QuotaStatus>;
  period?: { start: string; end: string | null };
}

export function evaluateTeamQuotas(
  plan: PlanId,
  usage: ResourceUsageSnapshot
): TeamQuotaStatus {
  return {
    plan,
    quotas: {
      documents: evaluateQuota(plan, "documents", usage.documents),
      embeddings: evaluateQuota(plan, "embeddings", usage.embeddings),
      messagesMonthly: evaluateQuota(
        plan,
        "messagesMonthly",
        usage.messagesMonthly
      ),
    },
  };
}
