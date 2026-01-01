"use server";

import { createClient } from "@/utils/supabase/server";
import type { ChatRole } from "@/types/chat";

export interface RecentConversation {
  id: string;
  title: string | null;
  createdAt: string;
  bot: {
    id: string;
    name: string;
    slug: string;
  };
  messageCount: number;
  lastMessage?: {
    content: string;
    sender: ChatRole;
    createdAt: string;
  };
}

type ConversationRow = {
  id: string;
  title: string | null;
  created_at: string;
  bot_id: string;
  bot: {
    id: string;
    name: string;
    slug: string;
    user_id: string;
  };
};

type MessageRow = {
  conversation_id: string;
  content: string;
  sender: string;
  created_at: string;
};

type SupabaseConversationRow = {
  id: string;
  title: string | null;
  created_at: string;
  bot_id: string;
  bot_bots: {
    id: string;
    name: string;
    slug: string;
    user_id: string;
    team_id: string | null;
  }[];
};

export async function getRecentConversations(
  limit = 5,
  teamId?: string | null
): Promise<RecentConversation[]> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return [];
  }

  let query = supabase
    .from("bot_conversations")
    .select(
      "id, title, created_at, bot_id, bot_bots!inner(id, name, slug, user_id, team_id)"
    );

  // If teamId is provided, filter by team_id; otherwise filter by user_id (legacy behavior)
  if (teamId) {
    query = query.eq("bot_bots.team_id", teamId);
  } else {
    query = query.eq("bot_bots.user_id", user.id);
  }

  const { data: conversations, error } = await query
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !conversations) {
    console.error("Failed to fetch recent conversations:", error);
    return [];
  }

  const normalizedConversations: ConversationRow[] =
    (conversations as SupabaseConversationRow[]).map((conversation) => {
    const bot =
      Array.isArray(conversation.bot_bots) && conversation.bot_bots.length > 0
        ? conversation.bot_bots[0]
        : conversation.bot_bots;

    if (!bot || Array.isArray(bot)) {
      throw new Error("Invalid bot relationship data for conversation");
    }

    return {
      id: conversation.id,
      title: conversation.title,
      created_at: conversation.created_at,
      bot_id: conversation.bot_id,
      bot,
    };
  });

  const conversationIds = normalizedConversations.map(
    (conversation) => conversation.id
  );

  if (!conversationIds.length) {
    return [];
  }

  const { data: messages, error: messageError } = await supabase
    .from("bot_messages")
    .select("conversation_id, content, sender, created_at")
    .in("conversation_id", conversationIds)
    .order("created_at", { ascending: false });

  if (messageError) {
    console.error("Failed to fetch conversation messages:", messageError);
  }

  const messageCountMap = new Map<string, number>();
  const lastMessageMap = new Map<string, RecentConversation["lastMessage"]>();

  if (messages) {
    for (const message of messages as MessageRow[]) {
      const currentCount = messageCountMap.get(message.conversation_id) ?? 0;
      messageCountMap.set(message.conversation_id, currentCount + 1);

      if (!lastMessageMap.has(message.conversation_id)) {
        lastMessageMap.set(message.conversation_id, {
          content: message.content,
          sender: message.sender === "bot" ? "assistant" : "user",
          createdAt: message.created_at,
        });
      }
    }
  }

  return normalizedConversations.map((conversation) => ({
    id: conversation.id,
    title: conversation.title,
    createdAt: conversation.created_at,
    bot: {
      id: conversation.bot.id,
      name: conversation.bot.name,
      slug: conversation.bot.slug,
    },
    messageCount: messageCountMap.get(conversation.id) ?? 0,
    lastMessage: lastMessageMap.get(conversation.id),
  }));
}


