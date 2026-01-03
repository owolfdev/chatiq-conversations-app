"use client";

import Link from "next/link";
import { Bot } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const showMessage = process.env.NODE_ENV === "development";

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-4 pt-0 pb-24">
      <div className="flex flex-col items-center space-y-6 text-center">
        <div className="flex items-center gap-2">
          <Bot className="h-8 w-8 text-emerald-500" />
          <span className="text-2xl font-bold">ChatIQ Inbox</span>
        </div>

        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">
            Something went wrong
          </h1>
          <p className="text-muted-foreground text-base">
            The app hit a snag. Please try again in a moment.
          </p>
        </div>

        {showMessage && error?.message ? (
          <p className="text-xs text-muted-foreground">{error.message}</p>
        ) : null}

        <div className="flex flex-col gap-4 pt-2 sm:flex-row">
          <Button
            onClick={() => reset()}
            className="bg-emerald-500 hover:bg-emerald-600"
          >
            Try again
          </Button>
          <Button asChild variant="outline">
            <Link href="/">Go to Home</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
