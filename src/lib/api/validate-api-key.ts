// src/lib/api/validate-api-key.ts
// Shared utility for API key validation across public API endpoints

import { createAdminClient } from "@/utils/supabase/admin";
import { isFreeTierExpired } from "@/lib/plans/free-tier-expiry";
import bcrypt from "bcryptjs";

export interface ApiKeyData {
  bot_id: string;
  team_id: string;
  evaluationExpired: boolean;
}

/**
 * Validates an API key and returns associated bot/team data.
 * Returns null if key is invalid or inactive.
 */
export async function validateApiKey(
  apiKey: string
): Promise<ApiKeyData | null> {
  const adminClient = createAdminClient();
  const { data: allApiKeys, error: keysError } = await adminClient
    .from("bot_api_keys")
    .select("id, bot_id, team_id, key")
    .eq("active", true);

  if (keysError || !allApiKeys) {
    return null;
  }

  for (const keyRecord of allApiKeys) {
    const isMatch = await bcrypt.compare(apiKey, keyRecord.key);
    if (isMatch) {
      const { data: team } = await adminClient
        .from("bot_teams")
        .select("plan, created_at, trial_ends_at")
        .eq("id", keyRecord.team_id)
        .maybeSingle();

      const evaluationExpired =
        team?.plan === "free" &&
        !!team.created_at &&
        isFreeTierExpired(team.created_at, team.trial_ends_at);

      return {
        bot_id: keyRecord.bot_id,
        team_id: keyRecord.team_id,
        evaluationExpired,
      };
    }
  }

  return null;
}
