import Link from "next/link";

import { Button } from "@/components/ui/button";

export function BookingScheduleSummaryStrip({
  pendingCount,
  upcomingCount,
  scheduledCount,
  needsScheduleCount,
  conversationFilter,
  scheduleTimezones,
  overlapCount,
}: {
  pendingCount: number;
  upcomingCount: number;
  scheduledCount: number;
  needsScheduleCount: number;
  conversationFilter: string | null;
  scheduleTimezones: string[];
  overlapCount: number;
}) {
  return (
    <>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
          <div className="text-xs font-medium uppercase tracking-[0.16em] text-amber-900/70">
            Pending
          </div>
          <div className="mt-1 text-2xl font-semibold text-amber-950">
            {pendingCount}
          </div>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
          <div className="text-xs font-medium uppercase tracking-[0.16em] text-emerald-900/70">
            Upcoming
          </div>
          <div className="mt-1 text-2xl font-semibold text-emerald-950">
            {upcomingCount}
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card px-4 py-3">
          <div className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
            Scheduled In View
          </div>
          <div className="mt-1 text-2xl font-semibold text-foreground">
            {scheduledCount}
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card px-4 py-3">
          <div className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
            Needs Schedule
          </div>
          <div className="mt-1 text-2xl font-semibold text-foreground">
            {needsScheduleCount}
          </div>
        </div>
      </div>

      {conversationFilter ? (
        <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950">
          <div className="min-w-0">
            Viewing bookings linked to the selected conversation context.
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/bookings">Clear</Link>
          </Button>
        </div>
      ) : null}

      {scheduleTimezones.length > 0 || overlapCount > 0 ? (
        <div className="mt-4 rounded-2xl border border-border bg-card px-4 py-3 text-sm">
          <div className="font-medium text-foreground">
            Timezone and collision checks
          </div>
          <div className="mt-1 text-muted-foreground">
            {scheduleTimezones.length > 0
              ? `Grouped by appointment-local date across ${scheduleTimezones.length} timezone${
                  scheduleTimezones.length === 1 ? "" : "s"
                }.`
              : "Grouped by appointment-local date."}
            {overlapCount > 0
              ? ` ${overlapCount} booking${
                  overlapCount === 1 ? "" : "s"
                } overlap with another scheduled slot in this visible window.`
              : " No overlapping scheduled slots detected in this visible window."}
          </div>
        </div>
      ) : null}
    </>
  );
}
