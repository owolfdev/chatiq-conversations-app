import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { setActiveTeam } from "@/app/actions/teams/set-active-team";
import { ACTIVE_TEAM_COOKIE_NAME } from "@/lib/teams/constants";
import { getUserTeamId } from "@/lib/teams/get-user-team-id";
import { getWatchOpsTeamId } from "@/lib/watch/watch-ops-team";
import { createClient } from "@/utils/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const watchOpsTeamId = await getWatchOpsTeamId();
  const cookieStore = await cookies();
  const cookieTeamId = cookieStore.get(ACTIVE_TEAM_COOKIE_NAME)?.value ?? null;

  if (!user) {
    return NextResponse.json({
      teamId: null,
      watchOpsTeamId,
    });
  }

  const resolvedTeamId = await getUserTeamId(user.id);

  if (
    resolvedTeamId &&
    cookieTeamId &&
    cookieTeamId !== resolvedTeamId &&
    cookieTeamId === watchOpsTeamId
  ) {
    await setActiveTeam(resolvedTeamId);
  }

  return NextResponse.json({
    teamId: resolvedTeamId,
    watchOpsTeamId,
  });
}
