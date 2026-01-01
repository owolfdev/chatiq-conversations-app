// src/lib/email/resend.ts
// Lightweight Resend API wrapper for transactional emails

import { env } from "@/lib/env";

interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
  headers?: Record<string, string>;
}

interface ResendResponse {
  id: string;
}

export async function sendEmail({
  to,
  subject,
  html,
  text,
  from,
  replyTo,
  headers = {},
}: SendEmailOptions): Promise<ResendResponse> {
  if (!env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not configured");
  }

  const recipients = Array.isArray(to) ? to : [to];
  if (recipients.length === 0) {
    throw new Error("No recipients specified for email");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      ...headers,
    },
    body: JSON.stringify({
      from: from ?? env.INVITE_EMAIL_FROM,
      to: recipients,
      subject,
      html,
      text,
      reply_to: replyTo,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Failed to send email via Resend: ${response.status} ${response.statusText} - ${body}`
    );
  }

  return response.json();
}

