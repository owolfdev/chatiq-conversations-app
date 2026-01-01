// src/app/actions/contact/mark-contact-message-read.ts
"use server";

import { createClient } from "@/utils/supabase/server";

export async function markContactMessageRead(formData: FormData) {
  const id = formData.get("id") as string;
  const supabase = await createClient();

  const { error } = await supabase
    .from("bot_contact_messages")
    .update({ status: "read" })
    .eq("id", id);

  if (error) {
    console.error("Failed to mark message as read:", error.message);
    throw new Error("Failed to update message status");
  }

  return { success: true };
}
