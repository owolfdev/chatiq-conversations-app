export interface ConversationBookingContext {
  total: number;
  scheduled: number;
  unscheduled: number;
  primary_booking_id: string;
  primary_reference_number: string | null;
  primary_status: "pending" | "confirmed" | "cancelled";
  primary_start_at: string | null;
  primary_appointment_timezone: string | null;
}

export interface ConversationListItem {
  id: string;
  title: string | null;
  topic: string | null;
  resolution_status: "resolved" | "unresolved" | null;
  topic_message_preview: string | null;
  topic_message_at: string | null;
  created_at: string;
  source: string | null;
  source_detail: Record<string, unknown> | null;
  bot_id: string;
  bot_name: string;
  bot_slug: string;
  message_count: number;
  last_message_at: string | null;
  has_unread: boolean;
  booking_context: ConversationBookingContext | null;
}
