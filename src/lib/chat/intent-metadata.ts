/**
 * Read-only helpers for `bot_messages.metadata.intent_signals` in the standalone app.
 * Keep labels aligned with `chatiq/src/lib/chat/intent-metadata.ts` when taxonomy changes.
 */

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export type IntentSignalEntry = {
  key: string;
  source?: string;
  recordedAt?: string;
};

export function getIntentSignalEntries(metadata: unknown): IntentSignalEntry[] {
  if (!isRecord(metadata)) return [];
  const raw = metadata.intent_signals;
  if (!Array.isArray(raw)) return [];
  const out: IntentSignalEntry[] = [];
  for (const item of raw) {
    if (!isRecord(item)) continue;
    if (typeof item.key !== "string" || !item.key.trim()) continue;
    out.push({
      key: item.key,
      source: typeof item.source === "string" ? item.source : undefined,
      recordedAt:
        typeof item.recorded_at === "string" ? item.recorded_at : undefined,
    });
  }
  return out;
}

export function intentSourceDisplayLabel(source?: string): string | undefined {
  if (source == null || typeof source !== "string") return undefined;
  const t = source.trim();
  if (!t) return undefined;
  switch (t) {
    case "canned_response":
      return "Pre-configured response";
    case "canned_action":
      return "Canned action";
    case "llm_inference":
      return "AI inference";
    default:
      return t.replace(/_/g, " ");
  }
}

export function intentKeyDisplayLabel(key: string): string {
  switch (key) {
    case "booking_request":
      return "Booking";
    case "human_agent_request":
      return "Human / agent";
    case "pricing_question":
      return "Pricing";
    case "product_or_service_inquiry":
      return "Product or service";
    case "technical_issue":
      return "Technical issue";
    case "order_status":
      return "Order status";
    case "refund_or_cancel":
      return "Refund / cancel";
    case "complaint_negative_sentiment":
      return "Complaint / negative";
    default:
      return key.replace(/_/g, " ");
  }
}
