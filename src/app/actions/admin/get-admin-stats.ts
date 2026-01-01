// src/app/actions/admin/get-admin-stats.ts
import { createAdminClient } from "@/utils/supabase/admin";

export async function getAdminStats() {
  // Use service role client to bypass RLS and return platform-wide counts
  const supabase = createAdminClient();

  const [
    { count: totalUsers },
    { count: totalBots },
    { count: totalConversations },
  ] = await Promise.all([
    supabase
      .from("bot_user_profiles")
      .select("id", { count: "exact", head: true }),
    supabase.from("bot_bots").select("id", { count: "exact", head: true }),
    supabase
      .from("bot_conversations")
      .select("id", { count: "exact", head: true }),
  ]);

  return {
    totalUsers: totalUsers ?? 0,
    totalBots: totalBots ?? 0,
    totalConversations: totalConversations ?? 0,
  };
}
