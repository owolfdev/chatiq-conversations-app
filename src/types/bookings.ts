export type BookingStatus = "pending" | "confirmed" | "cancelled";

export type BookingSummary = {
  id: string;
  reference_number: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  service_type: string | null;
  requested_date_text: string | null;
  requested_time_slot: string | null;
  status: BookingStatus;
  created_at: string;
  workflow_id: string | null;
};

export type BookingDetail = BookingSummary & {
  requested_date: string | null;
  requested_time_text: string | null;
  appointment_date: string | null;
  appointment_timezone: string | null;
  confirmation_message: string | null;
  special_notes: string | null;
  data: Record<string, unknown> | null;
  conversation_id: string | null;
  workflow_name: string | null;
};

export type BookingWorkflow = {
  id: string;
  name: string;
  description: string | null;
  is_default: boolean;
  created_at: string;
};
