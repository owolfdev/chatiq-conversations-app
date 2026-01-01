// src/app/dashboard/analytics/page.tsx
import { getUserBotsWithCounts } from "@/app/actions/bots/get-user-bots-with-counts";
import AnalyticsClient from "./analytics-client";
import type { Metadata } from "next";
import { createClient } from "@/utils/supabase/server";
import { getAnalyticsOverview } from "@/lib/analytics/get-analytics-overview";
import { subDays } from "date-fns";

export const metadata: Metadata = {
  title: "Analytics",
};

export default async function AnalyticsPage() {
  const botContext = await getUserBotsWithCounts();
  const activeTeamId = botContext.team.id;
  const activeTeamName = botContext.team.name;
  const supabase = await createClient();
  const endDate = new Date();
  const startDate = subDays(endDate, 29);
  const overview = activeTeamId
    ? await getAnalyticsOverview({
        supabase,
        teamId: activeTeamId,
        startDate,
        endDate,
      })
    : null;

  return (
    <AnalyticsClient
      initialOverview={overview}
      teamName={activeTeamName}
      initialStartDate={startDate.toISOString().slice(0, 10)}
      initialEndDate={endDate.toISOString().slice(0, 10)}
    />
  );
}
