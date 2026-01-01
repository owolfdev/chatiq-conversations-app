// src/app/actions/bots/update-bot.ts
"use server";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { logUserActivity } from "@/app/actions/activity/log-user-activity";
import { getUserTeamId } from "@/lib/teams/get-user-team-id";
import { AUDIT_ACTION, AUDIT_RESOURCE } from "@/lib/audit/constants";
import { logAuditEvent } from "@/lib/audit/log-event";
import {
  getTeamPlanDetails,
  isTeamEvaluationExpired,
} from "@/lib/teams/usage";
import {
  invalidateBotCache,
  hashSystemPrompt,
} from "@/lib/chat/response-cache";
import { clearBotCache } from "@/lib/chat/cache-cleanup";

interface UpdateBotInput {
  name?: string;
  slug?: string;
  description?: string;
  system_prompt?: string;
  is_public?: boolean;
  status?: "active" | "draft" | "archived";
  // Color customization fields
  primary_color?: string | null;
  secondary_color?: string | null;
  color_background?: string | null;
  color_container_background?: string | null;
  color_text?: string | null;
  color_border?: string | null;
  color_message_user?: string | null;
  color_message_assistant?: string | null;
  // Navigation customization
  back_link_url?: string | null;
  back_link_text?: string | null;
  // Default response when LLM unavailable
  default_response?: string | null;
  // Formatting preference
  rich_responses_enabled?: boolean;
  // LLM toggle
  llm_enabled?: boolean;
}

export async function updateBot(id: string, input: UpdateBotInput) {
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

  const planDetails = await getTeamPlanDetails(teamId);
  if (isTeamEvaluationExpired(planDetails)) {
    return {
      success: false,
      error: "Evaluation period ended. Upgrade to update bot settings.",
    };
  }

  // Verify bot exists and user has access (RLS will enforce team membership)
  const { data: existingBot, error: fetchError } = await supabase
    .from("bot_bots")
    .select("id, slug, name, team_id, system_prompt")
    .eq("id", id)
    .single();

  if (fetchError || !existingBot) {
    return {
      success: false,
      error: "Bot not found or you don't have permission to update it.",
    };
  }

  // Verify team ownership (additional security check)
  if (existingBot.team_id !== teamId) {
    return {
      success: false,
      error: "You don't have permission to update this bot.",
    };
  }

  // If slug is being updated, check for uniqueness (excluding current bot)
  if (input.slug && input.slug !== existingBot.slug) {
    const { data: slugConflict } = await supabase
      .from("bot_bots")
      .select("id, name")
      .eq("slug", input.slug)
      .neq("id", id)
      .maybeSingle();

    if (slugConflict) {
      return {
        success: false,
        error: `Slug "${input.slug}" is already taken by bot "${slugConflict.name}". Choose another slug.`,
      };
    }
  }

  // Check if system_prompt is being updated (for cache invalidation)
  const systemPromptChanged =
    input.system_prompt !== undefined &&
    input.system_prompt !== existingBot.system_prompt;

  // Update the bot
  const { error: updateError } = await supabase
    .from("bot_bots")
    .update(input)
    .eq("id", id);

  if (updateError) {
    // Handle unique constraint violation (database level)
    if (updateError.code === "23505" && updateError.message.includes("slug")) {
      return {
        success: false,
        error: "This slug is already taken. Please choose another.",
      };
    }
    return { success: false, error: updateError.message };
  }

  // Clear response cache if system_prompt changed
  // This ensures cached responses don't become stale when bot behavior changes
  if (systemPromptChanged) {
    try {
      // Clear all cache entries for this bot (not just different hash)
      // This is safer - when system prompt changes, all cached responses may be outdated
      await clearBotCache(id);

      console.log(
        `🗑️ Cleared all response cache for bot ${id} (system_prompt changed)`
      );
    } catch (error) {
      // Log error but don't fail the update - cache clearing is non-critical
      console.error("Failed to clear bot cache:", error);
    }
  }

  const updatedFields = Object.keys(input);

  await logAuditEvent({
    teamId,
    userId: user.id,
    action: AUDIT_ACTION.UPDATE,
    resourceType: AUDIT_RESOURCE.BOT,
    resourceId: id,
    metadata: {
      previous: {
        name: existingBot.name,
        slug: existingBot.slug,
      },
      changes: input,
      updated_fields: updatedFields,
    },
  });

  // Log activity
  await logUserActivity({
    userId: user.id,
    type: "bot_updated",
    message: `Updated bot ${input.name ?? existingBot.name ?? "Unnamed"}`,
    metadata: { bot_id: id, bot_slug: input.slug ?? existingBot.slug },
  });

  return { success: true };
}
