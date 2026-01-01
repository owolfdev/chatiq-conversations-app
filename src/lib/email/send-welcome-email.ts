import { sendEmail } from "@/lib/email/resend";
import { renderWelcomeEmail } from "@/lib/email/templates/welcome";
import { getAppUrl } from "@/lib/email/get-app-url";

export interface SendWelcomeEmailInput {
  email: string;
  userName?: string;
}

export async function sendWelcomeEmail({
  email,
  userName,
}: SendWelcomeEmailInput) {
  const appUrl = getAppUrl();
  const dashboardUrl = `${appUrl}/dashboard`;

  const { subject, html, text } = renderWelcomeEmail({
    userName,
    dashboardUrl,
  });

  await sendEmail({
    to: email,
    subject,
    html,
    text,
  });
}
