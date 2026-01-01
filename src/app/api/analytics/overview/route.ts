import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getUserTeamId } from "@/lib/teams/get-user-team-id";
import { getAnalyticsOverview } from "@/lib/analytics/get-analytics-overview";
import { subDays } from "date-fns";

function parseDateParam(value: string | null): Date | null {
  if (!value) return null;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export async function GET(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const teamId = await getUserTeamId(user.id);
  if (!teamId) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  const url = new URL(req.url);
  const startParam = parseDateParam(url.searchParams.get("start"));
  const endParam = parseDateParam(url.searchParams.get("end"));

  const endDate = endParam ?? new Date();
  const startDate = startParam ?? subDays(endDate, 29);

  if (startDate > endDate) {
    return NextResponse.json(
      { error: "Start date must be before end date" },
      { status: 400 }
    );
  }

  const overview = await getAnalyticsOverview({
    supabase,
    teamId,
    startDate,
    endDate,
  });

  return NextResponse.json(overview);
}
