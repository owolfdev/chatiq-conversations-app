"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { BookingDetail } from "@/types/bookings";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const EXCLUDED_DATA_KEYS = new Set([
  "reference_number",
  "customer_name",
  "customer_phone",
  "service_type",
  "requested_date",
  "requested_date_text",
  "requested_time_slot",
  "requested_time_text",
  "special_notes",
  "appointment_date",
  "appointment_timezone",
  "status",
  "confirmation_message",
  "confirmed_at",
  "confirmed_by",
]);

const formatCustomKey = (key: string) => {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const formatCustomValue = (value: unknown) => {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.map(String).join(", ");
  if (value && typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return "";
};

const toDateTimeLocal = (value: string) => {
  const date = new Date(value);
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
};

export function BookingDetailView({ bookingId }: { bookingId: string }) {
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [appointmentDate, setAppointmentDate] = useState("");
  const [isPending, startTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();

  useEffect(() => {
    let isActive = true;
    const loadBooking = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/bookings/${bookingId}`, {
          credentials: "include",
        });
        if (!response.ok) {
          throw new Error("Failed to load booking.");
        }
        const payload = (await response.json().catch(() => null)) as {
          booking?: BookingDetail;
        } | null;
        if (!isActive) return;
        const loaded = payload?.booking ?? null;
        setBooking(loaded);
        setAppointmentDate(
          loaded?.appointment_date ? toDateTimeLocal(loaded.appointment_date) : ""
        );
      } catch (error) {
        console.error("Failed to load booking", error);
        toast.error(
          error instanceof Error ? error.message : "Failed to load booking"
        );
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    loadBooking();
    return () => {
      isActive = false;
    };
  }, [bookingId]);

  const customEntries = useMemo(() => {
    if (!booking?.data || typeof booking.data !== "object") return [];
    return Object.entries(booking.data)
      .filter(([key, value]) => {
        if (EXCLUDED_DATA_KEYS.has(key)) return false;
        if (value === null || value === undefined || value === "") return false;
        return true;
      })
      .map(([key, value]) => ({
        key,
        label: formatCustomKey(key),
        value: formatCustomValue(value),
      }))
      .filter((entry) => entry.value);
  }, [booking?.data]);

  const handleConfirm = () => {
    if (!booking) return;
    startTransition(async () => {
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const response = await fetch(`/api/bookings/${booking.id}/confirm`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          confirmationMessage: message,
          appointmentDate: appointmentDate
            ? new Date(appointmentDate).toISOString()
            : null,
          appointmentTimezone: appointmentDate ? timeZone : null,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        toast.error(payload?.error || "Failed to confirm booking.");
        return;
      }

      toast.success("Booking confirmed. Message sent to the customer.");
    });
  };

  const handleDelete = () => {
    if (!booking) return;
    startDeleteTransition(async () => {
      const response = await fetch("/api/bookings/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ bookingIds: [booking.id] }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        toast.error(payload?.error || "Failed to delete booking.");
        return;
      }
      toast.success("Booking deleted.");
      window.location.href = "/bookings";
    });
  };

  if (isLoading) {
    return (
      <div className="mx-auto flex h-full min-h-0 w-full max-w-2xl flex-col overflow-y-auto px-4 pb-10 pt-4">
        <div className="rounded-2xl border border-dashed border-muted px-4 py-10 text-center text-sm text-muted-foreground">
          Loading booking...
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="mx-auto flex h-full min-h-0 w-full max-w-2xl flex-col overflow-y-auto px-4 pb-10 pt-4">
        <div className="rounded-2xl border border-dashed border-muted px-4 py-10 text-center text-sm text-muted-foreground">
          Booking not found.
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-2xl flex-col overflow-y-auto px-4 pb-10 pt-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold">Booking</h1>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {booking.conversation_id ? (
            <Button asChild>
              <Link
                href={`/conversations/${booking.conversation_id}?back=/bookings/${booking.id}`}
              >
                View Conversation
              </Link>
            </Button>
          ) : null}
          <Button variant="outline" asChild>
            <Link href="/bookings">Back to Bookings</Link>
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">Delete</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete booking?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete this booking.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isDeleting}>
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {isDeleting ? "Deleting..." : "Delete"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Request Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {booking.reference_number ? (
            <div>
              <span className="text-muted-foreground">Reference:</span>{" "}
              {booking.reference_number}
            </div>
          ) : null}
          <div>
            <span className="text-muted-foreground">Name:</span>{" "}
            {booking.customer_name || "Customer"}
          </div>
          {booking.customer_phone ? (
            <div>
              <span className="text-muted-foreground">Phone:</span>{" "}
              {booking.customer_phone}
            </div>
          ) : null}
          {booking.service_type ? (
            <div>
              <span className="text-muted-foreground">Service:</span>{" "}
              {booking.service_type}
            </div>
          ) : null}
          {booking.requested_date_text ? (
            <div>
              <span className="text-muted-foreground">Requested date:</span>{" "}
              {booking.requested_date_text}
            </div>
          ) : null}
          {booking.requested_time_slot ? (
            <div>
              <span className="text-muted-foreground">Requested time:</span>{" "}
              {booking.requested_time_slot}
            </div>
          ) : null}
          {booking.appointment_date ? (
            <div>
              <span className="text-muted-foreground">Appointment:</span>{" "}
              {new Date(booking.appointment_date).toLocaleString("en-US", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </div>
          ) : null}
          {booking.special_notes ? (
            <div>
              <span className="text-muted-foreground">Notes:</span>{" "}
              {booking.special_notes}
            </div>
          ) : null}
          {booking.workflow_name ? (
            <div>
              <span className="text-muted-foreground">Workflow:</span>{" "}
              {booking.workflow_name}
            </div>
          ) : null}
          <div>
            <span className="text-muted-foreground">Status:</span>{" "}
            {booking.status}
          </div>
        </CardContent>
      </Card>

      {customEntries.length > 0 ? (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Additional Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {customEntries.map((entry) => (
              <div key={entry.key}>
                <span className="text-muted-foreground">{entry.label}:</span>{" "}
                {entry.value}
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Confirmation Message</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="appointment_date">Appointment date &amp; time</Label>
            <Input
              id="appointment_date"
              type="datetime-local"
              value={appointmentDate}
              onChange={(event) => setAppointmentDate(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmation_message">
              Message to send to the customer
            </Label>
            <Textarea
              id="confirmation_message"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Your appointment is confirmed for May 15 at 3:00 PM..."
              className="min-h-28"
            />
          </div>
          <Button
            onClick={handleConfirm}
            disabled={isPending || message.trim().length === 0}
          >
            {isPending ? "Confirming..." : "Confirm Booking"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
