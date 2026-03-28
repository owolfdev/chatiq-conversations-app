/**
 * Curated topic labels for home-page shortcuts → `/conversations?topic=…`
 * (must match conversation `topic` values the classifier uses).
 */
export const HOME_TOPIC_SHORTCUTS = [
  "Booking / Reservation / Appointment",
  "Cancellation / Reschedule / Refunds",
  "Needs Human",
  "Complaint / Dissatisfaction",
  "Order Status / ETA",
  "Payment Issues",
  "Product / Service Inquiry",
  "Availability / Hours / Location",
  "General Inquiry",
] as const;
