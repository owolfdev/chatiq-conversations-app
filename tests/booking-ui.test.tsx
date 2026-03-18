import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

import { BookingScheduleSummaryStrip } from "@/components/bookings/schedule-summary-strip";
import { BookingListItemCard } from "@/components/bookings/list-item";
import { ConversationBookingSummaryStrip } from "@/components/conversations/booking-summary-strip";
import { ConversationListItemCard } from "@/components/conversations/list-item";

describe("inbox booking ui", () => {
  it("renders the operator booking summary strip", () => {
    const markup = renderToStaticMarkup(
      <ConversationBookingSummaryStrip
        openCount={7}
        upcomingBookingsCount={3}
        pendingBookingsCount={2}
        needsScheduleCount={1}
        linkedConversationCount={4}
      />
    );

    expect(markup).toContain("Open");
    expect(markup).toContain(">7<");
    expect(markup).toContain("Upcoming");
    expect(markup).toContain(">3<");
    expect(markup).toContain("Pending");
    expect(markup).toContain(">2<");
    expect(markup).toContain("Needs Schedule");
    expect(markup).toContain(">1<");
    expect(markup).toContain(
      "4 conversations in this view have linked booking history."
    );
  });

  it("renders timezone-aware conversation booking context and schedule cards", () => {
    const conversationMarkup = renderToStaticMarkup(
      <ConversationListItemCard
        conversation={{
          id: "conversation-1",
          title: "Need to confirm",
          topic: "Booking",
          resolution_status: "unresolved",
          topic_message_preview: "Please confirm my appointment.",
          topic_message_at: "2026-03-18T00:00:00.000Z",
          created_at: "2026-03-18T00:00:00.000Z",
          source: "line",
          source_detail: {
            line_display_name: "Alice",
          },
          bot_id: "bot-1",
          bot_name: "Hotel Bot",
          bot_slug: "hotel-bot",
          message_count: 3,
          last_message_at: "2026-03-18T01:00:00.000Z",
          has_unread: true,
          booking_context: {
            total: 2,
            scheduled: 1,
            unscheduled: 1,
            primary_booking_id: "booking-1",
            primary_reference_number: "BK-1001",
            primary_status: "confirmed",
            primary_start_at: "2026-03-19T00:30:00.000Z",
            primary_appointment_timezone: "America/Los_Angeles",
          },
        }}
        onDelete={() => undefined}
        onOpen={() => undefined}
      />
    );

    expect(conversationMarkup).toContain("Alice");
    expect(conversationMarkup).toContain("Booking");
    expect(conversationMarkup).toContain("Ref BK-1001");
    expect(conversationMarkup).toContain("Confirmed");
    expect(conversationMarkup).toContain("Mar 18th, 2026, 5:30PM");
    expect(conversationMarkup).toContain(
      'href="/bookings?conversationId=conversation-1"'
    );

    const bookingMarkup = renderToStaticMarkup(
      <BookingListItemCard
        booking={{
          id: "booking-1",
          reference_number: "BK-1001",
          customer_name: "Alice",
          customer_phone: null,
          service_type: "Consultation",
          requested_date_text: null,
          requested_time_slot: null,
          bookable_item_id: "service-1",
          resource_id: "resource-a",
          start_at: "2026-03-19T00:30:00.000Z",
          end_at: "2026-03-19T01:00:00.000Z",
          appointment_timezone: "America/Los_Angeles",
          status: "confirmed",
          created_at: "2026-03-18T00:00:00.000Z",
          workflow_id: "workflow-1",
          workflow_name: "Default",
          conversation_id: "conversation-1",
        }}
        collisionCount={1}
        onDelete={() => undefined}
      />
    );

    expect(bookingMarkup).toContain("Alice");
    expect(bookingMarkup).toContain("Consultation");
    expect(bookingMarkup).toContain("Default");
    expect(bookingMarkup).toContain("America/Los_Angeles");
    expect(bookingMarkup).toContain("1 overlap");
    expect(bookingMarkup).toContain("Mar 18th, 2026, 5:30PM");
    expect(bookingMarkup).toContain('href="/bookings/booking-1"');
    expect(bookingMarkup).toContain(
      'href="/conversations/conversation-1?back=/bookings/booking-1"'
    );
  });

  it("renders the bookings schedule summary strip with conversation context and collision status", () => {
    const markup = renderToStaticMarkup(
      <BookingScheduleSummaryStrip
        pendingCount={3}
        upcomingCount={4}
        scheduledCount={5}
        needsScheduleCount={2}
        conversationFilter="conversation-1"
        scheduleTimezones={["America/Los_Angeles", "Asia/Bangkok"]}
        overlapCount={3}
      />
    );

    expect(markup).toContain("Pending");
    expect(markup).toContain(">3<");
    expect(markup).toContain("Upcoming");
    expect(markup).toContain(">4<");
    expect(markup).toContain("Scheduled In View");
    expect(markup).toContain(">5<");
    expect(markup).toContain("Needs Schedule");
    expect(markup).toContain(">2<");
    expect(markup).toContain(
      "Viewing bookings linked to the selected conversation context."
    );
    expect(markup).toContain('href="/bookings"');
    expect(markup).toContain("Timezone and collision checks");
    expect(markup).toContain(
      "Grouped by appointment-local date across 2 timezones."
    );
    expect(markup).toContain(
      "3 bookings overlap with another scheduled slot in this visible window."
    );
  });
});
