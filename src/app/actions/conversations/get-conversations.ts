"use server";

import { createClient } from "@/utils/supabase/server";
import { getUserTeamId } from "@/lib/teams/get-user-team-id";
import { expandStoredTopicValues } from "@/lib/inbox/inbox-topic-shortcuts";
import { CONVERSATION_HOST_BOT_EMBED } from "@/lib/conversations/bot-conversation-bot-relationship";
import type {
  ConversationBookingContext,
  ConversationListItem,
} from "@/types/conversations";

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

type LinkedBookingRow = {
  id: string;
  conversation_id: string | null;
  reference_number: string | null;
  status: "pending" | "confirmed" | "cancelled";
  start_at: string | null;
  appointment_timezone: string | null;
  created_at: string;
};

const getUserLabel = (sourceDetail: ConversationListItem["source_detail"]) => {
  if (!sourceDetail || typeof sourceDetail !== "object") {
    return "";
  }
  const detail = sourceDetail as Record<string, unknown>;
  const candidates = [
    detail.line_display_name,
    detail.instagram_username,
    detail.instagram_user_id,
    detail.twilio_profile_name,
    detail.facebook_display_name,
    detail.whatsapp_profile_name,
    detail.facebook_profile_name,
    detail.whatsapp_display_name,
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

function getLinkedBookingPriority(booking: LinkedBookingRow) {
  let score = 0;
  if (booking.status !== "cancelled") {
    score += 10;
  }
  if (booking.start_at) {
    score += 5;
  }
  if (booking.status === "confirmed") {
    score += 2;
  }
  return score;
}

function shouldExposeLinkedBookingInInbox(
  booking: LinkedBookingRow,
  nowMs: number
): boolean {
  if (booking.status === "cancelled") {
    return false;
  }

  if (!booking.start_at) {
    return true;
  }

  const startAtMs = new Date(booking.start_at).getTime();
  if (!Number.isFinite(startAtMs)) {
    return true;
  }

  return startAtMs >= nowMs;
}

function buildConversationBookingContext(
  bookings: LinkedBookingRow[],
  nowMs = Date.now()
): ConversationBookingContext | null {
  const visibleBookings = bookings.filter((booking) =>
    shouldExposeLinkedBookingInInbox(booking, nowMs)
  );

  if (visibleBookings.length === 0) {
    return null;
  }

  const primaryBooking = [...visibleBookings].sort((a, b) => {
    const priorityDelta =
      getLinkedBookingPriority(b) - getLinkedBookingPriority(a);
    if (priorityDelta !== 0) {
      return priorityDelta;
    }

    return (
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  })[0];

  return {
    total: visibleBookings.length,
    scheduled: visibleBookings.filter((booking) => Boolean(booking.start_at))
      .length,
    unscheduled: visibleBookings.filter((booking) => !booking.start_at).length,
    primary_booking_id: primaryBooking.id,
    primary_reference_number: primaryBooking.reference_number,
    primary_status: primaryBooking.status,
    primary_start_at: primaryBooking.start_at,
    primary_appointment_timezone: primaryBooking.appointment_timezone,
  };
}

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

  const activeTeamId = teamId || (await getUserTeamId(user.id));

  if (!activeTeamId) {
    return [];
  }

  let query = supabase
    .from("bot_conversations")
    .select(
      `id, title, topic, resolution_status, topic_message_preview, topic_message_at, created_at, last_message_at, last_opened_at, source, source_detail, bot_id, ${CONVERSATION_HOST_BOT_EMBED}(id, name, slug, team_id)`
    )
    .eq("bot_bots.team_id", activeTeamId);

  if (botId) {
    query = query.eq("bot_id", botId);
  }

  const topicValues = expandStoredTopicValues(filters.topic);
  if (topicValues) {
    query =
      topicValues.length === 1
        ? query.eq("topic", topicValues[0])
        : query.in("topic", topicValues);
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
        `source_detail->>instagram_username.ilike.%${term}%`,
        `source_detail->>instagram_user_id.ilike.%${term}%`,
        `source_detail->>twilio_profile_name.ilike.%${term}%`,
        `source_detail->>facebook_display_name.ilike.%${term}%`,
        `source_detail->>whatsapp_profile_name.ilike.%${term}%`,
        `source_detail->>facebook_profile_name.ilike.%${term}%`,
        `source_detail->>whatsapp_display_name.ilike.%${term}%`,
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
  } else if (sortBy === "last_message_at") {
    query = query.order("last_message_at", {
      ascending: sortDir === "asc",
      nullsFirst: false,
    });
  } else {
    query = query.order("created_at", { ascending: false });
  }

  const { data: conversations, error } = await query.limit(limit);

  if (error || !conversations) {
    console.error(
      "Failed to fetch conversations:",
      error?.message,
      error?.hint,
      error?.details
    );
    return [];
  }

  const conversationIds = conversations.map((c) => c.id);
  const { data: messages } = await supabase
    .from("bot_messages")
    .select("conversation_id, created_at")
    .in("conversation_id", conversationIds)
    .order("created_at", { ascending: false });

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

  const bookingContextByConversation = new Map<
    string,
    ConversationBookingContext
  >();

  if (conversationIds.length > 0) {
    const { data: linkedBookings, error: bookingError } = await supabase
      .from("bookings")
      .select(
        "id, conversation_id, reference_number, status, start_at, appointment_timezone, created_at"
      )
      .eq("team_id", activeTeamId)
      .in("conversation_id", conversationIds)
      .order("created_at", { ascending: false });

    if (bookingError) {
      console.error(
        "Failed to fetch linked bookings for conversations:",
        bookingError
      );
    } else {
      const bookingsByConversation = new Map<string, LinkedBookingRow[]>();

      for (const booking of (linkedBookings ?? []) as LinkedBookingRow[]) {
        if (!booking.conversation_id) {
          continue;
        }
        const current = bookingsByConversation.get(booking.conversation_id) ?? [];
        current.push(booking);
        bookingsByConversation.set(booking.conversation_id, current);
      }

      const nowMs = Date.now();
      for (const [conversationId, bookings] of bookingsByConversation.entries()) {
        const context = buildConversationBookingContext(bookings, nowMs);
        if (context) {
          bookingContextByConversation.set(conversationId, context);
        }
      }
    }
  }

  const formatted = conversations.map((conv) => {
    const bot = Array.isArray(conv.bot_bots) ? conv.bot_bots[0] : conv.bot_bots;
    const lastMessageAt =
      (conv as { last_message_at?: string | null }).last_message_at ??
      lastMessageTimes.get(conv.id) ??
      null;
    const lastOpenedAt = (conv as { last_opened_at?: string | null })
      .last_opened_at;
    const hasUnread =
      Boolean(lastMessageAt) &&
      (!lastOpenedAt ||
        new Date(lastMessageAt as string).getTime() >
          new Date(lastOpenedAt).getTime());

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
      last_message_at: lastMessageAt,
      has_unread: hasUnread,
      booking_context: bookingContextByConversation.get(conv.id) ?? null,
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
