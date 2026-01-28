import type { InboxCounts } from "@/types/inbox";

export const INBOX_COUNTS_EVENT = "inbox-counts-updated";

export const dispatchInboxCounts = (counts: InboxCounts) => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(INBOX_COUNTS_EVENT, { detail: counts }));
};
