// src/app/actions/contact/update-contact-message-status.ts
"use server";

import { createClient } from "@/utils/supabase/server";

export async function updateContactMessageStatus(
  id: string,
  status: "unread" | "read" | "replied" | "archived"
) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("bot_contact_messages")
    .update({ status })
    .eq("id", id);

  if (error) {
    console.error("Failed to update message status:", error.message);
    throw new Error("Failed to update message status");
  }

  return { success: true, status };
}
