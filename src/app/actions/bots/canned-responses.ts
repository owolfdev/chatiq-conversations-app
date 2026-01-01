// src/app/actions/bots/canned-responses.ts
"use server";

import { createClient } from "@/utils/supabase/server";
import { getUserTeamId } from "@/lib/teams/get-user-team-id";
import { AUDIT_ACTION, AUDIT_RESOURCE } from "@/lib/audit/constants";
import { logAuditEvent } from "@/lib/audit/log-event";
import { logUserActivity } from "@/app/actions/activity/log-user-activity";
import {
  getTeamPlan,
  getTeamPlanDetails,
  isTeamEvaluationExpired,
} from "@/lib/teams/usage";

export interface CannedResponseInput {
  pattern: string;
  pattern_type: "regex" | "keyword" | "exact";
  response: string;
  action?: "human_request" | "human_takeover_on" | "human_takeover_off" | null;
  action_config?: Record<string, unknown> | null;
  case_sensitive?: boolean;
  fuzzy_threshold?: number; // 0-3
  priority?: number;
  enabled?: boolean;
}

export interface CannedResponseUpdate extends Partial<CannedResponseInput> {
  id: string;
}

/**
 * Get all pre-configured responses for a bot
 */
export async function getCannedResponses(botId: string) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "Unauthorized. Please log in.", data: null };
  }

  const teamId = await getUserTeamId(user.id);
  if (!teamId) {
    return {
      success: false,
      error: "No team found. Please contact support.",
      data: null,
    };
  }

  // Verify bot exists and user has access
  const { data: bot, error: botError } = await supabase
    .from("bot_bots")
    .select("id, team_id")
    .eq("id", botId)
    .single();

  if (botError || !bot) {
    return {
      success: false,
      error: "Bot not found or you don't have permission to access it.",
      data: null,
    };
  }

  if (bot.team_id !== teamId) {
    return {
      success: false,
      error: "You don't have permission to access this bot.",
      data: null,
    };
  }

  // Fetch pre-configured responses
  const { data, error } = await supabase
    .from("bot_canned_responses")
    .select("*")
    .eq("bot_id", botId)
    .eq("team_id", teamId)
    .order("priority", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    return { success: false, error: error.message, data: null };
  }

  return { success: true, data: data || [], error: null };
}

/**
 * Create a new pre-configured response
 */
export async function createCannedResponse(
  botId: string,
  input: CannedResponseInput
) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "Unauthorized. Please log in." };
  }

  const teamId = await getUserTeamId(user.id);
  if (!teamId) {
    return {
      success: false,
      error: "No team found. Please contact support.",
    };
  }

  const planDetails = await getTeamPlanDetails(teamId);
  if (isTeamEvaluationExpired(planDetails)) {
    return {
      success: false,
      error: "Evaluation period ended. Upgrade to edit pre-configured responses.",
    };
  }

  // Verify bot exists and user has access
  const { data: bot, error: botError } = await supabase
    .from("bot_bots")
    .select("id, name, team_id")
    .eq("id", botId)
    .single();

  if (botError || !bot) {
    return {
      success: false,
      error: "Bot not found or you don't have permission to update it.",
    };
  }

  if (bot.team_id !== teamId) {
    return {
      success: false,
      error: "You don't have permission to update this bot.",
    };
  }

  // Enforce pre-configured response caps per plan (soft caps with fair use)
  const plan = await getTeamPlan(teamId);
  const caps: Record<string, number> = {
    free: 100, // allow plenty for free bot
    pro: 200,
    team: 1000,
  };
  const cap = caps[plan] ?? null;
  if (cap !== null) {
    const { count } = await supabase
      .from("bot_canned_responses")
      .select("*", { count: "exact", head: true })
      .eq("bot_id", botId);
    if ((count ?? 0) >= cap) {
      return {
        success: false,
        error: `This plan supports up to ${cap.toLocaleString()} pre-configured responses per bot. Contact support to increase your limit.`,
      };
    }
  }

  // Validate input
  if (!input.pattern || !input.response) {
    return {
      success: false,
      error: "Pattern and response are required.",
    };
  }

  if (!["regex", "keyword", "exact"].includes(input.pattern_type)) {
    return {
      success: false,
      error: "Invalid pattern type. Must be 'regex', 'keyword', or 'exact'.",
    };
  }

  if (
    input.action &&
    !["human_request", "human_takeover_on", "human_takeover_off"].includes(
      input.action
    )
  ) {
    return {
      success: false,
      error:
        "Invalid action. Must be 'human_request', 'human_takeover_on', or 'human_takeover_off'.",
    };
  }

  const fuzzyThreshold = Math.max(
    0,
    Math.min(3, input.fuzzy_threshold ?? 1)
  );
  const action = input.action ?? null;
  const actionConfig = action ? input.action_config ?? null : null;

  // Create pre-configured response
  const { data: newResponse, error: createError } = await supabase
    .from("bot_canned_responses")
    .insert({
      bot_id: botId,
      team_id: teamId,
      pattern: input.pattern,
      pattern_type: input.pattern_type,
      response: input.response,
      action,
      action_config: actionConfig,
      case_sensitive: input.case_sensitive ?? false,
      fuzzy_threshold: fuzzyThreshold,
      priority: input.priority ?? 0,
      enabled: input.enabled ?? true,
    })
    .select()
    .single();

  if (createError) {
    return { success: false, error: createError.message };
  }

  // Log audit event
  await logAuditEvent({
    teamId,
    userId: user.id,
    action: AUDIT_ACTION.CREATE,
    resourceType: AUDIT_RESOURCE.BOT,
    resourceId: botId,
    metadata: {
      canned_response_id: newResponse.id,
      pattern: input.pattern,
      pattern_type: input.pattern_type,
    },
  });

  // Log activity
  await logUserActivity({
    userId: user.id,
    type: "canned_response_created",
    message: `Created pre-configured response for bot ${bot.name}`,
    metadata: {
      bot_id: botId,
      canned_response_id: newResponse.id,
    },
  });

  return { success: true, data: newResponse };
}

/**
 * Update a pre-configured response
 */
export async function updateCannedResponse(
  input: CannedResponseUpdate
) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "Unauthorized. Please log in." };
  }

  const teamId = await getUserTeamId(user.id);
  if (!teamId) {
    return {
      success: false,
      error: "No team found. Please contact support.",
    };
  }

  const planDetails = await getTeamPlanDetails(teamId);
  if (isTeamEvaluationExpired(planDetails)) {
    return {
      success: false,
      error: "Evaluation period ended. Upgrade to edit pre-configured responses.",
    };
  }

  // Verify pre-configured response exists and user has access
  const { data: existingResponse, error: fetchError } = await supabase
    .from("bot_canned_responses")
    .select("*, bot_bots!inner(id, name, team_id)")
    .eq("id", input.id)
    .single();

  if (fetchError || !existingResponse) {
    return {
      success: false,
      error: "Pre-configured response not found or you don't have permission to update it.",
    };
  }

  const bot = existingResponse.bot_bots as { id: string; name: string; team_id: string };
  if (bot.team_id !== teamId) {
    return {
      success: false,
      error: "You don't have permission to update this pre-configured response.",
    };
  }

  // Validate pattern_type if provided
  if (
    input.pattern_type &&
    !["regex", "keyword", "exact"].includes(input.pattern_type)
  ) {
    return {
      success: false,
      error: "Invalid pattern type. Must be 'regex', 'keyword', or 'exact'.",
    };
  }

  if (
    input.action &&
    !["human_request", "human_takeover_on", "human_takeover_off"].includes(
      input.action
    )
  ) {
    return {
      success: false,
      error:
        "Invalid action. Must be 'human_request', 'human_takeover_on', or 'human_takeover_off'.",
    };
  }

  // Prepare update data
  const updateData: Partial<CannedResponseInput> = {};
  if (input.pattern !== undefined) updateData.pattern = input.pattern;
  if (input.pattern_type !== undefined)
    updateData.pattern_type = input.pattern_type;
  if (input.response !== undefined) updateData.response = input.response;
  if (input.action !== undefined) {
    updateData.action = input.action ?? null;
    if (!input.action) {
      updateData.action_config = null;
    }
  }
  if (input.action_config !== undefined) {
    updateData.action_config = input.action_config;
  }
  if (input.case_sensitive !== undefined)
    updateData.case_sensitive = input.case_sensitive;
  if (input.fuzzy_threshold !== undefined) {
    updateData.fuzzy_threshold = Math.max(0, Math.min(3, input.fuzzy_threshold));
  }
  if (input.priority !== undefined) updateData.priority = input.priority;
  if (input.enabled !== undefined) updateData.enabled = input.enabled;

  // Update pre-configured response
  const { data: updatedResponse, error: updateError } = await supabase
    .from("bot_canned_responses")
    .update(updateData)
    .eq("id", input.id)
    .select()
    .single();

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  // Log audit event
  await logAuditEvent({
    teamId,
    userId: user.id,
    action: AUDIT_ACTION.UPDATE,
    resourceType: AUDIT_RESOURCE.BOT,
    resourceId: bot.id,
    metadata: {
      canned_response_id: input.id,
      changes: updateData,
    },
  });

  // Log activity
  await logUserActivity({
    userId: user.id,
    type: "canned_response_updated",
    message: `Updated pre-configured response for bot ${bot.name}`,
    metadata: {
      bot_id: bot.id,
      canned_response_id: input.id,
    },
  });

  return { success: true, data: updatedResponse };
}

/**
 * Delete a pre-configured response
 */
export async function deleteCannedResponse(cannedResponseId: string) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "Unauthorized. Please log in." };
  }

  const teamId = await getUserTeamId(user.id);
  if (!teamId) {
    return {
      success: false,
      error: "No team found. Please contact support.",
    };
  }

  const planDetails = await getTeamPlanDetails(teamId);
  if (isTeamEvaluationExpired(planDetails)) {
    return {
      success: false,
      error: "Evaluation period ended. Upgrade to edit pre-configured responses.",
    };
  }

  // Verify pre-configured response exists and user has access
  const { data: existingResponse, error: fetchError } = await supabase
    .from("bot_canned_responses")
    .select("*, bot_bots!inner(id, name, team_id)")
    .eq("id", cannedResponseId)
    .single();

  if (fetchError || !existingResponse) {
    return {
      success: false,
      error: "Pre-configured response not found or you don't have permission to delete it.",
    };
  }

  const bot = existingResponse.bot_bots as { id: string; name: string; team_id: string };
  if (bot.team_id !== teamId) {
    return {
      success: false,
      error: "You don't have permission to delete this pre-configured response.",
    };
  }

  // Delete pre-configured response
  const { error: deleteError } = await supabase
    .from("bot_canned_responses")
    .delete()
    .eq("id", cannedResponseId);

  if (deleteError) {
    return { success: false, error: deleteError.message };
  }

  // Log audit event
  await logAuditEvent({
    teamId,
    userId: user.id,
    action: AUDIT_ACTION.DELETE,
    resourceType: AUDIT_RESOURCE.BOT,
    resourceId: bot.id,
    metadata: {
      canned_response_id: cannedResponseId,
      pattern: existingResponse.pattern,
    },
  });

  // Log activity
  await logUserActivity({
    userId: user.id,
    type: "canned_response_deleted",
    message: `Deleted pre-configured response for bot ${bot.name}`,
    metadata: {
      bot_id: bot.id,
      canned_response_id: cannedResponseId,
    },
  });

  return { success: true };
}
