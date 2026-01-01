"use server";

import { cookies } from "next/headers";

import { createClient } from "@/utils/supabase/server";
import {
  ACTIVE_TEAM_COOKIE_MAX_AGE,
  ACTIVE_TEAM_COOKIE_NAME,
} from "@/lib/teams/constants";

interface SetActiveTeamResult {
  success: boolean;
  error?: string;
}

export async function setActiveTeam(
  teamId: string | null
): Promise<SetActiveTeamResult> {
  const cookieStore = await cookies();
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "You must be signed in." };
  }

  if (!teamId) {
    cookieStore.delete(ACTIVE_TEAM_COOKIE_NAME);
    return { success: true };
  }

  const { data: membership, error: membershipError } = await supabase
    .from("bot_team_members")
    .select("team_id")
    .eq("team_id", teamId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (membershipError) {
    return { success: false, error: "Unable to verify team membership." };
  }

  if (!membership?.team_id) {
    return { success: false, error: "You are not a member of that team." };
  }

  cookieStore.set(ACTIVE_TEAM_COOKIE_NAME, teamId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: ACTIVE_TEAM_COOKIE_MAX_AGE,
    path: "/",
  });

  return { success: true };
}

