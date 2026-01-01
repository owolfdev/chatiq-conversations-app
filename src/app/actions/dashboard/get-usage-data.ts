// src/app/actions/dashboard/get-usage-data.ts
// Server action to fetch usage data for the dashboard usage meter widget

"use server";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { getUserTeamId } from "@/lib/teams/get-user-team-id";
import { getTeamQuotaStatus, getTeamPlan, type PlanId } from "@/lib/teams/usage";
import type { TeamQuotaStatus } from "@/lib/plans/quotas";

export interface UsageData {
  quotaStatus: TeamQuotaStatus | null;
  currentPlan: PlanId;
  isTeamOwner: boolean;
  billingCurrency: "usd" | "thb";
  teamCreatedAt: string | null;
  teamTrialEndsAt: string | null;
}

export async function getUsageData(): Promise<UsageData> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      quotaStatus: null,
      currentPlan: "free",
      isTeamOwner: false,
      billingCurrency: "usd",
      teamCreatedAt: null,
      teamTrialEndsAt: null,
    };
  }

  const teamId = await getUserTeamId(user.id);

  if (!teamId) {
    return {
      quotaStatus: null,
      currentPlan: "free",
      isTeamOwner: false,
      billingCurrency: "usd",
      teamCreatedAt: null,
      teamTrialEndsAt: null,
    };
  }

  // Get team plan and check ownership
  const [plan, { data: membership }, { data: teamUserView }] = await Promise.all([
    getTeamPlan(teamId),
    supabase
      .from("bot_team_members")
      .select("role")
      .eq("team_id", teamId)
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("bot_teams")
      .select("billing_currency, created_at, trial_ends_at")
      .eq("id", teamId)
      .maybeSingle(),
  ]);

  // If RLS prevents fetching created_at/billing_currency, fall back to admin view
  let teamCreatedAt = teamUserView?.created_at ?? null;
  let teamTrialEndsAt = teamUserView?.trial_ends_at ?? null;
  let billingCurrency: "usd" | "thb" =
    teamUserView?.billing_currency === "thb" ? "thb" : "usd";

  if (!teamCreatedAt || !teamUserView?.billing_currency || !teamTrialEndsAt) {
    const admin = createAdminClient();
    const { data: teamAdminView } = await admin
      .from("bot_teams")
      .select("billing_currency, created_at, trial_ends_at")
      .eq("id", teamId)
      .maybeSingle();

    if (teamAdminView?.created_at && !teamCreatedAt) {
      teamCreatedAt = teamAdminView.created_at;
    }
    if (teamAdminView?.trial_ends_at && !teamTrialEndsAt) {
      teamTrialEndsAt = teamAdminView.trial_ends_at;
    }
    if (teamAdminView?.billing_currency === "thb") {
      billingCurrency = "thb";
    }
  }

  const isTeamOwner = membership?.role === "owner";
  const quotaStatus = await getTeamQuotaStatus(teamId, plan, teamCreatedAt);

  // TEMP DEBUG: surface trial/banner inputs to prod logs
  console.log("[usageData debug]", {
    teamId,
    plan,
    teamCreatedAt,
    teamTrialEndsAt,
    billingCurrency,
  });

  return {
    quotaStatus,
    currentPlan: plan,
    isTeamOwner,
    billingCurrency,
    teamCreatedAt,
    teamTrialEndsAt,
  };
}
