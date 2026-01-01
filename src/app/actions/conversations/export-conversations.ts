// src/app/actions/conversations/export-conversations.ts
"use server";

import { createClient } from "@/utils/supabase/server";

export interface ExportConversationsParams {
  teamId?: string | null;
  botId?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  format: "csv" | "json";
}

export interface ConversationExportData {
  conversation_id: string;
  bot_name: string;
  bot_slug: string;
  title: string | null;
  created_at: string;
  message_count: number;
  messages: Array<{
    sender: string;
    content: string;
    created_at: string;
  }>;
}

export async function getConversationsForExport(
  params: ExportConversationsParams
): Promise<ConversationExportData[]> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Unauthorized");
  }

  // Get user's team IDs if no teamId specified
  let teamIds: string[] = [];
  if (!params.teamId) {
    const { data: memberships } = await supabase
      .from("bot_team_members")
      .select("team_id")
      .eq("user_id", user.id);
    teamIds = memberships?.map((m) => m.team_id) || [];
  } else {
    teamIds = [params.teamId];
  }

  if (teamIds.length === 0) {
    return [];
  }

  // Build query for conversations
  let query = supabase
    .from("bot_conversations")
    .select(
      "id, title, created_at, bot_id, bot_bots!inner(id, name, slug, team_id)"
    )
    .in("bot_bots.team_id", teamIds);

  // Filter by bot if specified
  if (params.botId) {
    query = query.eq("bot_id", params.botId);
  }

  // Filter by date range if specified
  if (params.startDate) {
    query = query.gte("created_at", params.startDate);
  }
  if (params.endDate) {
    query = query.lte("created_at", params.endDate);
  }

  const { data: conversations, error } = await query.order("created_at", {
    ascending: false,
  });

  if (error) {
    console.error("Failed to fetch conversations:", error);
    throw new Error("Failed to fetch conversations");
  }

  if (!conversations || conversations.length === 0) {
    return [];
  }

  // Fetch messages for all conversations
  const conversationIds = conversations.map((c) => c.id);
  const { data: messages, error: messagesError } = await supabase
    .from("bot_messages")
    .select("conversation_id, sender, content, created_at")
    .in("conversation_id", conversationIds)
    .order("created_at", { ascending: true });

  if (messagesError) {
    console.error("Failed to fetch messages:", messagesError);
    throw new Error("Failed to fetch messages");
  }

  // Group messages by conversation
  const messagesByConversation = new Map<string, typeof messages>();
  if (messages) {
    for (const message of messages) {
      const convId = message.conversation_id;
      if (!messagesByConversation.has(convId)) {
        messagesByConversation.set(convId, []);
      }
      messagesByConversation.get(convId)!.push(message);
    }
  }

  // Format export data
  const exportData: ConversationExportData[] = conversations.map((conv) => {
    const bot = Array.isArray(conv.bot_bots) ? conv.bot_bots[0] : conv.bot_bots;
    const convMessages = messagesByConversation.get(conv.id) || [];

    return {
      conversation_id: conv.id,
      bot_name: bot?.name || "Unknown",
      bot_slug: bot?.slug || "unknown",
      title: conv.title,
      created_at: conv.created_at,
      message_count: convMessages.length,
      messages: convMessages.map((msg) => ({
        sender: msg.sender === "bot" ? "assistant" : "user",
        content: msg.content,
        created_at: msg.created_at,
      })),
    };
  });

  return exportData;
}
