// src/app/actions/bots/get-user-bots-with-counts.ts
"use server";

import { createClient } from "@/utils/supabase/server";
import type { Bot } from "@/types/bot";
import { getUserTeamId } from "@/lib/teams/get-user-team-id";

interface MessageWithBot {
  conversation_id: string;
  bot_conversations: {
    id: string;
    bot_id: string;
  };
}

type BotRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  is_public: boolean;
  created_at: string;
  user_id: string;
  status: string | null;
  system_prompt: string;
  team_id: string | null;
};

const BOT_SELECT_FIELDS =
  "id, name, slug, description, is_public, created_at, user_id, status, system_prompt, team_id, llm_enabled";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

async function hydrateBotCounts(
  supabase: SupabaseServerClient,
  bots: BotRow[]
): Promise<Bot[]> {
  if (!bots?.length) {
    return [];
  }

  const botIds = bots.map((bot) => bot.id);

  const [
    { data: directCounts },
    { data: linkCounts },
    { data: convoCounts },
    { data: messageCounts, error: msgErr },
  ] = await Promise.all([
    supabase
      .from("bot_documents")
      .select("bot_id, count:bot_id", { count: "exact", head: false })
      .in("bot_id", botIds),
    supabase
      .from("bot_document_links")
      .select("bot_id, count:bot_id", { count: "exact", head: false })
      .in("bot_id", botIds),
    supabase
      .from("bot_conversations")
      .select("bot_id, count:bot_id", { count: "exact", head: false })
      .in("bot_id", botIds),
    supabase
      .from("bot_messages")
      .select("conversation_id, bot_conversations(id, bot_id)"),
  ]);

  if (msgErr) {
    console.error("Error fetching message counts:", msgErr);
  }

  const directMap = new Map<string, number>();
  (directCounts ?? []).forEach(({ bot_id }) => {
    directMap.set(bot_id, (directMap.get(bot_id) || 0) + 1);
  });

  const linkMap = new Map<string, number>();
  (linkCounts ?? []).forEach(({ bot_id }) => {
    linkMap.set(bot_id, (linkMap.get(bot_id) || 0) + 1);
  });

  const convoMap = new Map<string, number>();
  (convoCounts ?? []).forEach(({ bot_id }) => {
    convoMap.set(bot_id, (convoMap.get(bot_id) || 0) + 1);
  });

  const messageMap = new Map<string, number>();
  (messageCounts as unknown as MessageWithBot[] | null)?.forEach((row) => {
    const botId = row.bot_conversations?.bot_id;
    if (botId) {
      messageMap.set(botId, (messageMap.get(botId) || 0) + 1);
    }
  });

  return bots.map((bot) => ({
    ...bot,
    status: (bot.status ?? "active") as Bot["status"],
    conversations: convoMap.get(bot.id) || 0,
    documents: (directMap.get(bot.id) || 0) + (linkMap.get(bot.id) || 0),
    messages: messageMap.get(bot.id) || 0,
  }));
}

export interface UserBotsWithCountsResult {
  team: {
    id: string | null;
    name: string | null;
    createdAt: string | null;
    trialEndsAt: string | null;
    bots: Bot[];
  };
  personal: {
    bots: Bot[];
  };
}

const EMPTY_RESULT: UserBotsWithCountsResult = {
  team: { id: null, name: null, createdAt: null, trialEndsAt: null, bots: [] },
  personal: { bots: [] },
};

export async function getUserBotsWithCounts(): Promise<UserBotsWithCountsResult> {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user?.id) {
    console.error("Error fetching user:", userError);
    return EMPTY_RESULT;
  }

  const teamId = await getUserTeamId(user.id);

  const [
    { data: teamBotsRaw, error: teamBotsError },
    { data: personalBotsRaw, error: personalBotsError },
  ] = await Promise.all([
    teamId
      ? supabase
          .from("bot_bots")
          .select(BOT_SELECT_FIELDS)
          .eq("team_id", teamId)
      : Promise.resolve({ data: [] as BotRow[], error: null }),
    supabase
      .from("bot_bots")
      .select(BOT_SELECT_FIELDS)
      .eq("user_id", user.id)
      .is("team_id", null),
  ]);

  if (teamBotsError) {
    console.error("Error fetching team bots:", teamBotsError);
  }

  if (personalBotsError) {
    console.error("Error fetching personal bots:", personalBotsError);
  }

  const [teamBots, personalBots] = await Promise.all([
    hydrateBotCounts(supabase, (teamBotsRaw as BotRow[]) ?? []),
    hydrateBotCounts(supabase, (personalBotsRaw as BotRow[]) ?? []),
  ]);

  let teamName: string | null = null;
  let teamCreatedAt: string | null = null;
  let teamTrialEndsAt: string | null = null;

  if (teamId) {
    const { data: teamRecord, error: teamError } = await supabase
      .from("bot_teams")
      .select("name, created_at, trial_ends_at")
      .eq("id", teamId)
      .maybeSingle();

    if (teamError) {
      console.error("Failed to load team metadata:", teamError);
    } else {
      teamName = teamRecord?.name ?? null;
      teamCreatedAt = teamRecord?.created_at ?? null;
      teamTrialEndsAt = teamRecord?.trial_ends_at ?? null;
    }
  }

  return {
    team: {
      id: teamId ?? null,
      name: teamName,
      createdAt: teamCreatedAt,
      trialEndsAt: teamTrialEndsAt,
      bots: teamBots,
    },
    personal: { bots: personalBots },
  };
}
