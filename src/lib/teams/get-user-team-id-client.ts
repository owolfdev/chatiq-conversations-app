// src/lib/teams/get-user-team-id-client.ts
// Client-side version of getUserTeamId for use in client components
// This bridges the gap until Day 7 when proper team membership creation is implemented

import { createClient } from "@/utils/supabase/client";
import { ACTIVE_TEAM_COOKIE_NAME } from "@/lib/teams/constants";

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${name.replace(/[$()*+.?[\\\]^{|}]/g, "\\$&")}=([^;]*)`)
  );
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Gets the primary team_id for the current authenticated user (client-side).
 * 
 * Priority:
 * 1. Most recent team membership (via bot_team_members.created_at desc)
 * 2. First team owned by the user (via bot_teams.owner_id)
 * 
 * This is a temporary helper until Day 7 (Nov 7) when proper team membership
 * creation is implemented during signup.
 * 
 * @returns The team_id or null if no team found
 */
export async function getUserTeamIdClient(): Promise<string | null> {
  const supabase = createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user?.id) {
    return null;
  }

  const preferredTeamId = readCookie(ACTIVE_TEAM_COOKIE_NAME);
  if (preferredTeamId) {
    const { data: preferredTeam } = await supabase
      .from("bot_team_members")
      .select("team_id")
      .eq("team_id", preferredTeamId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (preferredTeam?.team_id) {
      return preferredTeam.team_id;
    }
  }

  // First, try to get team from team_members (if user is already a member)
  const { data: memberTeam } = await supabase
    .from("bot_team_members")
    .select("team_id")
    .eq("user_id", user.id)
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
    .eq("owner_id", user.id)
    .limit(1)
    .maybeSingle();

  if (ownedTeam?.id) {
    return ownedTeam.id;
  }

  // If no team found, return null
  console.warn(`No team found for user ${user.id}. This may indicate a missing team creation.`);
  return null;
}

