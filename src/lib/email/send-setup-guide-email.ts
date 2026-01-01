import { sendEmail } from "@/lib/email/resend";
import { renderSetupGuideEmail } from "@/lib/email/templates/setup-guide";
import { getAppUrl } from "@/lib/email/get-app-url";

export interface SendSetupGuideEmailInput {
  email: string;
  userName?: string;
  botName: string;
}

export async function sendSetupGuideEmail({
  email,
  userName,
  botName,
}: SendSetupGuideEmailInput) {
  const appUrl = getAppUrl();
  const dashboardUrl = `${appUrl}/dashboard`;
  const docsUrl = `${appUrl}/docs/quick-start`;

  const { subject, html, text } = renderSetupGuideEmail({
    userName,
    botName,
    dashboardUrl,
    docsUrl,
  });

  await sendEmail({
    to: email,
    subject,
    html,
    text,
  });
}
