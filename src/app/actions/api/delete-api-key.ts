// src/app/actions/api/delete-api-key.ts
"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { AUDIT_ACTION, AUDIT_RESOURCE } from "@/lib/audit/constants";
import { logAuditEvent } from "@/lib/audit/log-event";

export async function deleteApiKey(id: string) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "Unauthorized. Please log in." };
  }

  // Get API key details before deletion (for audit log)
  const { data: apiKeyData, error: fetchError } = await supabase
    .from("bot_api_keys")
    .select("id, bot_id, team_id, label")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !apiKeyData) {
    return {
      success: false,
      error: "API key not found or you don't have permission to delete it.",
    };
  }

  // Get bot details for audit log
  const { data: bot } = await supabase
    .from("bot_bots")
    .select("name, slug")
    .eq("id", apiKeyData.bot_id)
    .single();

  // Delete the API key
  const { error: deleteError } = await supabase
    .from("bot_api_keys")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (deleteError) {
    return {
      success: false,
      error: `Failed to delete API key: ${deleteError.message}`,
    };
  }

  await logAuditEvent({
    teamId: apiKeyData.team_id,
    userId: user.id,
    action: AUDIT_ACTION.DELETE,
    resourceType: AUDIT_RESOURCE.API_KEY,
    resourceId: id,
    metadata: {
      bot_id: apiKeyData.bot_id,
      bot_slug: bot?.slug || null,
      bot_name: bot?.name || null,
      label: apiKeyData.label || null,
    },
  });

  // Log to user activity log
  const { error: activityError } = await supabase
    .from("bot_user_activity_logs")
    .insert({
      user_id: user.id,
      team_id: apiKeyData.team_id,
      type: "api_key_deleted",
      message: `Deleted API key${apiKeyData.label ? ` "${apiKeyData.label}"` : ""} for bot "${bot?.name || "Unknown"}"`,
      metadata: {
        bot_id: apiKeyData.bot_id,
        bot_slug: bot?.slug || null,
        api_key_id: id,
        label: apiKeyData.label || null,
      },
    });

  if (activityError) {
    console.error("Failed to log API key deletion to activity log:", activityError);
    // Don't fail the request if activity logging fails
  }

  revalidatePath("/dashboard/api-keys");

  return { success: true };
}
