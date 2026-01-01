"use server";
import { createClient } from "@/utils/supabase/server";

export async function getDashboardMetrics(teamId?: string | null) {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user?.id) return emptyStats();

  // If teamId is provided, filter by team_id; otherwise filter by user_id (legacy behavior)
  let botsQuery = supabase
    .from("bot_bots")
    .select("id");

  if (teamId) {
    botsQuery = botsQuery.eq("team_id", teamId);
  } else {
    botsQuery = botsQuery.eq("user_id", user.id);
  }

  const { data: bots } = await botsQuery;

  if (!bots || bots.length === 0) return emptyStats();

  const botIds = bots.map((b) => b.id);

  const [{ count: directDocumentCount }, { count: linkedDocumentCount }] =
    await Promise.all([
      supabase
        .from("bot_documents")
        .select("id", { count: "exact", head: true })
        .in("bot_id", botIds),
      supabase
        .from("bot_document_links")
        .select("id", { count: "exact", head: true })
        .in("bot_id", botIds),
    ]);

  const { data: conversations } = await supabase
    .from("bot_conversations")
    .select("id, user_id, session_id, ip_address")
    .in("bot_id", botIds);

  const conversationIds = (conversations || []).map((c) => c.id);

  let messages: Array<{ id: string; sender: string }> = [];
  if (conversationIds.length) {
    const { data } = await supabase
    .from("bot_messages")
      .select("id, sender")
    .in("conversation_id", conversationIds);
    messages = data ?? [];
  }

  const totalDocuments =
    (directDocumentCount ?? 0) + (linkedDocumentCount ?? 0);

  const activeUsers = new Set<string>();
  for (const convo of conversations || []) {
    const key =
      convo.user_id ||
      convo.session_id ||
      convo.ip_address ||
      `anon-${convo.id}`;
    activeUsers.add(key);
  }

  return {
    totalMessages: messages.length,
    totalConversations: conversations?.length || 0,
    activeUsers: activeUsers.size,
    avgResponseTime: 1.2,
    satisfactionRate: 94,
    totalChatbots: botIds.length,
    monthlyGrowth: 23,
    totalDocuments,
    totalApiCalls: messages.filter((message) => message.sender === "user")
      .length,
    chatbotPerformance: [],
    recentActivity: [],
  };
}

function emptyStats() {
  return {
    totalMessages: 0,
    totalConversations: 0,
    activeUsers: 0,
    avgResponseTime: 0,
    satisfactionRate: 0,
    totalChatbots: 0,
    monthlyGrowth: 0,
    totalDocuments: 0,
    totalApiCalls: 0,
    chatbotPerformance: [],
    recentActivity: [],
  };
}
