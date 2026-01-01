// src/app/actions/contact/send-contact-message-reply.ts
"use server";

import { sendEmail } from "@/lib/email/resend";
import { updateContactMessageStatus } from "./update-contact-message-status";

export async function sendContactMessageReply({
  messageId,
  toEmail,
  toName,
  originalSubject,
  originalMessage,
  replyText,
}: {
  messageId: string;
  toEmail: string;
  toName: string;
  originalSubject: string;
  originalMessage: string;
  replyText: string;
}) {
  // Send the email
  const subject = `Re: ${originalSubject}`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h2 style="margin-top: 0; color: #10b981;">Re: ${originalSubject}</h2>
        </div>
        
        <div style="margin-bottom: 30px;">
          <p>Hi ${toName},</p>
          <div style="background-color: #f1f5f9; padding: 15px; border-left: 4px solid #10b981; margin: 20px 0;">
            ${replyText
              .split("\n")
              .map((line) => `<p style="margin: 0 0 10px 0;">${line}</p>`)
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

Hi ${toName},

${replyText}

---
Original message:
Subject: ${originalSubject}

${originalMessage}

---
This is an automated reply from ChatIQ Support
support@chatiq.io
  `.trim();

  try {
    await sendEmail({
      to: toEmail,
      subject,
      html,
      text,
      from: "ChatIQ Support <support@chatiq.io>",
      replyTo: "support@chatiq.io",
    });

    // Update message status to "replied"
    await updateContactMessageStatus(messageId, "replied");

    return { success: true };
  } catch (error) {
    console.error("Failed to send reply email:", error);
    throw new Error(
      error instanceof Error
        ? error.message
        : "Failed to send reply email. Please try again."
    );
  }
}
