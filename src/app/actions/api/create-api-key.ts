"use server";

import { createClient } from "@/utils/supabase/server";
import { getUserTeamId } from "@/lib/teams/get-user-team-id";
import { revalidatePath } from "next/cache";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { AUDIT_ACTION, AUDIT_RESOURCE } from "@/lib/audit/constants";
import { logAuditEvent } from "@/lib/audit/log-event";

interface CreateApiKeyInput {
  botId: string;
  label?: string;
  allowedDomains?: string[]; // Array of allowed domains (e.g., ['example.com', 'www.example.com'])
  isWidgetOnly?: boolean; // Flag to mark key as widget-only
}

/**
 * Creates a new API key for a bot.
 * - Generates a secure key: sk_live_ + 32 random hex characters
 * - Hashes the key with bcrypt before storing
 * - Returns the plain key once (for one-time display)
 * - Logs creation to audit log
 */
export async function createApiKey(input: CreateApiKeyInput) {
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
  const { data: bot, error: botError } = await supabase
    .from("bot_bots")
    .select("id, name, slug, team_id")
    .eq("id", input.botId)
    .single();

  if (botError || !bot) {
    return {
      success: false,
      error:
        "Bot not found or you don't have permission to create keys for it.",
    };
  }

  // Verify team ownership (additional security check)
  if (bot.team_id !== teamId) {
    return {
      success: false,
      error: "You don't have permission to create keys for this bot.",
    };
  }

  // Generate API key: sk_live_ + 32 random hex characters (64 hex chars = 32 bytes)
  const randomToken = randomBytes(32).toString("hex");
  const plainKey = `sk_live_${randomToken}`;

  // Hash the key with bcrypt (cost factor 10-12)
  const hashedKey = await bcrypt.hash(plainKey, 10);

  // Normalize and validate allowed domains
  let allowedDomains: string[] | null = null;
  if (input.allowedDomains && input.allowedDomains.length > 0) {
    // Normalize domains: remove protocol, trailing slashes, and convert to lowercase
    allowedDomains = input.allowedDomains
      .map((domain) => {
        const normalized = domain.trim().toLowerCase();
        // Remove protocol if present
        return normalized.replace(/^https?:\/\//, '').replace(/\/$/, '');
      })
      .filter((domain) => domain.length > 0);
    
    if (allowedDomains.length === 0) {
      allowedDomains = null;
    }
  }

  // Store the hashed key in the database
  const { data: apiKeyRecord, error: insertError } = await supabase
    .from("bot_api_keys")
    .insert({
      bot_id: input.botId,
      user_id: user.id,
      team_id: teamId,
      key: hashedKey, // Store hash, not plain key
      label: input.label || null,
      active: true,
      allowed_domains: allowedDomains,
      is_widget_only: input.isWidgetOnly || false,
    })
    .select("id")
    .single();

  if (insertError) {
    return {
      success: false,
      error: `Failed to create API key: ${insertError.message}`,
    };
  }

  await logAuditEvent({
    teamId,
    userId: user.id,
    action: AUDIT_ACTION.CREATE,
    resourceType: AUDIT_RESOURCE.API_KEY,
    resourceId: apiKeyRecord.id,
    metadata: {
      bot_id: input.botId,
      bot_slug: bot.slug,
      bot_name: bot.name,
      label: input.label || null,
    },
  });

  // Log to user activity log
  const { error: activityError } = await supabase
    .from("bot_user_activity_logs")
    .insert({
      user_id: user.id,
      team_id: teamId,
      type: "api_key_created",
      message: `Created API key for bot "${bot.name}"`,
      metadata: {
        bot_id: input.botId,
        bot_slug: bot.slug,
        api_key_id: apiKeyRecord.id,
        label: input.label || null,
      },
    });

  if (activityError) {
    console.error(
      "Failed to log API key creation to activity log:",
      activityError
    );
    // Don't fail the request if activity logging fails
  }

  revalidatePath("/dashboard/api-keys");

  // Return the plain key once (this is the only time it will be shown)
  return {
    success: true,
    apiKey: plainKey, // Return plain key for one-time display
    id: apiKeyRecord.id,
  };
}
