// src/config/plans.ts
import type { PlanId } from "@/lib/plans/quotas";

export const PLAN_RATE_LIMITS: Record<PlanId, number | null> = {
  free: 100,
  pro: 750,
  team: 3000,
  enterprise: null,
  admin: 3000, // Admin has same rate limit as Team
};

export const PLAN_LIMITS = PLAN_RATE_LIMITS;

export function resolvePlanRateLimit(
  plan: PlanId | null | undefined
): number | null {
  if (!plan) return PLAN_RATE_LIMITS.free;
  return PLAN_RATE_LIMITS[plan] ?? PLAN_RATE_LIMITS.free;
}
