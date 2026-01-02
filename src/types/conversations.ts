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
}
