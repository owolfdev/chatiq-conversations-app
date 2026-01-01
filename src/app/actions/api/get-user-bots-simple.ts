"use server";

import { createClient } from "@/utils/supabase/server";

export interface SimpleBot {
  id: string;
  name: string;
  slug: string;
}

export async function getUserBotsSimple(): Promise<SimpleBot[]> {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user?.id) {
    return [];
  }

  const { data: bots, error: botError } = await supabase
    .from("bot_bots")
    .select("id, name, slug")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (botError || !bots) {
    return [];
  }

  return bots;
}

