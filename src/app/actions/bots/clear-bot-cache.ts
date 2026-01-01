// src/app/actions/bots/clear-bot-cache.ts
"use server";

import { createClient } from "@/utils/supabase/server";
import { getUserTeamId } from "@/lib/teams/get-user-team-id";
import { clearBotCache } from "@/lib/chat/cache-cleanup";
import { logUserActivity } from "@/app/actions/activity/log-user-activity";

export async function clearBotResponseCache(botId: string) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "Unauthorized. Please log in." };
  }

  // Get user's team_id for RLS validation
  const teamId = await getUserTeamId(user.id);
  if (!teamId) {
    return {
      success: false,
      error:
        "No team found. Please contact support or wait for team creation to complete.",
    };
  }

  // Verify bot exists and user has access (RLS will enforce team membership)
  const { data: bot, error: fetchError } = await supabase
    .from("bot_bots")
    .select("id, name, team_id")
    .eq("id", botId)
    .single();

  if (fetchError || !bot) {
    return {
      success: false,
      error: "Bot not found or you don't have permission to manage it.",
    };
  }

  // Verify team ownership (additional security check)
  if (bot.team_id !== teamId) {
    return {
      success: false,
      error: "You don't have permission to manage this bot's cache.",
    };
  }

  // Clear the cache
  try {
    const deletedCount = await clearBotCache(botId);

    // Log activity
    await logUserActivity({
      userId: user.id,
      type: "bot_cache_cleared",
      message: `Cleared response cache for bot ${bot.name} (${deletedCount} entries deleted)`,
      metadata: {
        bot_id: botId,
        bot_name: bot.name,
        deleted_count: deletedCount,
      },
    });

    return {
      success: true,
      deleted_count: deletedCount,
      message: `Cleared ${deletedCount} cached response${
        deletedCount !== 1 ? "s" : ""
      } for ${bot.name}`,
    };
  } catch (error) {
    console.error("Failed to clear bot cache:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to clear cache",
    };
  }
}
