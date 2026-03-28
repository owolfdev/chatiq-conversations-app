"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ConversationBookingSummaryStrip } from "@/components/conversations/booking-summary-strip";
import type { InboxCounts } from "@/types/inbox";

export function HomeInboxStats() {
  const [counts, setCounts] = useState<InboxCounts | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const countsRes = await fetch("/api/inbox-counts", {
          credentials: "include",
        });

        if (cancelled) return;

        if (countsRes.ok) {
          const payload = (await countsRes.json()) as InboxCounts;
          setCounts(payload);
        } else {
          setLoadError(true);
        }
      } catch {
        if (!cancelled) setLoadError(true);
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!ready) {
    return (
      <div className="mt-10 w-full max-w-2xl rounded-2xl border border-dashed border-muted px-4 py-8 text-center text-sm text-muted-foreground">
        Loading inbox overview…
      </div>
    );
  }

  if (loadError && !counts) {
    return (
      <p className="mt-8 text-center text-sm text-muted-foreground">
        Could not load inbox stats.{" "}
        <Link
          href="/conversations"
          className="text-primary underline-offset-4 hover:underline"
        >
          Open conversations
        </Link>{" "}
        to retry.
      </p>
    );
  }

  const inbox = counts ?? {
    openConversations: 0,
    pendingBookings: 0,
    upcomingConfirmedBookings: 0,
    unscheduledBookings: 0,
  };

  return (
    <div className="mt-12 w-full max-w-2xl space-y-8 text-left">
      <section className="rounded-2xl border border-border bg-card/60 p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Conversations
          </h2>
          <Link
            href="/conversations"
            className="text-xs font-medium text-primary underline-offset-4 hover:underline"
          >
            Open inbox
          </Link>
        </div>
        <ConversationBookingSummaryStrip
          openCount={inbox.openConversations}
          upcomingBookingsCount={inbox.upcomingConfirmedBookings}
          pendingBookingsCount={inbox.pendingBookings}
          needsScheduleCount={inbox.unscheduledBookings}
          linkedConversationCount={0}
          showLinkedNote={false}
        />
      </section>
    </div>
  );
}
