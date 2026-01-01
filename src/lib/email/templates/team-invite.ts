// src/lib/email/templates/team-invite.ts
// Simple HTML/text template for team invitation emails

interface TeamInviteTemplateData {
  teamName: string;
  inviterName: string;
  inviteUrl: string;
  role: "admin" | "member";
  expiresAt?: Date;
}

export function renderTeamInviteEmail({
  teamName,
  inviterName,
  inviteUrl,
  role,
  expiresAt,
}: TeamInviteTemplateData) {
  const subject = `${inviterName} invited you to join ${teamName}`;
  const expiration =
    expiresAt instanceof Date
      ? expiresAt.toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : "7 days";

  const html = `
    <div style="font-family: Arial, Helvetica, sans-serif; color: #0f172a; line-height: 1.5;">
      <h2 style="margin-bottom: 12px;">You're invited to join <strong>${teamName}</strong></h2>
      <p style="margin: 0 0 16px;">${inviterName} has invited you to join their team as a <strong>${role}</strong>.</p>
      <p style="margin: 0 0 24px;">Click the button below to accept the invitation and start collaborating.</p>
      <p style="text-align: center; margin-bottom: 24px;">
        <a href="${inviteUrl}" style="background-color: #059669; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">
          Accept Invitation
        </a>
      </p>
      <p style="margin: 0 0 8px; font-size: 14px; color: #475569;">
        This invitation expires on <strong>${expiration}</strong>. If you did not expect this email, you can safely ignore it.
      </p>
    </div>
  `;

  const text = [
    `You're invited to join ${teamName}`,
    `${inviterName} has invited you to join their team as a ${role}.`,
    `Accept the invitation: ${inviteUrl}`,
    `This invitation expires on ${expiration}.`,
  ].join("\n\n");

  return {
    subject,
    html,
    text,
  };
}

