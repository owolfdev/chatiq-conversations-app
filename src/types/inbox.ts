export type InboxCounts = {
  openConversations: number;
  pendingBookings: number;
  upcomingConfirmedBookings: number;
  unscheduledBookings: number;
  /** Counts per home shortcut (`id` from `inbox-topic-shortcuts` / `HOME_TOPIC_SHORTCUTS`). */
  topicShortcutCounts?: Record<string, number>;
};
