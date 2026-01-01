"use client";

import { ArrowUpRight, InfoIcon } from "lucide-react";
import Link from "next/link";

export function SmtpMessage() {
  // Hide SMTP message if:
  // 1. Explicitly hidden via NEXT_PUBLIC_HIDE_SMTP_MESSAGE env var (set to "true")
  // 2. In production environment (where SMTP is typically configured)
  //
  // To hide this message after configuring SMTP in Supabase, add to your .env.local:
  // NEXT_PUBLIC_HIDE_SMTP_MESSAGE=true
  //
  // Note: The message is static because Supabase doesn't expose SMTP config status
  // via the client API. Once you've configured SMTP in the Supabase dashboard,
  // you can hide this message using the env var above.
  const hideViaEnv = process.env.NEXT_PUBLIC_HIDE_SMTP_MESSAGE === "true";

  // Check if we're in production by checking if hostname is not localhost
  const isProduction =
    typeof window !== "undefined" &&
    !window.location.hostname.includes("localhost") &&
    !window.location.hostname.includes("127.0.0.1");

  if (hideViaEnv || isProduction) {
    return null;
  }

  return (
    <div className="bg-muted/50 px-5 py-3 border rounded-md flex gap-4">
      <InfoIcon size={16} className="mt-0.5" />
      <div className="flex flex-col gap-1">
        <small className="text-sm text-secondary-foreground">
          <strong> Note:</strong> Emails are rate limited. Enable Custom SMTP to
          increase the rate limit.
        </small>
        <div>
          <Link
            href="https://supabase.com/docs/guides/auth/auth-smtp"
            target="_blank"
            className="text-primary/50 hover:text-primary flex items-center text-sm gap-1"
          >
            Learn more <ArrowUpRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
}
