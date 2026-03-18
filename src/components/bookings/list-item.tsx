import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { BookingSummary } from "@/types/bookings";
import { formatAppointmentDisplay } from "@/lib/bookings/format-appointment";
import { MessageSquare, Trash2, CalendarDays } from "lucide-react";

interface BookingListItemProps {
  booking: BookingSummary;
  onDelete: (bookingId: string) => void;
  deleting?: boolean;
  compact?: boolean;
  collisionCount?: number;
}

const formatStatus = (status: BookingSummary["status"]) => {
  switch (status) {
    case "pending":
      return "border-amber-200 bg-amber-50 text-amber-900";
    case "confirmed":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
    case "cancelled":
      return "border-rose-200 bg-rose-50 text-rose-800";
    default:
      return "border-border text-muted-foreground";
  }
};

function formatScheduleLabel(booking: BookingSummary) {
  if (booking.start_at) {
    const appointmentLabel = formatAppointmentDisplay(
      booking.start_at,
      booking.appointment_timezone
    );
    if (appointmentLabel) {
      return appointmentLabel;
    }
  }

  if (booking.requested_date_text) {
    const timeSlot = booking.requested_time_slot
      ? ` • ${booking.requested_time_slot}`
      : "";
    return `Legacy request • ${booking.requested_date_text}${timeSlot}`;
  }

  return "Needs scheduling";
}

export function BookingListItemCard({
  booking,
  onDelete,
  deleting = false,
  compact = false,
  collisionCount = 0,
}: BookingListItemProps) {
  const customerName = booking.customer_name || "Customer";
  const scheduleLabel = formatScheduleLabel(booking);
  const timezoneLabel = booking.appointment_timezone?.trim() || null;
  const containerClass = compact
    ? "rounded-xl border border-border bg-card p-3 shadow-sm transition hover:border-emerald-200 hover:shadow-md"
    : "rounded-2xl border border-border bg-card p-4 shadow-sm transition hover:border-emerald-200 hover:shadow-md";
  const titleClass = compact ? "truncate text-sm font-semibold" : "truncate text-lg font-semibold";
  const detailClass = compact ? "mt-2 text-[11px] text-muted-foreground" : "mt-2 text-xs text-muted-foreground";

  return (
    <div className={containerClass}>
      <div className="flex items-start gap-3">
        <Link
          href={`/bookings/${booking.id}`}
          className="flex min-w-0 flex-1 items-start gap-3"
        >
          <div className="mt-1 rounded-full border border-border bg-muted p-2">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <div className={titleClass}>{customerName}</div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className={`${compact ? "text-xs" : "text-sm"} ${formatStatus(booking.status)}`}
              >
                {booking.status}
              </Badge>
              {booking.service_type ? (
                <Badge
                  variant="outline"
                  className={`${compact ? "text-xs" : "text-sm"} text-muted-foreground`}
                >
                  {booking.service_type}
                </Badge>
              ) : null}
              {booking.workflow_name ? (
                <Badge
                  variant="outline"
                  className={`${compact ? "text-xs" : "text-sm"} text-muted-foreground`}
                >
                  {booking.workflow_name}
                </Badge>
              ) : null}
              {timezoneLabel ? (
                <Badge
                  variant="outline"
                  className={`${compact ? "text-xs" : "text-sm"} text-muted-foreground`}
                >
                  {timezoneLabel}
                </Badge>
              ) : null}
              {collisionCount > 0 ? (
                <Badge
                  variant="outline"
                  className={`${compact ? "text-xs" : "text-sm"} border-rose-200 bg-rose-50 text-rose-800`}
                >
                  {collisionCount} overlap{collisionCount === 1 ? "" : "s"}
                </Badge>
              ) : null}
              <Badge
                variant="outline"
                className={`${compact ? "text-xs" : "text-sm"} text-muted-foreground`}
              >
                {scheduleLabel}
              </Badge>
            </div>
            <div className={detailClass}>
              {booking.reference_number
                ? `Reference: ${booking.reference_number}`
                : "No reference number"}
              {booking.bookable_item_id
                ? ` • Item: ${booking.bookable_item_id}`
                : ""}
              {booking.resource_id ? ` • Resource: ${booking.resource_id}` : ""}
            </div>
          </div>
        </Link>
        <div className="flex items-center gap-1">
          {booking.conversation_id ? (
            <Button
              variant="ghost"
              size="icon"
              aria-label="View conversation"
              className="text-muted-foreground hover:text-emerald-600"
              asChild
            >
              <Link
                href={`/conversations/${booking.conversation_id}?back=/bookings/${booking.id}`}
                onClick={(event) => event.stopPropagation()}
              >
                <MessageSquare className="h-4 w-4" />
              </Link>
            </Button>
          ) : null}
          {!compact ? (
            <Button
              variant="ghost"
              size="icon"
              aria-label="Delete booking"
              className="text-muted-foreground hover:text-destructive"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onDelete(booking.id);
              }}
              disabled={deleting}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
