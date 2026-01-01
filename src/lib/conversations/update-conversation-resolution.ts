import type { SupabaseClient } from "@supabase/supabase-js";

export async function markConversationUnresolved({
  supabase,
  conversationId,
}: {
  supabase: SupabaseClient;
  conversationId: string;
}) {
  await supabase
    .from("bot_conversations")
    .update({ resolution_status: "unresolved" })
    .eq("id", conversationId)
    .eq("resolution_status", "resolved");
}
