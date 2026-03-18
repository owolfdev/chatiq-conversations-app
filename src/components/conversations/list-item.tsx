"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ConversationListItem } from "@/types/conversations";
import { getCustomerProfile } from "@/lib/conversations/get-customer-profile";
import {
  getTopicBadgeClass,
  getTopicShortLabel,
} from "@/lib/conversations/topic-display";
import { formatAppointmentDisplay } from "@/lib/bookings/format-appointment";
import { CalendarDays, MoreVertical } from "lucide-react";

interface ConversationListItemProps {
  conversation: ConversationListItem;
  onDelete: (conversationId: string) => void;
  onOpen: () => void;
  deleting?: boolean;
  opening?: boolean;
}

const formatPreview = (value: string | null, fallback: string) => {
  const text = value?.trim() || fallback;
  if (!text) return "No messages yet.";
  if (text.length <= 160) return text;
  return `${text.slice(0, 160)}…`;
};

const formatBookingContext = (
  bookingContext: ConversationListItem["booking_context"]
) => {
  if (!bookingContext) {
    return null;
  }

  const referenceLabel = bookingContext.primary_reference_number
    ? `Ref ${bookingContext.primary_reference_number}`
    : bookingContext.total === 1
    ? "1 booking"
    : `${bookingContext.total} bookings`;
  const statusLabel =
    bookingContext.primary_status.charAt(0).toUpperCase() +
    bookingContext.primary_status.slice(1);

  if (bookingContext.primary_start_at) {
    const appointmentLabel = formatAppointmentDisplay(
      bookingContext.primary_start_at,
      bookingContext.primary_appointment_timezone
    );
    if (appointmentLabel) {
      return `${referenceLabel} • ${statusLabel} • ${appointmentLabel}`;
    }
  }

  if (bookingContext.unscheduled > 0) {
    return `${referenceLabel} • ${bookingContext.unscheduled} need scheduling`;
  }

  return `${referenceLabel} • ${statusLabel}`;
};

const getBookingHref = (conversation: ConversationListItem) => {
  const bookingContext = conversation.booking_context;
  if (!bookingContext) {
    return null;
  }

  if (bookingContext.total === 1 && bookingContext.primary_booking_id) {
    return `/bookings/${bookingContext.primary_booking_id}`;
  }

  const params = new URLSearchParams({
    conversationId: conversation.id,
  });
  return `/bookings?${params.toString()}`;
};

export function ConversationListItemCard({
  conversation,
  onDelete,
  onOpen,
  deleting = false,
  opening = false,
}: ConversationListItemProps) {
  const router = useRouter();
  const preview = formatPreview(
    conversation.topic_message_preview,
    conversation.title || "Conversation"
  );
  const customer = getCustomerProfile(conversation.source_detail);
  const name = customer?.name?.trim() || conversation.bot_name || "—";
  const avatarUrl = customer?.avatarUrl ?? null;
  const statusLabel = conversation.resolution_status === "resolved" ? "Resolved" : "Open";
  const statusDotClass =
    conversation.resolution_status === "resolved"
      ? "bg-emerald-500"
      : "bg-amber-500";
  const topicLabel = conversation.topic || "General Inquiry";
  const topicShortLabel = getTopicShortLabel(topicLabel);
  const topicBadgeClass = getTopicBadgeClass(topicLabel);
  const unreadCardClass = conversation.has_unread
    ? "border-amber-200 bg-amber-50/70 hover:border-amber-300 hover:bg-amber-100/70 dark:border-amber-900/60 dark:bg-amber-950/20 dark:hover:bg-amber-900/30"
    : "border-border bg-card hover:border-emerald-200";
  const bookingSummary = formatBookingContext(conversation.booking_context);
  const bookingHref = getBookingHref(conversation);
  const bookingActionLabel =
    conversation.booking_context?.total === 1 ? "Booking" : "Schedule";

  return (
    <div
      className={`rounded-xl border p-3 shadow-sm transition hover:shadow-md ${unreadCardClass}`}
    >
      <div className="flex items-start gap-2.5">
        <Link
          href={`/conversations/${conversation.id}`}
          className="flex min-w-0 flex-1 items-start gap-2.5 transition-transform active:scale-[0.99]"
          onClick={() => {
            if (!opening) {
              onOpen();
            }
          }}
        >
          <Avatar className="h-8 w-8">
            <AvatarImage src={avatarUrl || undefined} alt={name} />
            <AvatarFallback>
              {name === "—" ? "—" : name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                {conversation.has_unread ? (
                  <span
                    className="h-2 w-2 rounded-full bg-amber-500"
                    aria-label="Unread conversation"
                  />
                ) : null}
                <div className="truncate text-base font-semibold">{name}</div>
                {opening ? (
                  <span className="text-xs text-muted-foreground">Opening...</span>
                ) : null}
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${statusDotClass}`}
                  aria-label={`Status: ${statusLabel}`}
                  title={`Status: ${statusLabel}`}
                />
                <Badge
                  variant="outline"
                  className={`px-1.5 py-0 text-sm ${topicBadgeClass}`}
                  aria-label={`Topic: ${topicLabel}`}
                  title={`Topic: ${topicLabel}`}
                >
                  {topicShortLabel}
                </Badge>
                {conversation.source ? (
                  <Badge
                    variant="outline"
                    className="px-1.5 py-0 text-sm capitalize text-muted-foreground"
                  >
                    {conversation.source}
                  </Badge>
                ) : null}
              </div>
            </div>
            <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">
              {preview}
            </div>
            {bookingSummary ? (
              <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                <Badge
                  variant="outline"
                  className="border-emerald-200 bg-emerald-50 text-emerald-900"
                >
                  Booking
                </Badge>
                <span className="line-clamp-1">{bookingSummary}</span>
              </div>
            ) : null}
          </div>
        </Link>
        <DropdownMenu>
          {bookingHref ? (
            <Button
              variant="ghost"
              size="icon"
              aria-label="Open related booking"
              className="text-muted-foreground hover:text-emerald-600"
              asChild
            >
              <Link href={bookingHref}>
                <CalendarDays className="h-4 w-4" />
                <span className="sr-only">{bookingActionLabel}</span>
              </Link>
            </Button>
          ) : null}
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Conversation actions"
              className="text-muted-foreground"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => {
                if (!opening) {
                  onOpen();
                }
                router.push(`/conversations/${conversation.id}`);
              }}
            >
              Open
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              onClick={() => onDelete(conversation.id)}
              disabled={deleting}
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
