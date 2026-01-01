// src/app/actions/contact/delete-contact-messages.ts
"use server";

import { createClient } from "@/utils/supabase/server";

export async function deleteContactMessages(ids: string[]) {
  if (ids.length === 0) {
    return { success: false, error: "No message ids provided" };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("bot_contact_messages")
    .delete()
    .in("id", ids);

  if (error) {
    console.error("Failed to delete messages:", error.message);
    throw new Error("Failed to delete messages");
  }

  return { success: true, deleted: ids.length };
}
