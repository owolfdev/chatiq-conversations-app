// src/app/actions/bots/get-conversation-counts.ts
"use server";

import { createClient } from "@/utils/supabase/server";

export async function getConversationCounts(): Promise<Record<string, number>> {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user?.id) {
    console.error("No user session:", userError);
    return {};
  }

  const { data, error } = await supabase
    .from("bot_conversations")
    .select("bot_id, count:bot_id", { count: "exact", head: false })
    .eq("user_id", user.id);

  if (error) {
    console.error("Error getting conversation counts:", error);
    return {};
  }

  const map: Record<string, number> = {};
  for (const { bot_id } of data) {
    map[bot_id] = (map[bot_id] || 0) + 1;
  }

  return map;
}
