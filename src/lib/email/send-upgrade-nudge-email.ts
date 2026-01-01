import { randomBytes } from "crypto";
import { sendEmail } from "@/lib/email/resend";
import { renderUpgradeNudgeEmail } from "@/lib/email/templates/upgrade-nudge";
import { getAppUrl } from "@/lib/email/get-app-url";
import { createAdminClient } from "@/utils/supabase/admin";
import { buildMarketingUnsubscribeUrls } from "@/lib/email/unsubscribe";

export interface SendUpgradeNudgeEmailInput {
  email: string;
  userName?: string;
  currentPlan: string;
}

export async function sendUpgradeNudgeEmail({
  email,
  userName,
  currentPlan,
}: SendUpgradeNudgeEmailInput) {
  const appUrl = getAppUrl();
  const upgradeUrl = `${appUrl}/dashboard/billing`;
  const supabase = createAdminClient();

  const { data: profile } = await supabase
    .from("bot_user_profiles")
    .select("id, marketing_emails, unsubscribe_token")
    .eq("email", email)
    .maybeSingle();

  if (profile?.marketing_emails === false) {
    return;
  }

  let unsubscribeToken = profile?.unsubscribe_token ?? null;

  if (profile && !unsubscribeToken) {
    unsubscribeToken = randomBytes(16).toString("hex");
    const { error } = await supabase
      .from("bot_user_profiles")
      .update({ unsubscribe_token: unsubscribeToken })
      .eq("id", profile.id);

    if (error) {
      console.error(
        "[email] Failed to store unsubscribe token for user",
        error
      );
      unsubscribeToken = null;
    }
  }

  const unsubscribeUrls = unsubscribeToken
    ? buildMarketingUnsubscribeUrls({ email, token: unsubscribeToken })
    : null;

  const { subject, html, text } = renderUpgradeNudgeEmail({
    userName,
    currentPlan: currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1),
    upgradeUrl,
    unsubscribeUrl: unsubscribeUrls?.pageUrl,
  });

  await sendEmail({
    to: email,
    subject,
    html,
    text,
    headers: unsubscribeUrls
      ? {
          "List-Unsubscribe": `<${unsubscribeUrls.apiUrl}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        }
      : undefined,
  });
}
