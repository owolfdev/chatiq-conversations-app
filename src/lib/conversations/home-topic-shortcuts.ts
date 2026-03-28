/**
 * Inbox home tiles: canonical stored topics + legacy aliases (see chatiq migration
 * `20260302000004_backfill_legacy_conversation_topics.sql`).
 *
 * Keep in sync with `chatiq/src/lib/inbox/inbox-topic-shortcuts.ts`.
 */
export type HomeTopicShortcut = {
  id: string;
  displayLabel: string;
  matchTopics: readonly string[];
};

export const HOME_TOPIC_SHORTCUTS: readonly HomeTopicShortcut[] = [
  {
    id: "booking_request",
    displayLabel: "Booking",
    matchTopics: [
      "Booking Request",
      "Booking / Reservation / Appointment",
    ],
  },
  {
    id: "human_agent_request",
    displayLabel: "Human help",
    matchTopics: ["Human Agent Request", "Needs Human"],
  },
  {
    id: "refund_or_cancel",
    displayLabel: "Refund / cancel",
    matchTopics: [
      "Refund or Cancel",
      "Cancellation / Reschedule / Refunds",
    ],
  },
  {
    id: "complaint",
    displayLabel: "Complaint",
    matchTopics: [
      "Complaint / Negative Sentiment",
      "Complaint / Dissatisfaction",
      "Needs Immediate Attention",
    ],
  },
  {
    id: "order_status",
    displayLabel: "Order status",
    matchTopics: ["Order Status", "Order Status / ETA"],
  },
  {
    id: "technical_issue",
    displayLabel: "Payment / tech",
    matchTopics: ["Technical Issue", "Payment Issues"],
  },
  {
    id: "pricing_question",
    displayLabel: "Pricing",
    matchTopics: ["Pricing Question", "Pricing / Fees / Quotes"],
  },
  {
    id: "availability",
    displayLabel: "Hours / location",
    matchTopics: [
      "Availability / Hours",
      "Availability / Hours / Location",
    ],
  },
  {
    id: "product_or_service_inquiry",
    displayLabel: "Product / service",
    matchTopics: ["Product / Service Inquiry"],
  },
  {
    id: "general_inquiry",
    displayLabel: "General",
    matchTopics: [
      "General Inquiry",
      "Greeting / Small Talk",
      "Resolved Issue",
    ],
  },
];

/** First label = canonical after migration; use for `?topic=` deep links. */
export function homeShortcutCanonicalTopic(
  shortcut: HomeTopicShortcut
): string {
  return shortcut.matchTopics[0] ?? "";
}
