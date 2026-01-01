// src/app/actions/contact/delete-contact-message.ts
"use server";

import { createClient } from "@/utils/supabase/server";

export async function deleteContactMessage(id: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("bot_contact_messages")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Failed to delete contact message:", error.message);
    throw new Error("Failed to delete message");
  }

  return { success: true };
}
