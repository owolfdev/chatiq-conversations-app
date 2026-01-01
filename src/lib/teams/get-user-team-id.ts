// src/lib/teams/get-user-team-id.ts
// Helper function to get a user's primary team_id
// This bridges the gap until Day 7 when proper team membership creation is implemented
// After Day 7, this can be replaced with proper team membership logic

import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import {
  ACTIVE_TEAM_COOKIE_NAME,
  ACTIVE_TEAM_COOKIE_MAX_AGE,
} from "@/lib/teams/constants";

/**
 * Gets the primary team_id for a user.
 *
 * Priority:
 * 1. Most recent team membership (via bot_team_members.created_at desc)
 * 2. First team owned by the user (via bot_teams.owner_id)
 *
 * This is a temporary helper until Day 7 (Nov 7) when proper team membership
 * creation is implemented during signup.
 *
 * @param userId - The user ID to get team for
 * @returns The team_id or null if no team found
 */
export async function getUserTeamId(userId: string): Promise<string | null> {
  const supabase = await createClient();
  const cookieStore = await cookies();
  const preferredTeamId =
    cookieStore.get(ACTIVE_TEAM_COOKIE_NAME)?.value ?? null;

  if (preferredTeamId) {
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

  // First, try to get team from team_members (if user is already a member)
  const { data: memberTeam } = await supabase
    .from("bot_team_members")
    .select("team_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (memberTeam?.team_id) {
    return memberTeam.team_id;
  }

  // Fallback: get team where user is owner
  const { data: ownedTeam } = await supabase
    .from("bot_teams")
    .select("id")
    .eq("owner_id", userId)
    .limit(1)
    .maybeSingle();

  if (ownedTeam?.id) {
    return ownedTeam.id;
  }

  // If no team found, return null
  // This should not happen after Day 7 when teams are created on signup
  console.warn(
    `No team found for user ${userId}. This may indicate a missing team creation.`
  );
  return null;
}

/**
 * Gets all team IDs where a user is a member.
 *
 * @param userId - The user ID to get teams for
 * @returns Array of team IDs
 */
export async function getUserTeamIds(userId: string): Promise<string[]> {
  const supabase = await createClient();

  // Get teams from team_members
  const { data: memberTeams } = await supabase
    .from("bot_team_members")
    .select("team_id")
    .eq("user_id", userId);

  const teamIds = memberTeams?.map((t) => t.team_id) || [];

  // Also include teams where user is owner (if not already included)
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
