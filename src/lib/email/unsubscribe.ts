import { createAdminClient } from "@/utils/supabase/admin";
import { getAppUrl } from "@/lib/email/get-app-url";

interface UnsubscribeInput {
  email: string;
  token: string;
}

export function buildMarketingUnsubscribeUrls({ email, token }: UnsubscribeInput) {
  const baseUrl = getAppUrl().replace(/\/$/, "");
  const params = new URLSearchParams({ email, token });

  return {
    pageUrl: `${baseUrl}/unsubscribe?${params.toString()}`,
    apiUrl: `${baseUrl}/api/unsubscribe?${params.toString()}`,
  };
}

export async function unsubscribeMarketingEmail({
  email,
  token,
}: UnsubscribeInput): Promise<{ success: boolean; error?: string }> {
  if (!email || !token) {
    return { success: false, error: "Missing email or token." };
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("bot_user_profiles")
    .update({ marketing_emails: false })
    .eq("email", email)
    .eq("unsubscribe_token", token)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("[unsubscribe] Failed to update marketing preference", error);
    return { success: false, error: "Unable to update preferences." };
  }

  if (!data) {
    return { success: false, error: "Invalid or expired unsubscribe link." };
  }

  return { success: true };
}
