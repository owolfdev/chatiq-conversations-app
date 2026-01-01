// src/app/api/admin/test-emails/route.ts
import { NextResponse } from "next/server";
import { sendWelcomeEmail } from "@/lib/email/send-welcome-email";
import { sendSetupGuideEmail } from "@/lib/email/send-setup-guide-email";
import { sendUpgradeNudgeEmail } from "@/lib/email/send-upgrade-nudge-email";
import { sendTeamInviteEmail } from "@/lib/email/send-team-invite";
import { sendEmail } from "@/lib/email/resend";

type EmailType =
  | "welcome"
  | "setup-guide"
  | "upgrade-nudge"
  | "team-invite"
  | "contact-reply";

type RequestBody = {
  type: EmailType;
  email?: string;
  payload?: Record<string, any>;
};

const TEST_EMAIL_API_KEY = process.env.TEST_EMAIL_API_KEY;
const DEFAULT_TEST_RECIPIENT = process.env.TEST_EMAIL_DEFAULT_TO;

export async function POST(req: Request) {
  if (!TEST_EMAIL_API_KEY) {
    return NextResponse.json(
      {
        error:
          "TEST_EMAIL_API_KEY is not configured. Set it to enable test email sending.",
      },
      { status: 500 }
    );
  }

  const apiKey = req.headers.get("x-test-email-key");
  if (apiKey !== TEST_EMAIL_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: RequestBody;
  try {
    body = await req.json();
  } catch (error) {
    return NextResponse.json(
      { error: "Invalid JSON payload" },
      { status: 400 }
    );
  }

  const { type, email, payload = {} } = body;
  const to = email || DEFAULT_TEST_RECIPIENT;

  if (!type) {
    return NextResponse.json({ error: "type is required" }, { status: 400 });
  }

  if (!to) {
    return NextResponse.json(
      {
        error:
          "No recipient provided. Pass `email` in the body or configure TEST_EMAIL_DEFAULT_TO.",
      },
      { status: 400 }
    );
  }

  try {
    switch (type) {
      case "welcome":
        await sendWelcomeEmail({
          email: to,
          userName: payload.userName ?? "Test User",
        });
        break;
      case "setup-guide":
        await sendSetupGuideEmail({
          email: to,
          userName: payload.userName ?? "Test User",
          botName: payload.botName ?? "My First Bot",
        });
        break;
      case "upgrade-nudge":
        await sendUpgradeNudgeEmail({
          email: to,
          userName: payload.userName ?? "Test User",
          currentPlan: payload.currentPlan ?? "free",
        });
        break;
      case "team-invite":
        await sendTeamInviteEmail({
          email: to,
          teamName: payload.teamName ?? "ChatIQ Team",
          inviterName: payload.inviterName ?? "Admin",
          inviteUrl:
            payload.inviteUrl ??
            `${
              process.env.NEXT_PUBLIC_APP_URL ?? "http://chatiq.io"
            }/team/invite/sample`,
          role: payload.role ?? "member",
          expiresAt:
            payload.expiresAt ??
            new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        });
        break;
      case "contact-reply": {
        const originalSubject =
          payload.originalSubject ?? "Thanks for reaching out";
        const replyText =
          payload.replyText ??
          "Appreciate your message! This is a sample reply from the ChatIQ team.";
        const originalMessage =
          payload.originalMessage ??
          "This is a placeholder for the original contact message.";
        const html = `
          <!DOCTYPE html>
          <html>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <h2 style="margin-top: 0; color: #10b981;">Re: ${originalSubject}</h2>
              </div>
              
              <div style="margin-bottom: 30px;">
                <p>Hi ${payload.toName ?? "there"},</p>
                <div style="background-color: #f1f5f9; padding: 15px; border-left: 4px solid #10b981; margin: 20px 0;">
                  ${replyText
                    .split("\n")
                    .map(
                      (line: string) =>
                        `<p style="margin: 0 0 10px 0;">${line}</p>`
                    )
                    .join("")}
                </div>
              </div>
              
              <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 30px; color: #64748b; font-size: 14px;">
                <p style="margin: 0 0 10px 0;"><strong>Original message:</strong></p>
                <div style="background-color: #f8fafc; padding: 15px; border-radius: 4px;">
                  <p style="margin: 0 0 10px 0;"><strong>Subject:</strong> ${originalSubject}</p>
                  <p style="margin: 0; white-space: pre-wrap;">${originalMessage}</p>
                </div>
              </div>
              
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; color: #94a3b8; font-size: 12px;">
                <p style="margin: 0;">This is an automated reply from ChatIQ Support</p>
                <p style="margin: 5px 0 0 0;">support@chatiq.io</p>
              </div>
            </body>
          </html>
        `;

        const text = `
Re: ${originalSubject}

Hi ${payload.toName ?? "there"},

${replyText}

---
Original message:
Subject: ${originalSubject}

${originalMessage}

---
This is an automated reply from ChatIQ Support
support@chatiq.io
        `.trim();

        await sendEmail({
          to,
          subject: `Re: ${originalSubject}`,
          html,
          text,
          from: "ChatIQ Support <support@chatiq.io>",
          replyTo: "support@chatiq.io",
        });
        break;
      }
      default:
        return NextResponse.json(
          { error: `Unsupported type: ${type}` },
          { status: 400 }
        );
    }

    return NextResponse.json({ success: true, type, to });
  } catch (error) {
    console.error("Failed to send test email", error);
    return NextResponse.json(
      {
        error: "Failed to send email",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
