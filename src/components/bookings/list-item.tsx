import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { BookingSummary } from "@/types/bookings";
import { MessageSquare, Trash2, CalendarDays } from "lucide-react";

interface BookingListItemProps {
  booking: BookingSummary;
  onDelete: (bookingId: string) => void;
  deleting?: boolean;
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

export function BookingListItemCard({
  booking,
  onDelete,
  deleting = false,
}: BookingListItemProps) {
  const customerName = booking.customer_name || "Customer";
  const requested =
    booking.requested_date_text ||
    (booking.created_at
      ? new Date(booking.created_at).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        })
      : "Date TBD");

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm transition hover:border-emerald-200 hover:shadow-md">
      <div className="flex items-start gap-3">
        <Link
          href={`/bookings/${booking.id}`}
          className="flex min-w-0 flex-1 items-start gap-3"
        >
          <div className="mt-1 rounded-full border border-border bg-muted p-2">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-lg font-semibold">{customerName}</div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className={`text-sm ${formatStatus(booking.status)}`}
              >
                {booking.status}
              </Badge>
              {booking.service_type ? (
                <Badge variant="outline" className="text-sm text-muted-foreground">
                  {booking.service_type}
                </Badge>
              ) : null}
              {booking.workflow_name ? (
                <Badge variant="outline" className="text-sm text-muted-foreground">
                  {booking.workflow_name}
                </Badge>
              ) : null}
              <Badge variant="outline" className="text-sm text-muted-foreground">
                {requested}
                {booking.requested_time_slot
                  ? ` • ${booking.requested_time_slot}`
                  : ""}
              </Badge>
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              {booking.reference_number
                ? `Reference: ${booking.reference_number}`
                : "No reference number"}
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
        </div>
      </div>
    </div>
  );
}
