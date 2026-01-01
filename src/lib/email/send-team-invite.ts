import { sendEmail } from "@/lib/email/resend";
import { renderTeamInviteEmail } from "@/lib/email/templates/team-invite";

export interface SendTeamInviteEmailInput {
  email: string;
  teamName: string;
  inviterName: string;
  inviteUrl: string;
  role: "admin" | "member";
  expiresAt?: string | Date | null;
}

export async function sendTeamInviteEmail({
  email,
  teamName,
  inviterName,
  inviteUrl,
  role,
  expiresAt,
}: SendTeamInviteEmailInput) {
  const parsedExpiry =
    typeof expiresAt === "string" ? new Date(expiresAt) : expiresAt ?? undefined;

  const { subject, html, text } = renderTeamInviteEmail({
    teamName,
    inviterName,
    inviteUrl,
    role,
    expiresAt: parsedExpiry,
  });

  await sendEmail({
    to: email,
    subject,
    html,
    text,
  });
}

