// src/lib/teams/get-user-team-id.ts

import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { ACTIVE_TEAM_COOKIE_NAME } from "@/lib/teams/constants";
import {
  getWatchOpsTeamId,
  isWatchOpsTeamId,
} from "@/lib/watch/watch-ops-team";

export type GetUserTeamIdOptions = {
  /** When true, the Watch Ops team may be returned (Watch admin setup only). */
  allowWatchOps?: boolean;
};

/**
 * Gets the active customer workspace team for a user.
 *
 * Watch Ops (the team hosting `watch-canary`) is excluded from inbox/dashboard
 * defaults so synthetic monitoring does not replace customer conversation context.
 */
export async function getUserTeamId(
  userId: string,
  options?: GetUserTeamIdOptions,
): Promise<string | null> {
  const allowWatchOps = options?.allowWatchOps === true;
  const watchOpsTeamId = allowWatchOps ? null : await getWatchOpsTeamId();
  const isExcludedTeam = (teamId: string | null | undefined) =>
    !allowWatchOps && isWatchOpsTeamId(teamId, watchOpsTeamId);

  const supabase = await createClient();
  const cookieStore = await cookies();
  const preferredTeamId =
    cookieStore.get(ACTIVE_TEAM_COOKIE_NAME)?.value ?? null;

  if (preferredTeamId && !isExcludedTeam(preferredTeamId)) {
    const { data: preferredMembership } = await supabase
      .from("bot_team_members")
      .select("team_id")
      .eq("team_id", preferredTeamId)
      .eq("user_id", userId)
      .maybeSingle();

    if (preferredMembership?.team_id) {
      return preferredMembership.team_id;
    }
  }

  const { data: memberTeams } = await supabase
    .from("bot_team_members")
    .select("team_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  for (const membership of memberTeams ?? []) {
    if (!isExcludedTeam(membership.team_id)) {
      return membership.team_id;
    }
  }

  const { data: ownedTeams } = await supabase
    .from("bot_teams")
    .select("id")
    .eq("owner_id", userId);

  for (const team of ownedTeams ?? []) {
    if (!isExcludedTeam(team.id)) {
      return team.id;
    }
  }

  console.warn(
    `No customer team found for user ${userId}. This may indicate a missing team membership.`,
  );
  return null;
}

export async function getUserTeamIds(userId: string): Promise<string[]> {
  const supabase = await createClient();

  const { data: memberTeams } = await supabase
    .from("bot_team_members")
    .select("team_id")
    .eq("user_id", userId);

  const teamIds = memberTeams?.map((t) => t.team_id) || [];

  const { data: ownedTeams } = await supabase
    .from("bot_teams")
    .select("id")
    .eq("owner_id", userId);

  if (ownedTeams) {
    for (const team of ownedTeams) {
      if (!teamIds.includes(team.id)) {
        teamIds.push(team.id);
      }
    }
  }

  return teamIds;
}
