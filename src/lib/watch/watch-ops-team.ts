import { createAdminClient } from "@/utils/supabase/admin";

const WATCH_CANARY_SLUG = "watch-canary";

/** Team that hosts the global `watch-canary` bot (Watch synthetic monitoring). */
export async function getWatchOpsTeamId(): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("bot_bots")
    .select("team_id")
    .eq("slug", WATCH_CANARY_SLUG)
    .maybeSingle();

  return data?.team_id ?? null;
}

export function isWatchOpsTeamId(
  teamId: string | null | undefined,
  watchOpsTeamId: string | null,
): boolean {
  return Boolean(teamId && watchOpsTeamId && teamId === watchOpsTeamId);
}
