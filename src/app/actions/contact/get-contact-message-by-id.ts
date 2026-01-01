// src/app/actions/contact/get-contact-message-by-id.ts
import { createClient } from "@/utils/supabase/client";

export async function getContactMessageById(id: string) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("bot_contact_messages")
    .select(
      "id, name, email, company, subject, message, inquiry_type, created_at, status"
    )
    .eq("id", id)
    .single();

  if (error) {
    console.error("Failed to fetch message:", error.message);
    return null;
  }

  return data;
}
