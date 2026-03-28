"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BookingScheduleSummaryStrip } from "@/components/bookings/schedule-summary-strip";
import { ConversationBookingSummaryStrip } from "@/components/conversations/booking-summary-strip";
import { buildBufferedScheduleRange } from "@/lib/bookings/schedule-visualization";
import type { BookingScheduleResponse } from "@/types/bookings";
import type { InboxCounts } from "@/types/inbox";

const AGENDA_DAYS = 14;

function toLocalIsoDate(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function HomeInboxStats() {
  const [counts, setCounts] = useState<InboxCounts | null>(null);
  const [schedule, setSchedule] = useState<BookingScheduleResponse | null>(
    null
  );
  const [loadError, setLoadError] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const anchorDate = toLocalIsoDate(new Date());
        const range = buildBufferedScheduleRange(anchorDate, AGENDA_DAYS);
        const params = new URLSearchParams();
        params.set("view", "agenda");
        params.set("anchorDate", anchorDate);
        params.set("rangeStart", range.rangeStart);
        params.set("rangeEnd", range.rangeEnd);

        const [countsRes, scheduleRes] = await Promise.all([
          fetch("/api/inbox-counts", { credentials: "include" }),
          fetch(`/api/bookings/schedule?${params.toString()}`, {
            credentials: "include",
          }),
        ]);

        if (cancelled) return;

        if (countsRes.ok) {
          const payload = (await countsRes.json()) as InboxCounts;
          setCounts(payload);
        }

        if (scheduleRes.ok) {
          const payload = (await scheduleRes.json()) as BookingScheduleResponse;
          setSchedule(payload);
        }

        if (!countsRes.ok && !scheduleRes.ok) {
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

  if (loadError && !counts && !schedule) {
    return (
      <p className="mt-8 text-center text-sm text-muted-foreground">
        Could not load inbox stats. Open{" "}
        <Link href="/conversations" className="text-primary underline-offset-4 hover:underline">
          Conversations
        </Link>{" "}
        or{" "}
        <Link href="/bookings" className="text-primary underline-offset-4 hover:underline">
          Bookings
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

  const scheduledCount = schedule?.entries?.length ?? 0;
  const needsScheduleCount =
    schedule?.unscheduled_entries?.length ?? inbox.unscheduledBookings;

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
            Bookings
          </h2>
          <Link
            href="/bookings"
            className="text-xs font-medium text-primary underline-offset-4 hover:underline"
          >
            Open schedule
          </Link>
        </div>
        <BookingScheduleSummaryStrip
          pendingCount={inbox.pendingBookings}
          upcomingCount={inbox.upcomingConfirmedBookings}
          scheduledCount={scheduledCount}
          needsScheduleCount={needsScheduleCount}
          hiddenPastPendingCount={0}
          showPastPending={false}
          canTogglePastPending={false}
          onShowPastPendingChange={() => {}}
          conversationFilter={null}
          scheduleTimezones={[]}
          overlapCount={0}
          compact
        />
        <p className="mt-3 text-xs text-muted-foreground">
          Scheduled / needs schedule reflect the default agenda window (about{" "}
          {AGENDA_DAYS} days). Full controls are on the bookings page.
        </p>
      </section>
    </div>
  );
}
