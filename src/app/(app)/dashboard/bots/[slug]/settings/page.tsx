// src/app/dashboard/bots/[slug]/settings/page.tsx
import { createClient } from "@/utils/supabase/server";
import EditBotForm from "./edit-bot-form";
import { notFound } from "next/navigation";
import type { Bot } from "@/types/bot";
import { isFreeTierExpired } from "@/lib/plans/free-tier-expiry";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function SettingsBotPage({ params }: Props) {
  const supabase = await createClient();
  const { slug } = await params;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    notFound();
  }

  // Fetch bot with team membership check
  const { data: bot, error } = await supabase
    .from("bot_bots")
    .select("*")
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
    .eq("user_id", user.id)
    .maybeSingle();

  // Also check if user is the team owner
  const { data: team } = await supabase
    .from("bot_teams")
    .select("owner_id, plan, created_at, trial_ends_at")
    .eq("id", bot.team_id)
    .maybeSingle();

  const isTeamMember = !!membership || team?.owner_id === user.id;

  // Require team membership for access
  if (!isTeamMember) {
    notFound();
  }

  const freeTierExpired =
    team?.plan === "free" &&
    Boolean(team.created_at) &&
    isFreeTierExpired(team.created_at, team.trial_ends_at);

  return (
    <EditBotForm initialBot={bot as Bot} isFreeTierExpired={freeTierExpired} />
  );
}
