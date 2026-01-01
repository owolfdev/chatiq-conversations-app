// src/app/api/dashboard/trial-status/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getUserTeamId } from "@/lib/teams/get-user-team-id";
import {
  isFreeTierExpired,
  getFreeTierDaysRemaining,
} from "@/lib/plans/free-tier-expiry";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ daysRemaining: null });
    }

    const teamId = await getUserTeamId(user.id);
    if (!teamId) {
      return NextResponse.json({ daysRemaining: null });
    }

    // Get team plan and creation date
    const { data: team } = await supabase
      .from("bot_teams")
      .select("plan, created_at, trial_ends_at")
      .eq("id", teamId)
      .maybeSingle();

    // Only return data for free plan users
    if (!team || team.plan !== "free" || !team.created_at) {
      return NextResponse.json({ daysRemaining: null });
    }

    const daysRemaining = getFreeTierDaysRemaining(
      team.created_at,
      team.trial_ends_at
    );
    const isExpired = isFreeTierExpired(team.created_at, team.trial_ends_at);

    return NextResponse.json({
      daysRemaining,
      isExpired,
    });
  } catch (error) {
    console.error("[trial-status] Error fetching trial status:", error);
    return NextResponse.json(
      { error: "Failed to fetch trial status" },
      { status: 500 }
    );
  }
}
