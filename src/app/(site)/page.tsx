import Link from "next/link";
import type { Metadata } from "next";
import { MessageSquare, CalendarDays } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { Button } from "@/components/ui/button";
import { getAppUrl } from "@/lib/email/get-app-url";
import { InstallCta } from "@/components/pwa/install-cta";

const appUrl = getAppUrl();

export const metadata: Metadata = {
  title: { absolute: "ChatIQ Inbox" },
  description: "A focused conversations inbox for ChatIQ.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "ChatIQ Inbox",
    description: "A focused conversations inbox for ChatIQ.",
    url: `${appUrl}/`,
    siteName: "ChatIQ Inbox",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "ChatIQ Inbox",
    description: "A focused conversations inbox for ChatIQ.",
  },
};

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const conversationsHref = user ? "/conversations" : "/sign-in";
  const bookingsHref = user ? "/bookings" : "/sign-in";

  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto flex w-full max-w-2xl flex-col items-center px-6 py-24 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-md">
          <MessageSquare className="h-7 w-7" />
        </div>
        <h1 className="mt-6 text-5xl font-extrabold tracking-tight sm:text-6xl">
          ChatIQ Inbox
        </h1>
        <p className="mt-4 text-base text-muted-foreground sm:text-lg">
          A dedicated, mobile-first view of active customer conversations. Jump
          straight into the threads that need you.
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          ChatIQ Inbox is a PWA intended to be used after installation.{" "}
          <Link
            href="/install"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            View install steps
          </Link>
          .
        </p>
        <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row">
          <Button
            asChild
            size="lg"
            className="bg-emerald-600 text-white hover:bg-emerald-700"
          >
            <Link href={conversationsHref} className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              <span>Open Conversations</span>
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href={bookingsHref} className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              <span>Open Bookings</span>
            </Link>
          </Button>
          <InstallCta />
        </div>
      </section>
    </main>
  );
}
