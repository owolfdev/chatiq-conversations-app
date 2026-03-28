"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { ConversationBookingSummaryStrip } from "@/components/conversations/booking-summary-strip";
import {
  HOME_TOPIC_SHORTCUTS,
  homeShortcutCanonicalTopic,
} from "@/lib/conversations/home-topic-shortcuts";
import { getTopicBadgeClass } from "@/lib/conversations/topic-display";
import { cn } from "@/lib/utils";
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
          cache: "no-store",
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
    topicShortcutCounts: {},
  };

  const topicCounts = inbox.topicShortcutCounts ?? {};

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

      <section className="rounded-2xl border border-border bg-card/60 p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Browse by topic
          </h2>
          <Link
            href="/conversations"
            className="text-xs font-medium text-primary underline-offset-4 hover:underline"
          >
            All conversations
          </Link>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Counts group legacy + current topic labels. Opens the inbox with a
          server-side filter (up to 50 threads per load).
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {HOME_TOPIC_SHORTCUTS.map((shortcut) => {
            const n = topicCounts[shortcut.id] ?? 0;
            const canonical = homeShortcutCanonicalTopic(shortcut);
            return (
              <Link
                key={shortcut.id}
                href={`/conversations?topic=${encodeURIComponent(canonical)}`}
                className={cn(
                  "flex min-h-13 items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-left text-sm font-medium transition-colors active:scale-[0.99]",
                  getTopicBadgeClass(canonical)
                )}
              >
                <span className="line-clamp-2 min-w-0 flex-1 leading-snug">
                  {shortcut.displayLabel}
                </span>
                <span className="flex shrink-0 items-center gap-1">
                  <span
                    className="tabular-nums text-xs font-semibold text-foreground/80"
                    aria-label={`${n} conversations`}
                  >
                    {n}
                  </span>
                  <ChevronRight
                    className="h-4 w-4 opacity-60"
                    aria-hidden
                  />
                </span>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
