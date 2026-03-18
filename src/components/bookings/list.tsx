"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, ChevronRight, RefreshCcw } from "lucide-react";
import { toast } from "sonner";
import type {
  BookingScheduleResponse,
  BookingScheduleView,
  BookingSummary,
  BookingWorkflow,
} from "@/types/bookings";
import type { InboxCounts } from "@/types/inbox";
import { BookingListItemCard } from "@/components/bookings/list-item";
import { BookingScheduleSummaryStrip } from "@/components/bookings/schedule-summary-strip";
import { dispatchInboxCounts } from "@/lib/inbox-counts";
import {
  buildBookingCollisionMap,
  buildBufferedScheduleRange,
  collectScheduleTimezones,
  filterBookingsForScheduleWindow,
  getBookingScheduleDateKey,
} from "@/lib/bookings/schedule-visualization";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const ACTIVE_TEAM_EVENT = "active-team-changed";
const VIEW_RANGE_DAYS: Record<BookingScheduleView, number> = {
  agenda: 14,
  day: 1,
  week: 7,
};
const VIEW_SHIFT_DAYS: Record<BookingScheduleView, number> = {
  agenda: 7,
  day: 1,
  week: 7,
};
const VIEW_OPTIONS: BookingScheduleView[] = ["agenda", "day", "week"];

function parseLocalDate(value: string) {
  const [year, month, day] = value.split("-").map((part) => Number(part));
  return new Date(year, (month || 1) - 1, day || 1);
}

function addLocalDays(value: Date, days: number) {
  const next = new Date(value.getTime());
  next.setDate(next.getDate() + days);
  return next;
}

function toLocalIsoDate(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildScheduleRange(anchorDate: string, view: BookingScheduleView) {
  return buildBufferedScheduleRange(anchorDate, VIEW_RANGE_DAYS[view]);
}

function formatSingleDateLabel(value: Date) {
  return value.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatRangeLabel(anchorDate: string, view: BookingScheduleView) {
  const start = parseLocalDate(anchorDate);
  if (view === "day") {
    return formatSingleDateLabel(start);
  }

  const end = addLocalDays(start, VIEW_RANGE_DAYS[view] - 1);
  return `${formatSingleDateLabel(start)} - ${formatSingleDateLabel(end)}`;
}

function getBookingDateKey(booking: BookingSummary) {
  return getBookingScheduleDateKey(booking);
}

function formatAgendaGroupLabel(dateKey: string) {
  return parseLocalDate(dateKey).toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

function formatWeekdayLabel(dateKey: string) {
  return parseLocalDate(dateKey).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function BookingsList() {
  const searchParams = useSearchParams();
  const [workflows, setWorkflows] = useState<BookingWorkflow[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [referenceQuery, setReferenceQuery] = useState("");
  const [debouncedReferenceQuery, setDebouncedReferenceQuery] = useState("");
  const [view, setView] = useState<BookingScheduleView>("agenda");
  const [anchorDate, setAnchorDate] = useState(() => toLocalIsoDate(new Date()));
  const [scheduleEntries, setScheduleEntries] = useState<BookingSummary[]>([]);
  const [unscheduledEntries, setUnscheduledEntries] = useState<BookingSummary[]>(
    []
  );
  const [pastPendingEntries, setPastPendingEntries] = useState<BookingSummary[]>(
    []
  );
  const [hiddenPastPendingCount, setHiddenPastPendingCount] = useState(0);
  const [scheduleSummary, setScheduleSummary] =
    useState<BookingScheduleResponse["summary"] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const pollingRef = useRef<number | null>(null);
  const [inboxCounts, setInboxCounts] = useState<InboxCounts | null>(null);
  const [showPastPending, setShowPastPending] = useState(false);
  const conversationFilter = useMemo(() => {
    const value = searchParams.get("conversationId");
    if (typeof value !== "string") {
      return null;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }, [searchParams]);

  const workflowOptions = useMemo(() => {
    const base = [{ id: "all", name: "All workflows" }];
    return base.concat(
      workflows.map((workflow) => ({
        id: workflow.id,
        name: workflow.name,
      }))
    );
  }, [workflows]);

  const scheduleRange = useMemo(
    () => buildScheduleRange(anchorDate, view),
    [anchorDate, view]
  );

  const rangeLabel = useMemo(
    () => formatRangeLabel(anchorDate, view),
    [anchorDate, view]
  );

  const visibleScheduledEntries = useMemo(
    () =>
      filterBookingsForScheduleWindow({
        entries: scheduleEntries,
        anchorDate,
        days: VIEW_RANGE_DAYS[view],
      }),
    [anchorDate, scheduleEntries, view]
  );

  const canTogglePastPending =
    statusFilter === "all" || statusFilter === "pending";
  const visiblePastPendingEntries = useMemo(
    () => (canTogglePastPending && showPastPending ? pastPendingEntries : []),
    [canTogglePastPending, pastPendingEntries, showPastPending]
  );

  const collisionMap = useMemo(
    () => buildBookingCollisionMap(visibleScheduledEntries),
    [visibleScheduledEntries]
  );

  const scheduleTimezones = useMemo(
    () => collectScheduleTimezones(visibleScheduledEntries),
    [visibleScheduledEntries]
  );

  const agendaGroups = useMemo(() => {
    const grouped = new Map<string, BookingSummary[]>();

    visibleScheduledEntries.forEach((booking) => {
      const dateKey = getBookingDateKey(booking);
      if (!dateKey) return;
      const current = grouped.get(dateKey) ?? [];
      current.push(booking);
      grouped.set(dateKey, current);
    });

    return Array.from(grouped.entries()).map(([dateKey, bookings]) => ({
      dateKey,
      label: formatAgendaGroupLabel(dateKey),
      bookings,
    }));
  }, [visibleScheduledEntries]);

  const weekDays = useMemo(() => {
    const grouped = new Map<string, BookingSummary[]>();

    visibleScheduledEntries.forEach((booking) => {
      const dateKey = getBookingDateKey(booking);
      if (!dateKey) return;
      const current = grouped.get(dateKey) ?? [];
      current.push(booking);
      grouped.set(dateKey, current);
    });

    return Array.from({ length: VIEW_RANGE_DAYS.week }, (_, index) => {
      const dateKey = toLocalIsoDate(
        addLocalDays(parseLocalDate(anchorDate), index)
      );
      return {
        dateKey,
        label: formatWeekdayLabel(dateKey),
        bookings: grouped.get(dateKey) ?? [],
      };
    });
  }, [anchorDate, visibleScheduledEntries]);

  const visibleBookings = useMemo(
    () =>
      visibleScheduledEntries.concat(
        unscheduledEntries,
        visiblePastPendingEntries
      ),
    [unscheduledEntries, visiblePastPendingEntries, visibleScheduledEntries]
  );

  const visibleCount =
    view === "agenda"
      ? visibleScheduledEntries.length +
        unscheduledEntries.length +
        visiblePastPendingEntries.length
      : visibleScheduledEntries.length + visiblePastPendingEntries.length;

  const pendingCount = inboxCounts?.pendingBookings ?? 0;
  const upcomingCount = inboxCounts?.upcomingConfirmedBookings ?? 0;
  const scheduledCount = visibleScheduledEntries.length;
  const needsScheduleCount = unscheduledEntries.length;

  const loadWorkflows = useCallback(async () => {
    try {
      const response = await fetch("/api/bookings/workflows", {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to load workflows.");
      }
      const payload = (await response.json().catch(() => null)) as {
        workflows?: BookingWorkflow[];
      } | null;
      setWorkflows(payload?.workflows ?? []);
    } catch (error) {
      console.error("Failed to load workflows", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to load workflows"
      );
    }
  }, []);

  const loadSchedule = useCallback(
    async (silent = false) => {
      if (!silent) {
        setIsLoading(true);
      }

      try {
        const params = new URLSearchParams();
        params.set("view", view);
        params.set("anchorDate", anchorDate);
        params.set("rangeStart", scheduleRange.rangeStart);
        params.set("rangeEnd", scheduleRange.rangeEnd);

        if (selectedWorkflow !== "all") {
          params.set("workflowId", selectedWorkflow);
        }
        if (statusFilter !== "all") {
          params.set("status", statusFilter);
        }
        if (debouncedReferenceQuery.trim()) {
          params.set("referenceQuery", debouncedReferenceQuery.trim());
        }
        if (conversationFilter) {
          params.set("conversationId", conversationFilter);
        }
        if (canTogglePastPending && showPastPending) {
          params.set("showPastPending", "true");
        }

        const response = await fetch(`/api/bookings/schedule?${params.toString()}`, {
          credentials: "include",
        });

        const rawPayload = (await response.json().catch(() => null)) as
          | BookingScheduleResponse
          | { error?: string }
          | null;

        if (!response.ok) {
          throw new Error(
            rawPayload && "error" in rawPayload && rawPayload.error
              ? rawPayload.error
              : "Failed to load booking schedule."
          );
        }

        const payload = rawPayload as BookingScheduleResponse | null;
        setScheduleEntries(payload?.entries ?? []);
        setUnscheduledEntries(payload?.unscheduled_entries ?? []);
        setPastPendingEntries(payload?.past_pending_entries ?? []);
        setHiddenPastPendingCount(payload?.hidden_past_pending_count ?? 0);
        setScheduleSummary(payload?.summary ?? null);
      } catch (error) {
        console.error("Failed to load booking schedule", error);
        if (!silent) {
          toast.error(
            error instanceof Error
              ? error.message
              : "Failed to load booking schedule"
          );
        }
      } finally {
        if (!silent) {
          setIsLoading(false);
        }
      }
    },
    [
      anchorDate,
      canTogglePastPending,
      debouncedReferenceQuery,
      scheduleRange.rangeEnd,
      scheduleRange.rangeStart,
      selectedWorkflow,
      showPastPending,
      statusFilter,
      conversationFilter,
      view,
    ]
  );

  const loadCounts = useCallback(async () => {
    try {
      const response = await fetch("/api/inbox-counts", {
        credentials: "include",
      });
      if (!response.ok) {
        return;
      }
      const payload = (await response.json().catch(() => null)) as
        | InboxCounts
        | null;
      if (!payload) {
        return;
      }
      setInboxCounts(payload);
      dispatchInboxCounts(payload);
    } catch (error) {
      console.error("Failed to load inbox counts", error);
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await loadWorkflows();
      await loadSchedule(true);
      await loadCounts();
    } finally {
      setIsRefreshing(false);
    }
  }, [loadCounts, loadSchedule, loadWorkflows]);

  useEffect(() => {
    loadWorkflows();
  }, [loadWorkflows]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setDebouncedReferenceQuery(referenceQuery);
    }, 300);
    return () => window.clearTimeout(handle);
  }, [referenceQuery]);

  useEffect(() => {
    loadSchedule();
  }, [loadSchedule]);

  useEffect(() => {
    loadCounts();
  }, [loadCounts]);

  useEffect(() => {
    const startPolling = () => {
      if (pollingRef.current !== null) {
        return;
      }
      pollingRef.current = window.setInterval(() => {
        if (document.visibilityState === "visible") {
          loadSchedule(true);
          loadCounts();
        }
      }, 8000);
    };

    const stopPolling = () => {
      if (pollingRef.current !== null) {
        window.clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        loadSchedule(true);
        loadCounts();
        startPolling();
      } else {
        stopPolling();
      }
    };

    handleVisibilityChange();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      stopPolling();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [loadCounts, loadSchedule]);

  useEffect(() => {
    window.addEventListener(ACTIVE_TEAM_EVENT, handleRefresh);
    return () => {
      window.removeEventListener(ACTIVE_TEAM_EVENT, handleRefresh);
    };
  }, [handleRefresh]);

  const moveScheduleWindow = (direction: -1 | 1) => {
    const nextAnchor = addLocalDays(
      parseLocalDate(anchorDate),
      VIEW_SHIFT_DAYS[view] * direction
    );
    setAnchorDate(toLocalIsoDate(nextAnchor));
  };

  const resetToToday = () => {
    setAnchorDate(toLocalIsoDate(new Date()));
  };

  const handleDeleteBooking = async (bookingId: string) => {
    if (deletingId) return;
    setDeletingId(bookingId);

    try {
      const response = await fetch("/api/bookings/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ bookingIds: [bookingId] }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(payload?.error || "Failed to delete booking.");
      }

      await loadSchedule(true);
      await loadCounts();
      toast.success("Booking deleted.");
    } catch (error) {
      console.error("Failed to delete booking", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to delete booking"
      );
    } finally {
      setDeletingId(null);
    }
  };

  const handleRequestDelete = (bookingId: string) => {
    setPendingDeleteId(bookingId);
    setConfirmOpen(true);
  };

  const pendingBooking = pendingDeleteId
    ? visibleBookings.find((booking) => booking.id === pendingDeleteId)
    : null;

  const renderLoadingState = () => (
    <div className="space-y-4">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="rounded-2xl border border-border bg-card px-4 py-4"
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-1/2 rounded bg-muted animate-pulse" />
              <div className="h-3 w-3/4 rounded bg-muted animate-pulse" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderEmptyState = (message: string) => (
    <div className="rounded-2xl border border-dashed border-muted px-4 py-10 text-center text-sm text-muted-foreground">
      {message}
    </div>
  );

  const renderPastPendingSection = () => {
    if (!showPastPending) {
      return null;
    }

    return (
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-foreground">
              Past Pending
            </div>
            <div className="text-xs text-muted-foreground">
              Pending bookings scheduled before this visible window
            </div>
          </div>
          <Badge
            variant="outline"
            className="border-amber-200 bg-amber-50 text-amber-900"
          >
            {visiblePastPendingEntries.length}
          </Badge>
        </div>
        {visiblePastPendingEntries.length === 0 ? (
          renderEmptyState("No past pending bookings match the current filters.")
        ) : (
          <div className="space-y-3">
            {visiblePastPendingEntries.map((booking) => (
              <BookingListItemCard
                key={booking.id}
                booking={booking}
                deleting={deletingId === booking.id}
                onDelete={handleRequestDelete}
              />
            ))}
          </div>
        )}
      </section>
    );
  };

  const renderAgendaView = () => {
    if (agendaGroups.length === 0 && unscheduledEntries.length === 0) {
      return renderEmptyState(
        conversationFilter
          ? "No bookings linked to this conversation yet."
          : "No bookings found for this schedule window."
      );
    }

    return (
      <div className="space-y-6">
        {agendaGroups.map((group) => (
          <section key={group.dateKey} className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-foreground">
                  {group.label}
                </div>
                <div className="text-xs text-muted-foreground">
                  Canonical schedule entries
                </div>
              </div>
              <Badge variant="outline">{group.bookings.length}</Badge>
            </div>
            <div className="space-y-3">
              {group.bookings.map((booking) => (
                <BookingListItemCard
                  key={booking.id}
                  booking={booking}
                  collisionCount={collisionMap.get(booking.id)?.size ?? 0}
                  deleting={deletingId === booking.id}
                  onDelete={handleRequestDelete}
                />
              ))}
            </div>
          </section>
        ))}

        {unscheduledEntries.length > 0 ? (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-foreground">
                  Needs scheduling
                </div>
                <div className="text-xs text-muted-foreground">
                  Filtered bookings without canonical `start_at` yet
                </div>
              </div>
              <Badge
                variant="outline"
                className="border-amber-200 bg-amber-50 text-amber-900"
              >
                {unscheduledEntries.length}
              </Badge>
            </div>
            <div className="space-y-3">
              {unscheduledEntries.map((booking) => (
                <BookingListItemCard
                  key={booking.id}
                  booking={booking}
                  deleting={deletingId === booking.id}
                  onDelete={handleRequestDelete}
                />
              ))}
            </div>
          </section>
        ) : null}
      </div>
    );
  };

  const renderDayView = () => {
    if (visibleScheduledEntries.length === 0) {
      return renderEmptyState(
        conversationFilter
          ? "No scheduled bookings linked to this conversation."
          : "No scheduled bookings for this day."
      );
    }

    return (
      <div className="space-y-3">
        {visibleScheduledEntries.map((booking) => (
          <BookingListItemCard
            key={booking.id}
            booking={booking}
            collisionCount={collisionMap.get(booking.id)?.size ?? 0}
            deleting={deletingId === booking.id}
            onDelete={handleRequestDelete}
          />
        ))}
      </div>
    );
  };

  const renderWeekView = () => {
    if (visibleScheduledEntries.length === 0) {
      return renderEmptyState(
        conversationFilter
          ? "No scheduled bookings linked to this conversation."
          : "No scheduled bookings for this week."
      );
    }

    return (
      <div className="overflow-x-auto pb-2">
        <div className="grid min-w-[840px] grid-cols-7 gap-3">
          {weekDays.map((day) => (
            <section
              key={day.dateKey}
              className="rounded-2xl border border-border bg-card p-3"
            >
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="text-sm font-semibold text-foreground">
                  {day.label}
                </div>
                <Badge variant="outline">{day.bookings.length}</Badge>
              </div>

              {day.bookings.length === 0 ? (
                <div className="rounded-xl border border-dashed border-muted px-3 py-6 text-center text-xs text-muted-foreground">
                  No bookings
                </div>
              ) : (
                <div className="space-y-2">
                  {day.bookings.map((booking) => (
                    <BookingListItemCard
                      key={booking.id}
                      booking={booking}
                      collisionCount={collisionMap.get(booking.id)?.size ?? 0}
                      deleting={deletingId === booking.id}
                      onDelete={handleRequestDelete}
                      compact
                    />
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="mx-auto flex h-full w-full max-w-6xl flex-col px-4 pb-10 pt-4">
      <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto] lg:items-center">
        <Input
          placeholder="Search by reference"
          value={referenceQuery}
          onChange={(event) => setReferenceQuery(event.target.value)}
        />
        <Select value={selectedWorkflow} onValueChange={setSelectedWorkflow}>
          <SelectTrigger className="lg:w-[220px]">
            <SelectValue placeholder="Workflow" />
          </SelectTrigger>
          <SelectContent>
            {workflowOptions.map((option) => (
              <SelectItem key={option.id} value={option.id}>
                {option.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Refresh schedule"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCcw
              className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
              style={isRefreshing ? { animationDirection: "reverse" } : undefined}
            />
          </Button>
        </div>
      </div>

      <BookingScheduleSummaryStrip
        pendingCount={pendingCount}
        upcomingCount={upcomingCount}
        scheduledCount={scheduledCount}
        needsScheduleCount={needsScheduleCount}
        hiddenPastPendingCount={hiddenPastPendingCount}
        showPastPending={showPastPending}
        canTogglePastPending={canTogglePastPending}
        onShowPastPendingChange={setShowPastPending}
        conversationFilter={conversationFilter}
        scheduleTimezones={scheduleTimezones}
        overlapCount={collisionMap.size}
      />

      <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-border bg-card/60 p-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {VIEW_OPTIONS.map((option) => (
            <Button
              key={option}
              type="button"
              variant={view === option ? "default" : "outline"}
              size="sm"
              onClick={() => setView(option)}
            >
              {option === "agenda"
                ? "Agenda"
                : option === "day"
                ? "Day"
                : "Week"}
            </Button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Previous schedule window"
            onClick={() => moveScheduleWindow(-1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-[220px] text-center text-sm font-medium text-foreground">
            {rangeLabel}
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Next schedule window"
            onClick={() => moveScheduleWindow(1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={resetToToday}>
            Today
          </Button>
        </div>
      </div>

      <div className="mt-6 min-h-0 flex-1 overflow-y-auto pb-6">
        {isLoading
          ? renderLoadingState()
          : view === "agenda"
          ? renderAgendaView()
          : view === "day"
          ? renderDayView()
          : renderWeekView()}

        {!isLoading ? (
          <div className="mt-6">{renderPastPendingSection()}</div>
        ) : null}
      </div>

      <div className="mt-4 text-center text-xs text-muted-foreground">
        {visibleCount} booking{visibleCount === 1 ? "" : "s"} visible in this
        {conversationFilter ? " conversation-linked " : " "}view
        {collisionMap.size > 0
          ? ` • ${collisionMap.size} with overlap warnings`
          : ""}
      </div>

      <AlertDialog
        open={confirmOpen}
        onOpenChange={(open) => {
          if (!open && !deletingId) {
            setPendingDeleteId(null);
          }
          setConfirmOpen(open);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete booking?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingBooking
                ? `This will permanently delete the booking for ${pendingBooking.customer_name || "the selected customer"}.`
                : "This will permanently delete the selected booking."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={Boolean(deletingId)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!pendingDeleteId) return;
                handleDeleteBooking(pendingDeleteId);
                setConfirmOpen(false);
              }}
              disabled={!pendingDeleteId || Boolean(deletingId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
