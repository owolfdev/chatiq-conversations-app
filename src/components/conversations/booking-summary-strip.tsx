export function ConversationBookingSummaryStrip({
  openCount,
  upcomingBookingsCount,
  pendingBookingsCount,
  needsScheduleCount,
  linkedConversationCount,
  showLinkedNote = true,
}: {
  openCount: number;
  upcomingBookingsCount: number;
  pendingBookingsCount: number;
  needsScheduleCount: number;
  linkedConversationCount: number;
  /** When false, hides the “linked booking history” footer (e.g. home overview). */
  showLinkedNote?: boolean;
}) {
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
          <div className="text-xs font-medium uppercase tracking-[0.16em] text-amber-900/70">
            Open
          </div>
          <div className="mt-1 text-2xl font-semibold text-amber-950">
            {openCount}
          </div>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
          <div className="text-xs font-medium uppercase tracking-[0.16em] text-emerald-900/70">
            Upcoming
          </div>
          <div className="mt-1 text-2xl font-semibold text-emerald-950">
            {upcomingBookingsCount}
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card px-4 py-3">
          <div className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
            Pending
          </div>
          <div className="mt-1 text-2xl font-semibold text-foreground">
            {pendingBookingsCount}
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

      {showLinkedNote ? (
        <div className="mt-3 text-xs text-muted-foreground">
          {linkedConversationCount} conversation
          {linkedConversationCount === 1 ? "" : "s"} in this view have linked
          booking history.
        </div>
      ) : null}
    </>
  );
}
