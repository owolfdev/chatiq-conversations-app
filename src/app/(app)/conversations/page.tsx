import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getConversations } from "@/app/actions/conversations/get-conversations";
import { getUserBotsWithCounts } from "@/app/actions/bots/get-user-bots-with-counts";
import { ConversationsList } from "@/components/conversations/list";

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
    redirect("/sign-in?redirect=/conversations");
  }

  const botContext = await getUserBotsWithCounts();
  const activeTeamId = botContext.team.id;

  const conversations = await getConversations(activeTeamId);
  const teamBots = botContext.team.bots.map((bot) => ({
    id: bot.id,
    name: bot.name,
  }));

  return (
    <ConversationsList
      initialConversations={conversations}
      teamId={activeTeamId}
      initialBots={teamBots}
    />
  );
}
