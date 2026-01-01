// src/app/actions/api/create-shared-public-api-key.ts
"use server";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { AUDIT_ACTION, AUDIT_RESOURCE } from "@/lib/audit/constants";
import { logAuditEvent } from "@/lib/audit/log-event";

/**
 * Creates a system-level shared public API key that can access ANY public bot
 * across ALL teams (for platform admin use).
 * - bot_id = NULL (shared key)
 * - team_id = NULL (system key, works across all teams)
 * - Can only be created by platform admins
 * - Returns the plain key once (for one-time display)
 */
export async function createSystemSharedPublicApiKey(input?: {
  label?: string;
}) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "Unauthorized. Please log in." };
  }

  // Check if user is platform admin
  const { data: profile, error: profileError } = await supabase
    .from("bot_user_profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile || profile.role !== "admin") {
    return {
      success: false,
      error: "Only platform admins can create system shared API keys.",
    };
  }

  // Generate API key: sk_system_ + 32 random hex characters
  const randomToken = randomBytes(32).toString("hex");
  const plainKey = `sk_system_${randomToken}`;

  // Hash the key with bcrypt
  const hashedKey = await bcrypt.hash(plainKey, 10);

  // Use admin client to bypass RLS (system keys don't belong to a team)
  const adminClient = createAdminClient();

  // Store the hashed key with bot_id = NULL and team_id = NULL (system-level shared key)
  const { data: apiKeyRecord, error: insertError } = await adminClient
    .from("bot_api_keys")
    .insert({
      bot_id: null, // NULL = shared public key
      user_id: user.id,
      team_id: null, // NULL = system key (works across all teams)
      key: hashedKey,
      label: input?.label || "System Shared Public API Key",
      active: true,
    })
    .select("id")
    .single();

  if (insertError) {
    return {
      success: false,
      error: `Failed to create system shared public API key: ${insertError.message}`,
    };
  }

  // Log to audit (no team_id for system keys)
  await logAuditEvent({
    teamId: null, // System-level action
    userId: user.id,
    action: AUDIT_ACTION.CREATE,
    resourceType: AUDIT_RESOURCE.API_KEY,
    resourceId: apiKeyRecord.id,
    metadata: {
      key_type: "system_shared_public",
      label: input?.label || "System Shared Public API Key",
    },
  });

  // Log to user activity log
  const { error: activityError } = await adminClient
    .from("bot_user_activity_logs")
    .insert({
      user_id: user.id,
      team_id: null, // System-level action
      type: "api_key_created",
      message: `Created system shared public API key "${
        input?.label || "System Shared Public API Key"
      }"`,
      metadata: {
        api_key_id: apiKeyRecord.id,
        key_type: "system_shared_public",
        label: input?.label || null,
      },
    });

  if (activityError) {
    console.error(
      "Failed to log system API key creation to activity log:",
      activityError
    );
  }

  revalidatePath("/dashboard/api-keys");

  // Return the plain key once (this is the only time it will be shown)
  return {
    success: true,
    apiKey: plainKey, // Return plain key for one-time display
    id: apiKeyRecord.id,
  };
}
