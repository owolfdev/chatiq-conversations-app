// src/lib/conversations/process-takeover-expirations.ts
import { createAdminClient } from "@/utils/supabase/admin";
import { handleChatRequest } from "@/lib/chat/handle-chat-requests";

type ProcessResult = {
  processed: number;
  responded: number;
  failed: number;
};

export async function processTakeoverExpirations({
  batchSize = 20,
  workerId = "takeover-expiration-worker",
}: {
  batchSize?: number;
  workerId?: string;
}): Promise<ProcessResult> {
  const supabase = createAdminClient();
  const now = new Date().toISOString();

  const { data: expiredConversations, error } = await supabase
    .from("bot_conversations")
    .select("id, bot_id, source, human_takeover_until")
    .eq("human_takeover", true)
    .neq("source", "line")
    .not("human_takeover_until", "is", null)
    .lt("human_takeover_until", now)
    .order("human_takeover_until", { ascending: true })
    .limit(batchSize);

  if (error || !expiredConversations?.length) {
    if (error) {
      console.error("[takeover:worker] Failed to load expired takeovers", {
        error,
        workerId,
      });
    }
    return { processed: 0, responded: 0, failed: 0 };
  }

  let processed = 0;
  let responded = 0;
  let failed = 0;

  for (const conversation of expiredConversations) {
    processed += 1;
    try {
      const { data: cleared } = await supabase
        .from("bot_conversations")
        .update({ human_takeover: false, human_takeover_until: null })
        .eq("id", conversation.id)
        .eq("human_takeover", true)
        .lt("human_takeover_until", now)
        .select("id")
        .maybeSingle();

      if (!cleared) {
        continue;
      }

      const { data: lastMessage } = await supabase
        .from("bot_messages")
        .select("sender, content")
        .eq("conversation_id", conversation.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!lastMessage || lastMessage.sender !== "user") {
        continue;
      }

      const messageText = lastMessage.content?.trim();
      if (!messageText) {
        continue;
      }

      const { data: bot } = await supabase
        .from("bot_bots")
        .select("id, slug")
        .eq("id", conversation.bot_id)
        .maybeSingle();

      if (!bot?.slug) {
        continue;
      }

      const result = await handleChatRequest({
        message: messageText,
        bot_slug: bot.slug,
        bot_id: conversation.bot_id,
        conversation_id: conversation.id,
        isInternal: true,
        private_mode: true,
      });

      const responseText = result.response?.trim();
      if (!responseText) {
        continue;
      }

      await supabase.from("bot_messages").insert({
        conversation_id: conversation.id,
        sender: "bot",
        content: responseText,
      });
      responded += 1;
    } catch (error) {
      failed += 1;
      console.error("[takeover:worker] Failed processing conversation", {
        conversationId: conversation.id,
        workerId,
        error,
      });
    }
  }

  return { processed, responded, failed };
}
