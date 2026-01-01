// src/lib/plans/free-tier-expiry.ts
// Utilities for checking if evaluation access has expired (14-day limit)

/**
 * Number of days in the evaluation period
 */
export const FREE_TIER_TRIAL_DAYS = 14;

/**
 * Check if an evaluation account has expired based on creation date
 * @param createdAt - Account creation date (ISO string or Date object)
 * @returns true if account is older than FREE_TIER_TRIAL_DAYS
 */
function resolveTrialEndDate(
  createdAt: string | Date,
  trialEndsAt?: string | Date | null
): Date {
  if (trialEndsAt) {
    const explicitEnd = new Date(trialEndsAt);
    if (!Number.isNaN(explicitEnd.getTime())) {
      return explicitEnd;
    }
  }

  const created = new Date(createdAt);
  const expiry = new Date(created);
  expiry.setDate(expiry.getDate() + FREE_TIER_TRIAL_DAYS);
  return expiry;
}

export function isFreeTierExpired(
  createdAt: string | Date,
  trialEndsAt?: string | Date | null
): boolean {
  const trialEnd = resolveTrialEndDate(createdAt, trialEndsAt);
  return Date.now() > trialEnd.getTime();
}

/**
 * Get the number of days remaining in the evaluation period
 * @param createdAt - Account creation date (ISO string or Date object)
 * @returns Number of days remaining (0 if expired)
 */
export function getFreeTierDaysRemaining(
  createdAt: string | Date,
  trialEndsAt?: string | Date | null
): number {
  const trialEnd = resolveTrialEndDate(createdAt, trialEndsAt);
  const remaining = trialEnd.getTime() - Date.now();
  return Math.max(0, Math.ceil(remaining / (24 * 60 * 60 * 1000)));
}

/**
 * Get the date when the evaluation period expires
 * @param createdAt - Account creation date (ISO string or Date object)
 * @returns Expiry date as Date object
 */
export function getFreeTierExpiryDate(
  createdAt: string | Date,
  trialEndsAt?: string | Date | null
): Date {
  return resolveTrialEndDate(createdAt, trialEndsAt);
}

/**
 * Check if account is in the warning phase (last 7 days)
 * @param createdAt - Account creation date (ISO string or Date object)
 * @returns true if account has 7 or fewer days remaining
 */
export function isInFreeTierWarningPhase(
  createdAt: string | Date,
  trialEndsAt?: string | Date | null
): boolean {
  const daysRemaining = getFreeTierDaysRemaining(createdAt, trialEndsAt);
  return daysRemaining > 0 && daysRemaining <= 7;
}
