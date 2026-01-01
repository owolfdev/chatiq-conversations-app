// src/app/actions/conversations/delete-conversations.ts
"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function deleteConversations(conversationIds: string[]) {
  if (!conversationIds || conversationIds.length === 0) {
    throw new Error("At least one conversation ID is required");
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("You must be signed in to delete conversations");
  }

  const { error } = await supabase
    .from("bot_conversations")
    .delete()
    .in("id", conversationIds);

  if (error) {
    console.error("Failed to delete conversations:", error);
    throw new Error(error.message || "Unable to delete conversations");
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/analytics");
  revalidatePath("/dashboard/conversations");
}

