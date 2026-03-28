import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getUserBotsWithCounts } from "@/app/actions/bots/get-user-bots-with-counts";
import { ConversationsList } from "@/components/conversations/list";
import ConversationsLoading from "./loading";

export const metadata: Metadata = {
  title: "Conversations",
};

type ConversationsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function conversationListKeyFromSearchParams(
  sp: Record<string, string | string[] | undefined>
): string {
  const pick = (k: string) => {
    const v = sp[k];
    if (Array.isArray(v)) return v[0] ?? "";
    return typeof v === "string" ? v : "";
  };
  const parts = [
    pick("topic"),
    pick("botId"),
    pick("bot"),
    pick("status"),
    pick("source"),
  ];
  return parts.every((p) => !p) ? "default" : parts.join("|");
}

export default async function ConversationsPage({
  searchParams,
}: ConversationsPageProps) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/sign-in?redirect=/conversations");
  }

  const botContext = await getUserBotsWithCounts();
  const teamBots = botContext.team.bots.map((bot) => ({
    id: bot.id,
    name: bot.name,
  }));

  const sp = await searchParams;
  const listKey = conversationListKeyFromSearchParams(sp);

  return (
    <Suspense fallback={<ConversationsLoading />}>
      <ConversationsList
        key={listKey}
        initialConversations={[]}
        initialBots={teamBots}
      />
    </Suspense>
  );
}
