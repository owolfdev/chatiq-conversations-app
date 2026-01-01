// src/app/actions/profile/get-user-stats.ts
"use server";

import { createClient } from "@/utils/supabase/server";

export async function getUserStats(userId: string) {
  const supabase = await createClient();

  const [{ count: chatbotCount }, { count: messageCount }] = await Promise.all([
    supabase
      .from("bot_bots")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId),
    supabase
      .from("bot_messages")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId),
  ]);

  // Extend when followers table exists
  return {
    chatbots: chatbotCount ?? 0,
    messages: messageCount ?? 0,
    followers: 0,
    following: 0,
  };
}
