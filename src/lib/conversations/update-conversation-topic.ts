import type { SupabaseClient } from "@supabase/supabase-js";
import {
  classifyConversationTopic,
  type ConversationTopic,
} from "@/lib/conversations/topic-classifier";

const isGreetingTopic = (topic: ConversationTopic) =>
  topic === "Greeting / Small Talk";

export async function updateConversationTopic({
  supabase,
  conversationId,
}: {
  supabase: SupabaseClient;
  conversationId: string;
}) {
  const sinceDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: recentMessages, error: recentError } = await supabase
    .from("bot_messages")
    .select("content, created_at")
    .eq("conversation_id", conversationId)
    .eq("sender", "user")
    .gte("created_at", sinceDate)
    .order("created_at", { ascending: false })
    .limit(3);

  if (recentError || !recentMessages || recentMessages.length === 0) {
    return;
  }

  const { count: totalUserMessages } = await supabase
    .from("bot_messages")
    .select("id", { count: "exact", head: true })
    .eq("conversation_id", conversationId)
    .eq("sender", "user")
    .gte("created_at", sinceDate);

  const totalCount = totalUserMessages ?? recentMessages.length;

  const { data: conversation } = await supabase
    .from("bot_conversations")
    .select("topic, topic_source")
    .eq("id", conversationId)
    .maybeSingle();

  const previousTopic = conversation?.topic as ConversationTopic | null;
  const topicSource = typeof conversation?.topic_source === "string"
    ? conversation.topic_source
    : null;

  if (topicSource === "manual") {
    return;
  }

  const { topic, score } = classifyConversationTopic({
    messages: recentMessages.map((message) => message.content),
    totalUserMessages: totalCount,
  });

  if (isGreetingTopic(topic) && previousTopic && !isGreetingTopic(previousTopic)) {
    return;
  }

  if (previousTopic && previousTopic === topic) {
    return;
  }

  const confidence = Math.min(score / 4, 1);

  const triggeringMessage = recentMessages[0];

  await supabase
    .from("bot_conversations")
    .update({
      topic,
      topic_source: "heuristic",
      topic_confidence: confidence,
      topic_updated_at: new Date().toISOString(),
      topic_message_preview: triggeringMessage?.content ?? null,
      topic_message_at: triggeringMessage?.created_at ?? null,
    })
    .eq("id", conversationId);
}
