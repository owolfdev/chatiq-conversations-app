import { notFound, redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import type { ChatMessage } from "@/types/chat";
import { ConversationViewer } from "@/components/chat/conversation-viewer";
import type { Metadata } from "next";

interface ConversationPageProps {
  params: Promise<{ id: string }>;
}

export const metadata: Metadata = {
  title: "Conversation",
};

export default async function ConversationPage({
  params,
}: ConversationPageProps) {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    redirect("/sign-in?redirect=/conversations");
  }

  const { id } = await params;

  const { data: conversation, error } = await supabase
    .from("bot_conversations")
    .select(
      "id, title, topic, resolution_status, created_at, bot_id, source, source_detail, human_takeover, human_takeover_until, bot_bots(id, name, description, slug, team_id)"
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !conversation) {
    notFound();
  }

  const bot = Array.isArray(conversation.bot_bots)
    ? conversation.bot_bots[0]
    : conversation.bot_bots;

  if (!bot) {
    notFound();
  }

  const { data: membership } = await supabase
    .from("bot_team_members")
    .select("id")
    .eq("team_id", bot.team_id)
    .eq("user_id", session.user.id)
    .maybeSingle();

  const { data: team } = await supabase
    .from("bot_teams")
    .select("owner_id")
    .eq("id", bot.team_id)
    .maybeSingle();

  const isTeamMember = !!membership || team?.owner_id === session.user.id;
  if (!isTeamMember) {
    notFound();
  }

  const { data: messageRows } = await supabase
    .from("bot_messages")
    .select("id, sender, content, created_at")
    .eq("conversation_id", conversation.id)
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });

  const messages: ChatMessage[] = messageRows?.length
    ? messageRows.map((row) => ({
        id: row.id,
        role: row.sender === "bot" ? "assistant" : "user",
        content: row.content,
        createdAt: row.created_at,
      }))
    : [];

  return (
    <main className="min-h-screen bg-background px-4 pb-10 pt-4">
      <ConversationViewer
        conversationId={conversation.id}
        botName={bot.name}
        botDescription={bot.description}
        messages={messages}
        conversationTopic={conversation.topic ?? conversation.title}
        createdAt={conversation.created_at}
        resolutionStatus={conversation.resolution_status ?? "unresolved"}
        conversationSource={conversation.source ?? null}
        customerName={
          typeof conversation.source_detail?.line_display_name === "string"
            ? conversation.source_detail.line_display_name
            : null
        }
        customerAvatarUrl={
          typeof conversation.source_detail?.line_picture_url === "string"
            ? conversation.source_detail.line_picture_url
            : null
        }
        customerStatus={
          typeof conversation.source_detail?.line_status_message === "string"
            ? conversation.source_detail.line_status_message
            : null
        }
        humanTakeover={conversation.human_takeover}
        humanTakeoverUntil={conversation.human_takeover_until}
        interactive
      />
    </main>
  );
}
