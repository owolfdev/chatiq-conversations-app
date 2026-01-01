// src/app/dashboard/bots/[slug]/tune/page.tsx
import { createClient } from "@/utils/supabase/server";
import { notFound } from "next/navigation";
import type { Bot } from "@/types/bot";
import TuneBotClient from "./tune-bot-client";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ welcome?: string }>;
};

export default async function TuneBotPage({ params, searchParams }: Props) {
  const supabase = await createClient();
  const { slug } = await params;
  const search = await searchParams;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    notFound();
  }

  // Fetch bot
  const { data: bot, error } = await supabase
    .from("bot_bots")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (!bot || error) {
    notFound();
  }

  // Check membership
  const { data: membership } = await supabase
    .from("bot_team_members")
    .select("id")
    .eq("team_id", bot.team_id)
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: team } = await supabase
    .from("bot_teams")
    .select("owner_id")
    .eq("id", bot.team_id)
    .maybeSingle();

  const isTeamMember = !!membership || team?.owner_id === user.id;

  if (!isTeamMember) {
    notFound();
  }

  const showWelcome = search?.welcome === "1";

  return (
    <TuneBotClient
      bot={bot as Bot}
      showWelcome={showWelcome}
      isTeamMember={isTeamMember}
    />
  );
}
