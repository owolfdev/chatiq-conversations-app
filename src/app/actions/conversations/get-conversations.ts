// src/app/actions/conversations/get-conversations.ts
"use server";

import { createClient } from "@/utils/supabase/server";
import { getUserTeamId } from "@/lib/teams/get-user-team-id";

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

type ConversationSortKey =
  | "last_message_at"
  | "message_count"
  | "topic"
  | "source"
  | "status"
  | "user";

type ConversationFilters = {
  limit?: number;
  topic?: string | null;
  status?: "resolved" | "unresolved" | "all" | null;
  source?: string | null;
  userQuery?: string | null;
  detailQuery?: string | null;
  sortBy?: ConversationSortKey;
  sortDir?: "asc" | "desc";
};

const getUserLabel = (sourceDetail: ConversationListItem["source_detail"]) => {
  if (!sourceDetail || typeof sourceDetail !== "object") {
    return "";
  }
  const detail = sourceDetail as Record<string, unknown>;
  const candidates = [
    detail.line_display_name,
    detail.facebook_display_name,
    detail.whatsapp_profile_name,
    detail.customer_name,
    detail.label,
  ];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }
  return "";
};

export async function getConversations(
  teamId?: string | null,
  botId?: string | null,
  filters: ConversationFilters = {}
): Promise<ConversationListItem[]> {
  const limit = filters.limit ?? 50;
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return [];
  }

  // Get active team ID
  const activeTeamId = teamId || (await getUserTeamId(user.id));

  if (!activeTeamId) {
    return [];
  }

  // Build query
  let query = supabase
    .from("bot_conversations")
    .select(
      "id, title, topic, resolution_status, topic_message_preview, topic_message_at, created_at, source, source_detail, bot_id, bot_bots!inner(id, name, slug, team_id)"
    )
    .eq("bot_bots.team_id", activeTeamId);

  if (botId) {
    query = query.eq("bot_id", botId);
  }

  if (filters.topic && filters.topic !== "all") {
    query = query.eq("topic", filters.topic);
  }

  if (filters.status && filters.status !== "all") {
    query = query.eq("resolution_status", filters.status);
  }

  if (filters.source && filters.source !== "all") {
    query = query.eq("source", filters.source);
  }

  if (filters.userQuery && filters.userQuery.trim()) {
    const term = filters.userQuery.trim().replace(/%/g, "\\%");
    query = query.or(
      [
        `source_detail->>line_display_name.ilike.%${term}%`,
        `source_detail->>facebook_display_name.ilike.%${term}%`,
        `source_detail->>whatsapp_profile_name.ilike.%${term}%`,
        `source_detail->>customer_name.ilike.%${term}%`,
        `source_detail->>label.ilike.%${term}%`,
      ].join(",")
    );
  }

  if (filters.detailQuery && filters.detailQuery.trim()) {
    const term = filters.detailQuery.trim().replace(/%/g, "\\%");
    query = query.or(
      [
        `source_detail->>label.ilike.%${term}%`,
        `source_detail->>origin.ilike.%${term}%`,
      ].join(",")
    );
  }

  const sortBy = filters.sortBy ?? "last_message_at";
  const sortDir = filters.sortDir ?? "desc";

  if (sortBy === "topic") {
    query = query.order("topic", { ascending: sortDir === "asc" });
  } else if (sortBy === "source") {
    query = query.order("source", { ascending: sortDir === "asc" });
  } else if (sortBy === "status") {
    query = query.order("resolution_status", {
      ascending: sortDir === "asc",
    });
  } else {
    query = query.order("created_at", { ascending: false });
  }

  const { data: conversations, error } = await query
    .limit(limit);

  if (error || !conversations) {
    console.error("Failed to fetch conversations:", error);
    return [];
  }

  // Get message counts and last message times
  const conversationIds = conversations.map((c) => c.id);
  const { data: messages } = await supabase
    .from("bot_messages")
    .select("conversation_id, created_at")
    .in("conversation_id", conversationIds)
    .order("created_at", { ascending: false });

  // Group messages by conversation
  const messageCounts = new Map<string, number>();
  const lastMessageTimes = new Map<string, string>();

  if (messages) {
    for (const msg of messages) {
      const convId = msg.conversation_id;
      messageCounts.set(convId, (messageCounts.get(convId) || 0) + 1);
      if (!lastMessageTimes.has(convId)) {
        lastMessageTimes.set(convId, msg.created_at);
      }
    }
  }

  // Format results
  const formatted = conversations.map((conv) => {
    const bot = Array.isArray(conv.bot_bots) ? conv.bot_bots[0] : conv.bot_bots;

    return {
      id: conv.id,
      title: conv.title,
      topic: conv.topic ?? null,
      resolution_status: conv.resolution_status ?? "unresolved",
      topic_message_preview: conv.topic_message_preview ?? null,
      topic_message_at: conv.topic_message_at ?? null,
      created_at: conv.created_at,
      source: conv.source ?? null,
      source_detail: (conv.source_detail as Record<string, unknown>) ?? null,
      bot_id: conv.bot_id,
      bot_name: bot?.name || "Unknown",
      bot_slug: bot?.slug || "unknown",
      message_count: messageCounts.get(conv.id) || 0,
      last_message_at: lastMessageTimes.get(conv.id) || null,
    };
  });

  if (sortBy === "message_count") {
    return formatted.sort((a, b) => {
      const diff = a.message_count - b.message_count;
      return sortDir === "asc" ? diff : -diff;
    });
  }

  if (sortBy === "last_message_at") {
    return formatted.sort((a, b) => {
      const aTime = a.last_message_at
        ? new Date(a.last_message_at).getTime()
        : 0;
      const bTime = b.last_message_at
        ? new Date(b.last_message_at).getTime()
        : 0;
      const diff = aTime - bTime;
      return sortDir === "asc" ? diff : -diff;
    });
  }

  if (sortBy === "user") {
    return formatted.sort((a, b) => {
      const aLabel = getUserLabel(a.source_detail).toLowerCase();
      const bLabel = getUserLabel(b.source_detail).toLowerCase();
      if (aLabel === bLabel) {
        return 0;
      }
      const diff = aLabel < bLabel ? -1 : 1;
      return sortDir === "asc" ? diff : -diff;
    });
  }

  return formatted;
}
