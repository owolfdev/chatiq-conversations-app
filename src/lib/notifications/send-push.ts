import webpush from "web-push";
import { createAdminClient } from "@/utils/supabase/admin";

const DEFAULT_INBOX_URL = "https://inbox.chatiq.io";
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT =
  process.env.VAPID_SUBJECT || "mailto:support@chatiq.io";

let vapidConfigured = false;

function ensureVapidConfigured() {
  if (vapidConfigured) return true;
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return false;
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  vapidConfigured = true;
  return true;
}

type PushEventType = "conversation" | "booking";

interface SendTeamPushNotificationInput {
  teamId: string;
  type: PushEventType;
  title: string;
  body: string;
  url?: string;
}

export async function sendTeamPushNotification({
  teamId,
  type,
  title,
  body,
  url,
}: SendTeamPushNotificationInput) {
  if (!ensureVapidConfigured()) {
    console.warn("Push notifications skipped: missing VAPID keys.");
    return;
  }

  const supabase = createAdminClient();
  const preferenceColumn =
    type === "booking" ? "notify_bookings" : "notify_conversations";

  const { data: preferences, error: prefsError } = await supabase
    .from("bot_notification_preferences")
    .select(`user_id, push_enabled, ${preferenceColumn}`)
    .eq("team_id", teamId)
    .eq("push_enabled", true)
    .eq(preferenceColumn, true);

  if (prefsError) {
    console.error("Failed to load notification preferences:", prefsError);
    return;
  }

  const userIds = (preferences ?? [])
    .map((pref) => pref.user_id)
    .filter(Boolean);

  if (userIds.length === 0) return;

  const { data: subscriptions, error: subsError } = await supabase
    .from("bot_push_subscriptions")
    .select("id, endpoint, p256dh, auth, user_id")
    .eq("team_id", teamId)
    .in("user_id", userIds)
    .is("disabled_at", null);

  if (subsError) {
    console.error("Failed to load push subscriptions:", subsError);
    return;
  }

  const inboxBaseUrl = process.env.NEXT_PUBLIC_INBOX_URL || DEFAULT_INBOX_URL;
  const fallbackUrl =
    type === "booking"
      ? `${inboxBaseUrl}/dashboard/bookings`
      : `${inboxBaseUrl}/conversations`;

  const payload = JSON.stringify({
    title,
    body,
    url: url || fallbackUrl,
    tag: `chatiq-${type}`,
  });

  await Promise.all(
    (subscriptions ?? []).map(async (subscription) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth,
            },
          },
          payload
        );
      } catch (error) {
        const statusCode =
          typeof error === "object" && error && "statusCode" in error
            ? (error as { statusCode?: number }).statusCode
            : undefined;

        if (statusCode === 404 || statusCode === 410) {
          await supabase
            .from("bot_push_subscriptions")
            .update({ disabled_at: new Date().toISOString() })
            .eq("id", subscription.id);
          return;
        }

        console.error("Failed to send push notification:", error);
      }
    })
  );
}

