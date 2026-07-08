/**
 * Inbox topic shortcuts for server-side filters and counts.
 * Keep in sync with `src/lib/conversations/home-topic-shortcuts.ts`.
 */
export type InboxTopicShortcut = {
  id: string;
  displayLabel: string;
  matchTopics: readonly string[];
};

export const INBOX_TOPIC_SHORTCUTS: readonly InboxTopicShortcut[] = [
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

export function expandStoredTopicValues(
  topic: string | null | undefined
): string[] | null {
  if (!topic || topic === "all") {
    return null;
  }
  const trimmed = topic.trim();
  for (const row of INBOX_TOPIC_SHORTCUTS) {
    if (row.matchTopics.includes(trimmed)) {
      return [...row.matchTopics];
    }
  }
  return [trimmed];
}

export function zeroTopicShortcutCountRecord(): Record<string, number> {
  return Object.fromEntries(INBOX_TOPIC_SHORTCUTS.map((s) => [s.id, 0]));
}
