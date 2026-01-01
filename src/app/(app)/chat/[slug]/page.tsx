//src/app/chat/[slug]/page.tsx
import Chat from "@/components/chat/chat";
import { ConversationViewer } from "@/components/chat/conversation-viewer";
import { createClient } from "@/utils/supabase/server";
import { notFound, redirect } from "next/navigation";
import type { ChatMessage } from "@/types/chat";
import { PublicBotLink } from "@/components/bots/public-bot-link";
import Link from "next/link";
import { Code } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ChatPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ conversationId?: string; conversation_id?: string }>;
}

export default async function ChatPage({
  params,
  searchParams,
}: ChatPageProps) {
  const supabase = await createClient();
  const { slug } = await params;
  const search = await searchParams;
  const requestedConversationId =
    search?.conversationId ?? search?.conversation_id ?? null;

  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Require authentication for chatiq.io/chat/[slug] (internal/admin view)
  if (!session?.user) {
    redirect(`/sign-in?redirect=/chat/${slug}`);
  }

  const { data: bot, error } = await supabase
    .from("bot_bots")
    .select("id, name, description, slug, is_public, user_id, status, team_id")
    .eq("slug", slug)
    .maybeSingle();

  if (!bot || error) {
    notFound();
  }

  // Check if user is a team member of the bot's team
  const { data: membership } = await supabase
    .from("bot_team_members")
    .select("id")
    .eq("team_id", bot.team_id)
    .eq("user_id", session.user.id)
    .maybeSingle();

  // Also check if user is the team owner
  const { data: team } = await supabase
    .from("bot_teams")
    .select("owner_id")
    .eq("id", bot.team_id)
    .maybeSingle();

  const isTeamMember = !!membership || team?.owner_id === session.user.id;

  // Require team membership for access (for both public and private bots)
  if (!isTeamMember) {
    notFound();
  }

  const isOwner = session.user.id === bot.user_id;

  // If viewing a historical conversation, show read-only viewer
  if (requestedConversationId) {
    const { data: conversation, error: conversationError } = await supabase
      .from("bot_conversations")
      .select(
        "id, title, topic, resolution_status, created_at, bot_id, source, source_detail, human_takeover, human_takeover_until"
      )
      .eq("id", requestedConversationId)
      .eq("bot_id", bot.id)
      .maybeSingle();

    if (!conversationError && conversation?.id) {
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
        <main className="grow px-3 md:px-4 pt-10 pb-10 bg-[var(--background)] min-h-screen">
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
  }

  // Otherwise, show interactive chat
  return (
    <main className="grow px-3 md:px-4 pt-20 pb-10 bg-[var(--background)] min-h-screen">
      <div className="max-w-3xl mx-auto flex flex-col h-full">
        <div className="pb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-center shrink-0">
            {bot.name}
          </h1>
          <p className="text-center">{bot.description}</p>
          {bot.status === "active" && (
            <div className="mt-4 flex justify-center gap-2 flex-wrap">
              {bot.is_public && (
                <PublicBotLink
                  botSlug={bot.slug}
                  isPublic={bot.is_public}
                  status={bot.status}
                  variant="compact"
                  tooltip="Share this public link to allow anyone to chat with your bot without signing in"
                />
              )}
              <Link href={`/dashboard/bots/${bot.slug}/embed`}>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  <Code className="h-3 w-3" />
                  Embed Widget
                </Button>
              </Link>
            </div>
          )}
        </div>
        <div className="grow relative">
          <div className="h-full overflow-hidden mb-12">
          <Chat
              botSlug={slug}
              initialMessages={undefined}
              initialConversationId={null}
              isInternal={isOwner}
              source="web"
              sourceDetail={{ label: "chatiq-chat", bot_slug: slug }}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
