// src/app/actions/bots/get-bot-by-slug.ts
"use server";

import { createClient } from "@/utils/supabase/server";
import type { Bot } from "@/types/bot";

export async function getBotBySlug(slug: string): Promise<Bot | null> {
  const supabase = await createClient();
  const { data: bot, error } = await supabase
    .from("bot_bots")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    console.error("Error fetching bot:", error);
    return null;
  }

  return bot;
}
