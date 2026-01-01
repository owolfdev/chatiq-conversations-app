// src/lib/email/triggers/upgrade-nudge-trigger.ts
// Utility function to send upgrade nudge emails to free plan users
// Can be called from:
// - When free users hit message/storage limits
// - Scheduled jobs (e.g., after X days of free plan usage)
// - When free users try to use premium features

import { createAdminClient } from "@/utils/supabase/admin";
import { sendUpgradeNudgeEmail } from "@/lib/email/send-upgrade-nudge-email";

export interface SendUpgradeNudgeToFreeUsersOptions {
  userId?: string; // Send to specific user
  teamId?: string; // Send to team owner
  // If neither provided, could send to all free users (for scheduled jobs)
}

/**
 * Send upgrade nudge email to free plan users
 * 
 * @param options - Options for who to send the email to
 * @returns Promise that resolves when email is sent (or fails silently)
 */
export async function sendUpgradeNudgeToFreeUsers(
  options: SendUpgradeNudgeToFreeUsersOptions = {}
): Promise<void> {
  const supabase = createAdminClient();

  try {
    let userProfile: { email: string; full_name: string | null; plan: string } | null = null;

    if (options.userId) {
      // Get user profile by user ID
      const { data } = await supabase
        .from("bot_user_profiles")
        .select("email, full_name, plan")
        .eq("id", options.userId)
        .single();
      userProfile = data;
    } else if (options.teamId) {
      // Get team owner profile
      const { data: team } = await supabase
        .from("bot_teams")
        .select("owner_id, plan")
        .eq("id", options.teamId)
        .single();

      if (team && team.plan === "free") {
        const { data } = await supabase
          .from("bot_user_profiles")
          .select("email, full_name, plan")
          .eq("id", team.owner_id)
          .single();
        userProfile = data;
      }
    }

    // Only send if user is on free plan
    if (userProfile && userProfile.plan === "free" && userProfile.email) {
      await sendUpgradeNudgeEmail({
        email: userProfile.email,
        userName: userProfile.full_name || undefined,
        currentPlan: "free",
      });
    }
  } catch (error) {
    console.error("Failed to send upgrade nudge email:", error);
    // Fail silently - don't throw errors for email sending
  }
}

