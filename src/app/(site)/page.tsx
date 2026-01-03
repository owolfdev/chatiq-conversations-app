import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { createClient } from "@/utils/supabase/server";
import { Button } from "@/components/ui/button";
import { getAppUrl } from "@/lib/email/get-app-url";

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

  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto flex w-full max-w-2xl flex-col items-center px-6 py-24 text-center">
        <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-emerald-600 text-white shadow-md">
          <Image
            src="/icon-512.png"
            alt="Chatiq logo"
            width={56}
            height={56}
            className="h-full w-full object-cover"
          />
        </div>
        <h1 className="mt-6 text-5xl font-extrabold tracking-tight sm:text-6xl">
          Chatiq Inbox
        </h1>
        <p className="mt-4 text-base text-muted-foreground sm:text-lg">
          A dedicated, mobile-first view of active customer conversations. Jump
          straight into the threads that need you.
        </p>
        <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row">
          <Button
            asChild
            size="lg"
            className="bg-emerald-600 text-white hover:bg-emerald-700"
          >
            <Link href={conversationsHref}>Open Conversations</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
