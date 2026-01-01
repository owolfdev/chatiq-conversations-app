// lib/chat/save-chat.ts
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import {
  ensureQuotaAllows,
  getTeamPlan,
  type PlanId,
} from "@/lib/teams/usage";
import type { SupabaseClient } from "@supabase/supabase-js";
import { logAnalyticsEvent } from "@/lib/analytics/log-analytics-event";
import { updateConversationTopic } from "@/lib/conversations/update-conversation-topic";
import { markConversationUnresolved } from "@/lib/conversations/update-conversation-resolution";

interface SaveChatOptions {
  botId: string;
  userId?: string;
  teamId?: string; // Optional teamId - if provided, use it; otherwise look up from bot
  message: string;
  response: string;
  conversationId?: string | null;
  ipAddress?: string;
  source?: string;
  sourceDetail?: Record<string, unknown>;
  useAdminClient?: boolean; // Use admin client to bypass RLS (for API key requests)
  supabaseClient?: SupabaseClient;
  plan?: PlanId;
  skipQuotaCheck?: boolean;
}

export async function saveChatToDatabase({
  botId,
  userId,
  teamId,
  message,
  response,
  conversationId,
  ipAddress,
  source,
  sourceDetail,
  useAdminClient = false,
  supabaseClient,
  plan,
  skipQuotaCheck,
}: SaveChatOptions): Promise<string> {
  let supabase: SupabaseClient;

  if (supabaseClient) {
    supabase = supabaseClient;
  } else if (useAdminClient) {
    supabase = createAdminClient();
  } else {
    supabase = await createClient();
  }

  let newConversationId = conversationId;
  let botTeamId = teamId;

  // 1. Create new conversation if none
  if (!newConversationId) {
    // Get team_id from bot if not provided (required for RLS)
    if (!botTeamId) {
      const { data: bot } = await supabase
        .from("bot_bots")
        .select("team_id")
        .eq("id", botId)
        .single();

      if (!bot?.team_id) {
        throw new Error("Bot not found or missing team_id");
      }
      botTeamId = bot.team_id;
    }

    const { data, error } = await supabase
      .from("bot_conversations")
      .insert({
        bot_id: botId,
        team_id: botTeamId, // Required for RLS
        user_id: userId ?? null,
        title: message,
        ip_address: ipAddress ?? null,
        source: source ?? null,
        source_detail: sourceDetail ?? null,
      })
      .select("id")
      .single();

    if (error || !data?.id) {
      console.error("❌ Failed to create conversation:", error);

      if (!useAdminClient && error?.code === "42501") {
        return saveChatToDatabase({
          botId,
          userId,
          teamId,
          message,
          response,
          conversationId,
          ipAddress,
          source,
          sourceDetail,
          useAdminClient: true,
          plan,
          skipQuotaCheck,
        });
      }

      throw new Error("Could not create new conversation");
    }

    newConversationId = data.id;

    if (botTeamId) {
      await logAnalyticsEvent({
        teamId: botTeamId,
        botId,
        conversationId: newConversationId,
        userId: userId ?? null,
        eventType: "conversation_started",
        metadata: { source: "chat" },
      });
    }
  }

  if (!newConversationId) {
    throw new Error("Invalid conversation ID");
  }

  if (!botTeamId) {
    const { data: convo } = await supabase
      .from("bot_conversations")
      .select("team_id")
      .eq("id", newConversationId)
      .single();

    if (!convo?.team_id) {
      throw new Error("Conversation missing team association");
    }
    botTeamId = convo.team_id;
  }

  if (!botTeamId) {
    throw new Error("Team context is required to save chat history");
  }

  let teamPlan: PlanId | undefined = plan;
  if (!teamPlan) {
    teamPlan = await getTeamPlan(botTeamId);
  }

  if (!skipQuotaCheck) {
    const messageIncrement = 1 + (response?.trim() ? 1 : 0);
    await ensureQuotaAllows(
      botTeamId,
      teamPlan,
      "messagesMonthly",
      messageIncrement
    );
  }

  // 2. Save user message
  const { error: userMessageError } = await supabase
    .from("bot_messages")
    .insert({
      conversation_id: newConversationId,
      sender: "user",
      content: message,
    });

  if (userMessageError) {
    console.error("❌ Failed to save user message:", userMessageError);

    if (!useAdminClient && userMessageError.code === "42501") {
      return saveChatToDatabase({
        botId,
        userId,
        teamId,
        message,
        response,
        conversationId: newConversationId,
        ipAddress,
        source,
        sourceDetail,
        useAdminClient: true,
        plan: teamPlan,
        skipQuotaCheck,
      });
    }
  } else {
    await logAnalyticsEvent({
      teamId: botTeamId,
      botId,
      conversationId: newConversationId,
      userId: userId ?? null,
      eventType: "message_user",
      metadata: { source: "chat" },
    });
    await markConversationUnresolved({
      supabase,
      conversationId: newConversationId,
    });
    try {
      await updateConversationTopic({
        supabase,
        conversationId: newConversationId,
      });
    } catch (error) {
      console.error("Failed to update conversation topic", error);
    }
  }

  // 3. Save assistant message only if valid
  if (response?.trim()) {
    const { error: assistantMessageError, data: assistantData } = await supabase
      .from("bot_messages")
      .insert({
        conversation_id: newConversationId,
        sender: "bot",
        content: response.trim(),
      });

    if (assistantMessageError) {
      console.error(
        "❌ Failed to save assistant message:",
        assistantMessageError
      );

      if (!useAdminClient && assistantMessageError.code === "42501") {
      return saveChatToDatabase({
        botId,
        userId,
        teamId,
        message,
        response,
        conversationId: newConversationId,
        ipAddress,
        source,
        sourceDetail,
        useAdminClient: true,
        plan: teamPlan,
        skipQuotaCheck,
      });
    }
    } else {
      console.log("✅ Assistant message saved:", assistantData);
      await logAnalyticsEvent({
        teamId: botTeamId,
        botId,
        conversationId: newConversationId,
        userId: userId ?? null,
        eventType: "message_bot",
        metadata: { source: "chat" },
      });
    }
  }

  return newConversationId;
}
