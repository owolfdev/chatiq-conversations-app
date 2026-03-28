export type InboxCounts = {
  openConversations: number;
  pendingBookings: number;
  upcomingConfirmedBookings: number;
  unscheduledBookings: number;
  /** Counts per curated home shortcut topic (exact `topic` column match). */
  topicShortcutCounts?: Record<string, number>;
};
