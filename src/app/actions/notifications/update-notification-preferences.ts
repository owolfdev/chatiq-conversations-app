"use server";

import { createClient } from "@/utils/supabase/server";
import { getUserTeamId } from "@/lib/teams/get-user-team-id";

interface NotificationPreferencesInput {
  pushEnabled: boolean;
  notifyConversations: boolean;
  notifyBookings: boolean;
}

export async function updateNotificationPreferences({
  pushEnabled,
  notifyConversations,
  notifyBookings,
}: NotificationPreferencesInput) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "Unauthorized" };
  }

  const teamId = await getUserTeamId(user.id);
  if (!teamId) {
    return { success: false, error: "No team found" };
  }

  const { error } = await supabase
    .from("bot_notification_preferences")
    .upsert(
      {
        user_id: user.id,
        team_id: teamId,
        push_enabled: pushEnabled,
        notify_conversations: notifyConversations,
        notify_bookings: notifyBookings,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,team_id" }
    );

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
