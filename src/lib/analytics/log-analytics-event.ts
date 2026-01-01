import { createAdminClient } from "@/utils/supabase/admin";

interface AnalyticsEventInput {
  teamId: string;
  botId?: string | null;
  conversationId?: string | null;
  userId?: string | null;
  eventType: string;
  metadata?: Record<string, unknown> | null;
}

export async function logAnalyticsEvent({
  teamId,
  botId,
  conversationId,
  userId,
  eventType,
  metadata,
}: AnalyticsEventInput): Promise<void> {
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("analytics_events").insert({
      team_id: teamId,
      bot_id: botId ?? null,
      conversation_id: conversationId ?? null,
      user_id: userId ?? null,
      event_type: eventType,
      metadata: metadata ?? null,
    });

    if (error) {
      console.error("Failed to log analytics event:", error);
    }
  } catch (err) {
    console.error("Failed to log analytics event:", err);
  }
}
