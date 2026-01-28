"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { RefreshCcw } from "lucide-react";
import { toast } from "sonner";
import type { BookingSummary, BookingWorkflow } from "@/types/bookings";
import type { InboxCounts } from "@/types/inbox";
import { BookingListItemCard } from "@/components/bookings/list-item";
import { dispatchInboxCounts } from "@/lib/inbox-counts";
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

export function BookingsList() {
  const [workflows, setWorkflows] = useState<BookingWorkflow[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [referenceQuery, setReferenceQuery] = useState("");
  const [debouncedReferenceQuery, setDebouncedReferenceQuery] = useState("");
  const [bookings, setBookings] = useState<BookingSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const pollingRef = useRef<number | null>(null);
  const [inboxCounts, setInboxCounts] = useState<InboxCounts | null>(null);

  const workflowOptions = useMemo(() => {
    const base = [{ id: "all", name: "All workflows" }];
    return base.concat(
      workflows.map((workflow) => ({
        id: workflow.id,
        name: workflow.name,
      }))
    );
  }, [workflows]);

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

  const loadBookings = useCallback(
    async (silent = false) => {
      if (!silent) {
        setIsLoading(true);
      }
      try {
        const params = new URLSearchParams();
        if (selectedWorkflow !== "all") {
          params.set("workflowId", selectedWorkflow);
        }
        if (statusFilter !== "all") {
          params.set("status", statusFilter);
        }
        if (debouncedReferenceQuery.trim()) {
          params.set("referenceQuery", debouncedReferenceQuery.trim());
        }
        const response = await fetch(`/api/bookings?${params.toString()}`, {
          credentials: "include",
        });
        if (!response.ok) {
          throw new Error("Failed to load bookings.");
        }
        const payload = (await response.json().catch(() => null)) as {
          bookings?: BookingSummary[];
        } | null;
        setBookings(payload?.bookings ?? []);
      } finally {
        if (!silent) {
          setIsLoading(false);
        }
      }
    },
    [debouncedReferenceQuery, selectedWorkflow, statusFilter]
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
    loadBookings();
  }, [loadBookings]);

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
          loadBookings(true);
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
        loadBookings(true);
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
  }, [loadBookings]);

  useEffect(() => {
    const handleTeamChange = () => {
      handleRefresh();
    };

    window.addEventListener(ACTIVE_TEAM_EVENT, handleTeamChange);
    return () => {
      window.removeEventListener(ACTIVE_TEAM_EVENT, handleTeamChange);
    };
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await loadWorkflows();
      await loadBookings(true);
      await loadCounts();
    } finally {
      setIsRefreshing(false);
    }
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
      setBookings((prev) => prev.filter((booking) => booking.id !== bookingId));
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
    ? bookings.find((booking) => booking.id === pendingDeleteId)
    : null;

  const pendingCount = inboxCounts?.pendingBookings ?? 0;
  const upcomingCount = inboxCounts?.upcomingConfirmedBookings ?? 0;

  return (
    <div className="mx-auto flex h-full w-full max-w-2xl flex-col px-4 pb-10 pt-4">
      <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-center">
        <Input
          placeholder="Search by reference"
          value={referenceQuery}
          onChange={(event) => setReferenceQuery(event.target.value)}
        />
        <Select value={selectedWorkflow} onValueChange={setSelectedWorkflow}>
          <SelectTrigger className="sm:w-[200px]">
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
            <SelectTrigger className="w-[140px]">
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
            aria-label="Refresh list"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCcw
              className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
            />
          </Button>
        </div>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <Badge
          variant="outline"
          className="border-amber-200 bg-amber-50 text-amber-900"
        >
          Pending: {pendingCount}
        </Badge>
        <Badge
          variant="outline"
          className="border-emerald-200 bg-emerald-50 text-emerald-900"
        >
          Upcoming: {upcomingCount}
        </Badge>
      </div>

      <div className="mt-6 flex-1 min-h-0 space-y-4 overflow-y-auto pb-6">
        {isLoading ? (
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
        ) : bookings.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-muted px-4 py-10 text-center text-sm text-muted-foreground">
            No bookings found.
          </div>
        ) : (
          bookings.map((booking) => (
            <BookingListItemCard
              key={booking.id}
              booking={booking}
              deleting={deletingId === booking.id}
              onDelete={handleRequestDelete}
            />
          ))
        )}
      </div>

      <div className="mt-6 text-center text-xs text-muted-foreground">
        {bookings.length} bookings
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
