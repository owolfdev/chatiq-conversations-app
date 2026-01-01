"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function deleteConversation(conversationId: string) {
  if (!conversationId) {
    throw new Error("Conversation ID is required");
  }

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("You must be signed in to delete conversations");
  }

  const { error } = await supabase
    .from("bot_conversations")
    .delete()
    .eq("id", conversationId);

  if (error) {
    console.error("Failed to delete conversation:", error);
    throw new Error(error.message || "Unable to delete conversation");
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/analytics");
  revalidatePath("/dashboard/conversations");
}


