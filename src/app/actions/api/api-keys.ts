"use server";

import { createClient } from "@/utils/supabase/server";
import { getUserTeamId } from "@/lib/teams/get-user-team-id";

interface ApiKeyRecord {
  id: string;
  label: string | null;
  key: string; // This will be a masked version
  created_at: string;
  active: boolean;
  bot_id: string;
}

/**
 * Masks an API key for display: sk_live_****abcd
 * Shows first 8 chars (sk_live_) and last 4 chars of the token
 */
function maskApiKey(hashedKey: string): string {
  // Hashed keys are bcrypt hashes, so we can't extract the original
  // Instead, we'll show a generic masked format
  // Since we can't reverse the hash, we'll use a consistent format
  return "sk_live_****" + hashedKey.slice(-4); // Use last 4 chars of hash as identifier
}

export async function getUserApiKeys() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  // Get the active team ID to filter API keys
  const teamId = await getUserTeamId(session.user.id);

  // If teamId is provided, filter by team_id; otherwise filter by user_id (legacy behavior)
  let query = supabase
    .from("bot_api_keys")
    .select("id, label, key, created_at, active, bot_id");

  if (teamId) {
    query = query.eq("team_id", teamId);
  } else {
    query = query.eq("user_id", session.user.id);
  }

  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) {
    throw new Error("Failed to fetch API keys");
  }

  // Mask all keys before returning (keys are stored as hashes)
  return (data || []).map((key) => ({
    ...key,
    key: maskApiKey(key.key), // Mask the hash for display
  }));
}

export async function getTeamName(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    return null;
  }

  const teamId = await getUserTeamId(session.user.id);
  if (!teamId) {
    return null;
  }

  const { data: team } = await supabase
    .from("bot_teams")
    .select("name")
    .eq("id", teamId)
    .maybeSingle();

  return team?.name ?? null;
}
