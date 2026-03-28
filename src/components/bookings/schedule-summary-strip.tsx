import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export function BookingScheduleSummaryStrip({
  pendingCount,
  upcomingCount,
  scheduledCount,
  needsScheduleCount,
  hiddenPastPendingCount,
  showPastPending,
  canTogglePastPending,
  onShowPastPendingChange,
  conversationFilter,
  scheduleTimezones,
  overlapCount,
  compact = false,
}: {
  pendingCount: number;
  upcomingCount: number;
  scheduledCount: number;
  needsScheduleCount: number;
  hiddenPastPendingCount: number;
  showPastPending: boolean;
  canTogglePastPending: boolean;
  onShowPastPendingChange: (checked: boolean) => void;
  conversationFilter: string | null;
  scheduleTimezones: string[];
  overlapCount: number;
  /** When true, only the four summary tiles (e.g. home dashboard). */
  compact?: boolean;
}) {
  return (
    <>
      <div
        className={
          compact
            ? "grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
            : "mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
        }
      >
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

      {compact ? null : canTogglePastPending || hiddenPastPendingCount > 0 ? (
        <div className="mt-4 rounded-2xl border border-border bg-card px-4 py-3 text-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <Switch
                  id="inbox_show_past_pending"
                  checked={showPastPending}
                  onCheckedChange={onShowPastPendingChange}
                  disabled={!canTogglePastPending}
                />
                <Label htmlFor="inbox_show_past_pending" className="text-sm">
                  Show past pending
                </Label>
              </div>
              <div className="text-muted-foreground">
                Reveal pending bookings scheduled before this visible window in
                a separate review section.
              </div>
            </div>
            {!showPastPending && hiddenPastPendingCount > 0 ? (
              <div className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium uppercase tracking-[0.16em] text-amber-900">
                {hiddenPastPendingCount} hidden
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {compact ? null : conversationFilter ? (
        <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950">
          <div className="min-w-0">
            Viewing bookings linked to the selected conversation context.
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/bookings">Clear</Link>
          </Button>
        </div>
      ) : null}

      {compact ? null : scheduleTimezones.length > 0 || overlapCount > 0 ? (
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
