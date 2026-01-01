import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { ACTIVE_TEAM_COOKIE_NAME } from "@/lib/teams/constants";

export async function GET() {
  const cookieStore = await cookies();
  const activeTeamId = cookieStore.get(ACTIVE_TEAM_COOKIE_NAME)?.value ?? null;

  return NextResponse.json({
    teamId: activeTeamId,
  });
}

