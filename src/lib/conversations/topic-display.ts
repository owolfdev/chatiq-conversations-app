const TOPIC_SHORT_LABELS: Record<string, string> = {
  "Greeting / Small Talk": "Greeting",
  "Booking / Reservation / Appointment": "Booking",
  "Booking Request": "Booking",
  "Availability / Hours / Location": "Hours/Loc",
  "Availability / Hours": "Hours/Loc",
  "Pricing / Fees / Quotes": "Pricing",
  "Pricing Question": "Pricing",
  "Order Status / ETA": "Order",
  "Order Status": "Order",
  "Cancellation / Reschedule / Refunds": "Cancel/Refund",
  "Refund or Cancel": "Cancel/Refund",
  "Complaint / Dissatisfaction": "Complaint",
  "Complaint / Negative Sentiment": "Complaint",
  "Product / Service Inquiry": "Product/Service",
  "Payment Issues": "Payment",
  "Technical Issue": "Tech",
  "Resolved Issue": "Resolved",
  "Needs Human": "Needs Human",
  "Human Agent Request": "Human",
  "Needs Immediate Attention": "Urgent",
  "General Inquiry": "General",
};

const TOPIC_BADGE_CLASSES: Record<string, string> = {
  "Greeting / Small Talk":
    "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-300",
  "Booking / Reservation / Appointment":
    "border-blue-300 bg-blue-100 text-blue-700 dark:border-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
  "Booking Request":
    "border-blue-300 bg-blue-100 text-blue-700 dark:border-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
  "Availability / Hours / Location":
    "border-cyan-300 bg-cyan-100 text-cyan-700 dark:border-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300",
  "Availability / Hours":
    "border-cyan-300 bg-cyan-100 text-cyan-700 dark:border-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300",
  "Pricing / Fees / Quotes":
    "border-indigo-300 bg-indigo-100 text-indigo-700 dark:border-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300",
  "Pricing Question":
    "border-indigo-300 bg-indigo-100 text-indigo-700 dark:border-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300",
  "Order Status / ETA":
    "border-sky-300 bg-sky-100 text-sky-700 dark:border-sky-700 dark:bg-sky-950/40 dark:text-sky-300",
  "Order Status":
    "border-sky-300 bg-sky-100 text-sky-700 dark:border-sky-700 dark:bg-sky-950/40 dark:text-sky-300",
  "Cancellation / Reschedule / Refunds":
    "border-red-300 bg-red-100 text-red-700 dark:border-red-700 dark:bg-red-950/40 dark:text-red-300",
  "Refund or Cancel":
    "border-red-300 bg-red-100 text-red-700 dark:border-red-700 dark:bg-red-950/40 dark:text-red-300",
  "Complaint / Dissatisfaction":
    "border-rose-300 bg-rose-100 text-rose-700 dark:border-rose-700 dark:bg-rose-950/40 dark:text-rose-300",
  "Complaint / Negative Sentiment":
    "border-rose-300 bg-rose-100 text-rose-700 dark:border-rose-700 dark:bg-rose-950/40 dark:text-rose-300",
  "Product / Service Inquiry":
    "border-violet-300 bg-violet-100 text-violet-700 dark:border-violet-700 dark:bg-violet-950/40 dark:text-violet-300",
  "Payment Issues":
    "border-orange-300 bg-orange-100 text-orange-700 dark:border-orange-700 dark:bg-orange-950/40 dark:text-orange-300",
  "Technical Issue":
    "border-orange-300 bg-orange-100 text-orange-700 dark:border-orange-700 dark:bg-orange-950/40 dark:text-orange-300",
  "Resolved Issue":
    "border-emerald-300 bg-emerald-100 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  "Needs Human":
    "border-amber-300 bg-amber-100 text-amber-800 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  "Human Agent Request":
    "border-amber-300 bg-amber-100 text-amber-800 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  "Needs Immediate Attention":
    "border-red-400 bg-red-100 text-red-800 dark:border-red-700 dark:bg-red-950/50 dark:text-red-300",
  "General Inquiry":
    "border-zinc-300 bg-zinc-100 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-300",
};

export function getTopicShortLabel(topic: string | null | undefined): string {
  const normalized = topic?.trim();
  if (!normalized) {
    return TOPIC_SHORT_LABELS["General Inquiry"];
  }
  return TOPIC_SHORT_LABELS[normalized] ?? normalized;
}

export function getTopicBadgeClass(topic: string | null | undefined): string {
  const normalized = topic?.trim();
  if (!normalized) {
    return TOPIC_BADGE_CLASSES["General Inquiry"];
  }
  return TOPIC_BADGE_CLASSES[normalized] ?? TOPIC_BADGE_CLASSES["General Inquiry"];
}
