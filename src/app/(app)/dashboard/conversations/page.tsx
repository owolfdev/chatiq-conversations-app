// src/app/dashboard/conversations/page.tsx
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getConversations } from "@/app/actions/conversations/get-conversations";
import { getUserBotsWithCounts } from "@/app/actions/bots/get-user-bots-with-counts";
import ConversationsClient from "./conversations-client";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Conversations",
};

export default async function ConversationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/sign-in?redirect=/dashboard/conversations");
  }

  const botContext = await getUserBotsWithCounts();
  const activeTeamId = botContext.team.id;
  const activeTeamName = botContext.team.name;

  const conversations = await getConversations(activeTeamId);
  const teamBots = botContext.team.bots.map((bot) => ({
    id: bot.id,
    name: bot.name,
  }));

  return (
    <ConversationsClient
      initialConversations={conversations}
      teamName={activeTeamName}
      teamId={activeTeamId}
      initialBots={teamBots}
    />
  );
}
